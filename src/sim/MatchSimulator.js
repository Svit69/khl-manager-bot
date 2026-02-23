import { poissonSample } from "./Poisson.js";

const REGULATION_SECONDS = 60 * 60;
const OT_SECONDS = 5 * 60;
const PERIOD_SECONDS = 20 * 60;
const PENALTY_MINUTES = 2;
const SHOT_BIN_SECONDS = 10;

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const sum = (items) => items.reduce((a, b) => a + b, 0);

export class MatchSimulator {
  simulateMatch(home, away) {
    const homeContext = this.#buildTeamContext(home);
    const awayContext = this.#buildTeamContext(away);

    const homePenalties = this.#buildPenaltyEvents(homeContext, false);
    const awayPenalties = this.#buildPenaltyEvents(awayContext, false);
    const penaltyWindows = {
      home: homePenalties.map((e) => ({ start: e.gameSecond, end: e.gameSecond + e.penaltyMinutes * 60 })),
      away: awayPenalties.map((e) => ({ start: e.gameSecond, end: e.gameSecond + e.penaltyMinutes * 60 }))
    };

    const baseHomeXg = this.#estimateExpectedGoals(homeContext, awayContext, true);
    const baseAwayXg = this.#estimateExpectedGoals(awayContext, homeContext, false);
    const homeXgReg = baseHomeXg + awayPenalties.length * 0.16;
    const awayXgReg = baseAwayXg + homePenalties.length * 0.16;

    let homeGoals = this.#buildGoalEvents(homeContext, awayContext, poissonSample(clamp(homeXgReg, 0.8, 6.8)), penaltyWindows.away, false);
    let awayGoals = this.#buildGoalEvents(awayContext, homeContext, poissonSample(clamp(awayXgReg, 0.8, 6.8)), penaltyWindows.home, false);

    let wentToOvertime = false;
    if (homeGoals.length === awayGoals.length) {
      wentToOvertime = true;
      const otResult = this.#simulateOvertime(homeContext, awayContext, homeGoals.length, awayGoals.length);
      if (otResult) {
        if (otResult.teamId === home.id) homeGoals = [...homeGoals, otResult.event];
        else awayGoals = [...awayGoals, otResult.event];
      }
    }

    const events = [...homePenalties, ...awayPenalties, ...homeGoals, ...awayGoals]
      .sort((a, b) => a.gameSecond - b.gameSecond || this.#eventPriority(a) - this.#eventPriority(b));

    const homeFinalGoals = homeGoals.length;
    const awayFinalGoals = awayGoals.length;
    const durationSeconds = wentToOvertime ? (REGULATION_SECONDS + OT_SECONDS) : REGULATION_SECONDS;

    return {
      home,
      away,
      homeGoals: homeFinalGoals,
      awayGoals: awayFinalGoals,
      events,
      summary: {
        durationSeconds,
        wentToOvertime,
        home: {
          shots: this.#estimateShots(homeFinalGoals, homeXgReg, wentToOvertime),
          penalties: homePenalties.length,
          iceTimeByLine: homeContext.iceTimeByLine
        },
        away: {
          shots: this.#estimateShots(awayFinalGoals, awayXgReg, wentToOvertime),
          penalties: awayPenalties.length,
          iceTimeByLine: awayContext.iceTimeByLine
        }
      }
    };
  }

  #buildTeamContext(team) {
    const lines = (team.lines || []).map((line, lineIndex) => {
      const players = (line.players || []).filter(Boolean);
      const skaters = players.filter((p) => p.identity?.primaryPosition !== "ВРТ");
      const forwards = skaters.filter((p) => ["ЛНП", "ЦТР", "ПНП"].includes(p.identity?.primaryPosition));
      const defenders = skaters.filter((p) => p.identity?.primaryPosition === "ЗАЩ");
      const fallback = skaters.length ? skaters : players;
      return {
        lineIndex,
        weight: Number(line.weight) || 0.75,
        players,
        skaters: fallback,
        forwards: forwards.length ? forwards : fallback,
        defenders: defenders.length ? defenders : fallback,
        offenseRating: this.#averageWeighted(fallback, (p) => {
          const a = p.attributes?.attributesJson || {};
          return (p.ovr * 0.45) + ((a.shot || 0) * 0.3) + ((a.skill || 0) * 0.2) + ((a.speed || 0) * 0.05);
        }),
        defenseRating: this.#averageWeighted(fallback, (p) => {
          const a = p.attributes?.attributesJson || {};
          return (p.ovr * 0.45) + ((a.defense || 0) * 0.35) + ((a.physical || 0) * 0.2);
        })
      };
    }).filter((line) => line.skaters.length > 0);

    const goalies = team.getRoster().filter((p) => p.identity?.primaryPosition === "ВРТ");
    const goalie = goalies.sort((a, b) => b.ovr - a.ovr)[0] || null;
    return { team, lines, goalie, iceTimeByLine: this.#buildIceTimeByLine(lines) };
  }

  #buildIceTimeByLine(lines) {
    if (!lines.length) return [];
    const jittered = lines.map((line) => Math.max(0.05, line.weight * (1 + rand(-0.08, 0.08))));
    const total = sum(jittered) || 1;
    return jittered.map((value, index) => ({
      lineIndex: lines[index].lineIndex,
      share: value / total,
      minutesApprox: Math.round((value / total) * 60 * 10) / 10
    }));
  }

  #estimateExpectedGoals(offense, defense, isHome) {
    const offenseStrength = offense.team.getStrength();
    const defenseStrength = defense.team.getStrength();
    const goalieImpact = defense.goalie ? (defense.goalie.ovr - 75) * 0.02 : 0;
    const homeBoost = isHome ? 0.12 : 0;
    return clamp(1.7 + homeBoost + (offenseStrength - defenseStrength) / 420 + (offenseStrength / 650) - goalieImpact, 0.8, 6.2);
  }

  #buildPenaltyEvents(teamContext, isOvertime) {
    const base = isOvertime ? 0.25 : 2.4;
    const penaltyCount = poissonSample(base + rand(-0.25, 0.55));
    const events = [];
    for (let i = 0; i < penaltyCount; i++) {
      const line = this.#pickLine(teamContext.lines, teamContext.iceTimeByLine);
      const player = this.#pickPenaltyPlayer(line?.skaters || []);
      if (!player) continue;
      const gameSecond = isOvertime ? (REGULATION_SECONDS + Math.floor(rand(0, OT_SECONDS))) : this.#randomRegulationSecond();
      events.push(this.#formatEvent({
        type: "penalty",
        gameSecond,
        team: teamContext.team,
        player,
        penaltyMinutes: PENALTY_MINUTES,
        description: `Удаление: ${player.name} (${PENALTY_MINUTES} мин)`
      }));
    }
    return events;
  }

  #buildGoalEvents(teamContext, opponentContext, goalsTarget, opponentPenaltyWindows, isOvertime) {
    const events = [];
    for (let i = 0; i < goalsTarget; i++) {
      const gameSecond = isOvertime
        ? (REGULATION_SECONDS + this.#pickWeightedSecond(OT_SECONDS, (sec) => this.#goalSecondWeight(teamContext, opponentContext, REGULATION_SECONDS + sec, opponentPenaltyWindows, true)))
        : this.#pickWeightedSecond(REGULATION_SECONDS, (sec) => this.#goalSecondWeight(teamContext, opponentContext, sec, opponentPenaltyWindows, false));
      const line = this.#pickScoringLine(teamContext.lines, teamContext.iceTimeByLine, opponentContext, isOvertime);
      const play = this.#pickScoringPlay(line, isOvertime);
      if (!play.scorer) continue;
      const isPowerPlay = this.#isPenaltyActiveAt(opponentPenaltyWindows, gameSecond);
      events.push(this.#formatEvent({
        type: "goal",
        gameSecond,
        team: teamContext.team,
        scorer: play.scorer,
        assists: play.assists.map((p) => p.name),
        assist: play.assists[0]?.name || null,
        strength: isOvertime ? "OT" : (isPowerPlay ? "PP" : "EV"),
        isOvertime,
        description: play.assists.length ? `Гол: ${play.scorer.name} (${play.assists.map((p) => p.name).join(", ")})` : `Гол: ${play.scorer.name}`
      }));
    }
    return events;
  }

  #simulateOvertime(homeContext, awayContext, homeGoals, awayGoals) {
    const homePressure = this.#overtimeAttackRating(homeContext);
    const awayPressure = this.#overtimeAttackRating(awayContext);
    const totalPressure = Math.max(1, homePressure + awayPressure);
    const goalChance = clamp(0.8 + (homePressure + awayPressure - 150) / 300, 0.72, 0.96);
    const hasOtGoal = Math.random() < goalChance;
    const winnerIsHome = Math.random() < (homePressure / totalPressure);
    const scoringContext = winnerIsHome ? homeContext : awayContext;
    const defendingContext = winnerIsHome ? awayContext : homeContext;

    if (!hasOtGoal) {
      // Fallback to a decisive late OT goal to avoid unresolved ties in current standings logic.
      return { teamId: scoringContext.team.id, event: this.#buildGoalEvents(scoringContext, defendingContext, 1, [], true)[0] };
    }
    return { teamId: scoringContext.team.id, event: this.#buildGoalEvents(scoringContext, defendingContext, 1, [], true)[0] };
  }

  #overtimeAttackRating(teamContext) {
    const bestSkaters = teamContext.team.getRoster()
      .filter((p) => p.identity?.primaryPosition !== "ВРТ")
      .sort((a, b) => {
        const aa = a.attributes?.attributesJson || {};
        const ab = b.attributes?.attributesJson || {};
        const sa = a.ovr + (aa.skill || 0) * 0.35 + (aa.speed || 0) * 0.35 + (aa.shot || 0) * 0.25;
        const sb = b.ovr + (ab.skill || 0) * 0.35 + (ab.speed || 0) * 0.35 + (ab.shot || 0) * 0.25;
        return sb - sa;
      })
      .slice(0, 4);
    return this.#averageWeighted(bestSkaters, (p) => p.ovr) + this.#averageWeighted(bestSkaters, (p) => {
      const a = p.attributes?.attributesJson || {};
      return ((a.skill || 0) + (a.speed || 0) + (a.shot || 0)) / 3;
    });
  }

  #goalSecondWeight(teamContext, opponentContext, gameSecond, opponentPenaltyWindows, isOvertime) {
    const sharesByLineIndex = new Map((teamContext.iceTimeByLine || []).map((x) => [x.lineIndex, x.share]));
    const avgShare = teamContext.lines.length ? sum(teamContext.lines.map((l) => sharesByLineIndex.get(l.lineIndex) || l.weight || 0.5)) / teamContext.lines.length : 0.25;
    const matchup = clamp((this.#averageLineOffense(teamContext.lines) - this.#averageLineDefense(opponentContext.lines)) / 120, -0.12, 0.22);
    const ppBoost = this.#isPenaltyActiveAt(opponentPenaltyWindows, gameSecond) ? 1.9 : 1;
    const periodBias = isOvertime ? 1.2 : this.#regulationPeriodBias(gameSecond);
    return Math.max(0.05, (avgShare || 0.25) * (1 + matchup) * ppBoost * periodBias);
  }

  #regulationPeriodBias(gameSecond) {
    const sec = Math.max(0, Math.min(REGULATION_SECONDS - 1, gameSecond));
    const period = Math.floor(sec / PERIOD_SECONDS) + 1;
    if (period === 1) return rand(0.9, 1.05);
    if (period === 2) return rand(0.95, 1.1);
    return rand(0.95, 1.18);
  }

  #isPenaltyActiveAt(windows, second) {
    return (windows || []).some((w) => second >= w.start && second < w.end);
  }

  #averageLineOffense(lines) {
    if (!lines?.length) return 70;
    return sum(lines.map((line) => line.offenseRating || 70)) / lines.length;
  }

  #averageLineDefense(lines) {
    if (!lines?.length) return 70;
    return sum(lines.map((line) => line.defenseRating || 70)) / lines.length;
  }

  #pickScoringLine(lines, iceTimeByLine, opponentContext, isOvertime) {
    const sharesByLineIndex = new Map((iceTimeByLine || []).map((item) => [item.lineIndex, item.share]));
    const weights = lines.map((line) => {
      const usageShare = sharesByLineIndex.get(line.lineIndex) || 0.1;
      const matchupFactor = clamp((line.offenseRating - this.#averageLineDefense(opponentContext.lines)) / 60, -0.15, 0.25);
      const otBoost = isOvertime && line.lineIndex <= 1 ? 1.25 : 1;
      return Math.max(0.05, usageShare * (1 + matchupFactor) * otBoost);
    });
    return this.#pickWeighted(lines, weights);
  }

  #pickPenaltyPlayer(players) {
    if (!players.length) return null;
    const weights = players.map((player) => {
      const attrs = player.attributes?.attributesJson || {};
      const risk = 1 + ((attrs.physical || 65) - 70) * 0.02 + ((attrs.defense || 65) - 70) * 0.01;
      return clamp(risk, 0.4, 2.0);
    });
    return this.#pickWeighted(players, weights);
  }

  #pickScoringPlay(line, isOvertime) {
    const skaters = line?.skaters || [];
    const scorer = this.#pickWeighted(skaters, skaters.map((player) => {
      const attrs = player.attributes?.attributesJson || {};
      const otFactor = isOvertime ? ((attrs.speed || 60) * 0.12 + (attrs.skill || 60) * 0.08) : 0;
      return Math.max(0.1, (attrs.shot || 60) * 0.55 + (attrs.skill || 60) * 0.2 + (attrs.speed || 60) * 0.05 + player.ovr * 0.2 + otFactor);
    }));
    if (!scorer) return { scorer: null, assists: [] };

    const assistPool = skaters.filter((p) => p.id !== scorer.id);
    const firstAssist = this.#pickWeighted(assistPool, assistPool.map((player) => {
      const attrs = player.attributes?.attributesJson || {};
      return Math.max(0.1, (attrs.skill || 60) * 0.45 + (attrs.defense || 60) * 0.10 + player.ovr * 0.45);
    }));
    const secondAssistChance = isOvertime ? 0.38 : 0.58;
    let secondAssist = null;
    if (Math.random() < secondAssistChance) {
      const secondPool = assistPool.filter((p) => p.id !== firstAssist?.id);
      secondAssist = this.#pickWeighted(secondPool, secondPool.map((player) => {
        const attrs = player.attributes?.attributesJson || {};
        return Math.max(0.1, (attrs.skill || 60) * 0.5 + player.ovr * 0.5);
      }));
    }
    return { scorer, assists: [firstAssist, secondAssist].filter(Boolean) };
  }

  #estimateShots(goals, xg, wentToOvertime) {
    const otBonus = wentToOvertime ? rand(1, 4) : 0;
    return Math.max(goals + 8, Math.round((xg * 8.8) + rand(0, 6) + otBonus));
  }

  #formatEvent(data) {
    const gameSecond = Math.max(0, Math.floor(data.gameSecond));
    const inOt = gameSecond >= REGULATION_SECONDS;
    const period = inOt ? 4 : (Math.floor(gameSecond / PERIOD_SECONDS) + 1);
    const periodSecond = inOt ? (gameSecond - REGULATION_SECONDS) : (gameSecond % PERIOD_SECONDS);
    const periodLength = inOt ? OT_SECONDS : PERIOD_SECONDS;
    const minuteAbsolute = Math.floor(gameSecond / 60) + 1;
    const secondInMinute = periodSecond % 60;
    const down = Math.max(0, periodLength - periodSecond);
    const mm = String(Math.floor(down / 60)).padStart(2, "0");
    const ss = String(down % 60).padStart(2, "0");
    return {
      ...data,
      gameSecond,
      period,
      minute: minuteAbsolute,
      second: secondInMinute,
      periodClock: `${mm}:${ss}`,
      teamId: data.team?.id || data.teamId || null,
      team: data.team?.name || data.team || ""
    };
  }

  #randomRegulationSecond() {
    return Math.floor(Math.random() * REGULATION_SECONDS);
  }

  #eventPriority(event) {
    if (event.type === "penalty") return 0;
    if (event.type === "goal") return 1;
    return 2;
  }

  #averageWeighted(players, extractor) {
    if (!players?.length) return 0;
    return sum(players.map((p) => extractor(p))) / players.length;
  }

  #pickLine(lines, iceTimeByLine) {
    const shares = new Map((iceTimeByLine || []).map((x) => [x.lineIndex, x.share]));
    const weights = (lines || []).map((line) => Math.max(0.05, shares.get(line.lineIndex) || line.weight || 0.5));
    return this.#pickWeighted(lines, weights);
  }

  #pickWeightedSecond(durationSeconds, weightFn) {
    const binCount = Math.max(1, Math.ceil(durationSeconds / SHOT_BIN_SECONDS));
    const bins = Array.from({ length: binCount }, (_, i) => i);
    const weights = bins.map((idx) => {
      const sec = idx * SHOT_BIN_SECONDS + rand(0, SHOT_BIN_SECONDS - 1);
      return Math.max(0.01, weightFn(sec));
    });
    const pickedBin = this.#pickWeighted(bins, weights) ?? 0;
    const base = pickedBin * SHOT_BIN_SECONDS;
    return Math.min(durationSeconds - 1, base + Math.floor(rand(0, SHOT_BIN_SECONDS)));
  }

  #pickWeighted(items, weights) {
    if (!items?.length) return null;
    const safe = (weights || []).map((w) => Math.max(0, Number(w) || 0));
    const total = sum(safe);
    if (total <= 0) return items[Math.floor(Math.random() * items.length)] || null;
    let roll = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= safe[i] || 0;
      if (roll <= 0) return items[i];
    }
    return items[items.length - 1] || null;
  }
}
