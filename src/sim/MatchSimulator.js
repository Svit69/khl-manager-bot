import { poissonSample } from "./Poisson.js";

const GAME_SECONDS = 60 * 60;
const PERIOD_SECONDS = 20 * 60;
const PENALTY_MINUTES = 2;

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const sum = (items) => items.reduce((a, b) => a + b, 0);

export class MatchSimulator {
  simulateMatch(home, away) {
    const homeContext = this.#buildTeamContext(home);
    const awayContext = this.#buildTeamContext(away);

    const homeXg = this.#estimateExpectedGoals(homeContext, awayContext, true);
    const awayXg = this.#estimateExpectedGoals(awayContext, homeContext, false);
    const homeGoalsTarget = poissonSample(homeXg);
    const awayGoalsTarget = poissonSample(awayXg);

    const homePenalties = this.#buildPenaltyEvents(homeContext, awayContext, homeGoalsTarget, awayGoalsTarget);
    const awayPenalties = this.#buildPenaltyEvents(awayContext, homeContext, awayGoalsTarget, homeGoalsTarget);
    const homeGoals = this.#buildGoalEvents(homeContext, awayContext, homeGoalsTarget);
    const awayGoals = this.#buildGoalEvents(awayContext, homeContext, awayGoalsTarget);

    const events = [...homePenalties, ...awayPenalties, ...homeGoals, ...awayGoals]
      .sort((a, b) => a.gameSecond - b.gameSecond || this.#eventPriority(a) - this.#eventPriority(b));

    return {
      home,
      away,
      homeGoals: homeGoals.length,
      awayGoals: awayGoals.length,
      events,
      summary: {
        durationSeconds: GAME_SECONDS,
        home: {
          shots: this.#estimateShots(homeGoals.length, homeXg),
          penalties: homePenalties.length,
          iceTimeByLine: homeContext.iceTimeByLine
        },
        away: {
          shots: this.#estimateShots(awayGoals.length, awayXg),
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
      const offenseRating = this.#averageWeighted(fallback, (p) => {
        const attrs = p.attributes?.attributesJson || {};
        return (p.ovr * 0.45) + ((attrs.shot || 0) * 0.30) + ((attrs.skill || 0) * 0.20) + ((attrs.speed || 0) * 0.05);
      });
      const defenseRating = this.#averageWeighted(fallback, (p) => {
        const attrs = p.attributes?.attributesJson || {};
        return (p.ovr * 0.45) + ((attrs.defense || 0) * 0.35) + ((attrs.physical || 0) * 0.20);
      });
      return {
        lineIndex,
        weight: Number(line.weight) || 0.75,
        players,
        skaters: fallback,
        forwards: forwards.length ? forwards : fallback,
        defenders: defenders.length ? defenders : fallback,
        offenseRating,
        defenseRating
      };
    }).filter((line) => line.skaters.length > 0);

    const goalies = team.getRoster().filter((p) => p.identity?.primaryPosition === "ВРТ");
    const goalie = goalies.sort((a, b) => b.ovr - a.ovr)[0] || null;

    const iceTimeByLine = this.#buildIceTimeByLine(lines);
    return { team, lines, goalie, iceTimeByLine };
  }

  #buildIceTimeByLine(lines) {
    if (!lines.length) return [];
    const jittered = lines.map((line) => {
      const base = line.weight;
      const jitter = 1 + rand(-0.08, 0.08);
      return Math.max(0.05, base * jitter);
    });
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
    const raw = 1.7 + homeBoost + (offenseStrength - defenseStrength) / 420 + (offenseStrength / 650) - goalieImpact;
    return clamp(raw, 0.8, 6.2);
  }

  #buildPenaltyEvents(teamContext) {
    const penaltyCount = poissonSample(2.4 + rand(-0.3, 0.6));
    const events = [];
    for (let i = 0; i < penaltyCount; i++) {
      const line = this.#pickLine(teamContext.lines, teamContext.iceTimeByLine);
      if (!line) continue;
      const player = this.#pickPenaltyPlayer(line.skaters);
      if (!player) continue;
      const gameSecond = this.#randomGameSecond();
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

  #buildGoalEvents(teamContext, opponentContext, goalsTarget) {
    const events = [];
    for (let i = 0; i < goalsTarget; i++) {
      const line = this.#pickScoringLine(teamContext.lines, teamContext.iceTimeByLine, opponentContext);
      if (!line) continue;
      const scoringPlay = this.#pickScoringPlay(line);
      if (!scoringPlay.scorer) continue;
      const gameSecond = this.#randomGameSecond();
      const assists = scoringPlay.assists.map((player) => player.name);
      events.push(this.#formatEvent({
        type: "goal",
        gameSecond,
        team: teamContext.team,
        scorer: scoringPlay.scorer,
        assists,
        assist: assists[0] || null,
        description: assists.length ? `Гол: ${scoringPlay.scorer.name} (${assists.join(", ")})` : `Гол: ${scoringPlay.scorer.name}`
      }));
    }
    return events;
  }

  #pickScoringLine(lines, iceTimeByLine, opponentContext) {
    const sharesByLineIndex = new Map((iceTimeByLine || []).map((item) => [item.lineIndex, item.share]));
    const weights = lines.map((line) => {
      const usageShare = sharesByLineIndex.get(line.lineIndex) || 0.1;
      const matchupFactor = clamp((line.offenseRating - this.#averageLineDefense(opponentContext.lines)) / 60, -0.15, 0.25);
      return Math.max(0.05, usageShare * (1 + matchupFactor));
    });
    return this.#pickWeighted(lines, weights);
  }

  #averageLineDefense(lines) {
    if (!lines?.length) return 70;
    return sum(lines.map((line) => line.defenseRating || 70)) / lines.length;
  }

  #pickPenaltyPlayer(players) {
    if (!players?.length) return null;
    const weights = players.map((player) => {
      const attrs = player.attributes?.attributesJson || {};
      const disciplineRisk = 1 + ((attrs.physical || 65) - 70) * 0.02 + ((attrs.defense || 65) - 70) * 0.01;
      return clamp(disciplineRisk, 0.4, 2.0);
    });
    return this.#pickWeighted(players, weights);
  }

  #pickScoringPlay(line) {
    const skaters = line.skaters || [];
    const scorer = this.#pickWeighted(skaters, skaters.map((player) => {
      const attrs = player.attributes?.attributesJson || {};
      return Math.max(0.1, (attrs.shot || 60) * 0.55 + (attrs.skill || 60) * 0.20 + (attrs.speed || 60) * 0.05 + player.ovr * 0.20);
    }));
    if (!scorer) return { scorer: null, assists: [] };

    const assistPool = skaters.filter((player) => player.id !== scorer.id);
    const firstAssist = this.#pickWeighted(assistPool, assistPool.map((player) => {
      const attrs = player.attributes?.attributesJson || {};
      return Math.max(0.1, (attrs.skill || 60) * 0.45 + (attrs.defense || 60) * 0.10 + player.ovr * 0.45);
    }));
    const secondAssistChance = 0.58;
    let secondAssist = null;
    if (Math.random() < secondAssistChance) {
      const secondPool = assistPool.filter((player) => player.id !== firstAssist?.id);
      secondAssist = this.#pickWeighted(secondPool, secondPool.map((player) => {
        const attrs = player.attributes?.attributesJson || {};
        return Math.max(0.1, (attrs.skill || 60) * 0.50 + player.ovr * 0.50);
      }));
    }
    return { scorer, assists: [firstAssist, secondAssist].filter(Boolean) };
  }

  #estimateShots(goals, xg) {
    return Math.max(goals + 8, Math.round((xg * 8.8) + rand(0, 6)));
  }

  #formatEvent(data) {
    const gameSecond = clamp(Math.floor(data.gameSecond), 0, GAME_SECONDS - 1);
    const period = Math.floor(gameSecond / PERIOD_SECONDS) + 1;
    const periodSecond = gameSecond % PERIOD_SECONDS;
    const minuteAbsolute = Math.floor(gameSecond / 60) + 1;
    const minuteInPeriod = Math.floor(periodSecond / 60);
    const secondInMinute = periodSecond % 60;
    const clockDown = PERIOD_SECONDS - periodSecond;
    const clockMinutes = Math.floor(clockDown / 60).toString().padStart(2, "0");
    const clockSeconds = (clockDown % 60).toString().padStart(2, "0");
    return {
      ...data,
      gameSecond,
      period,
      minute: minuteAbsolute,
      second: secondInMinute,
      periodClock: `${clockMinutes}:${clockSeconds}`,
      teamId: data.team?.id || data.teamId || null,
      team: data.team?.name || data.team || ""
    };
  }

  #randomGameSecond() {
    const period = Math.floor(Math.random() * 3);
    const periodBias = rand(0, PERIOD_SECONDS);
    return period * PERIOD_SECONDS + periodBias;
  }

  #eventPriority(event) {
    return event.type === "penalty" ? 0 : 1;
  }

  #averageWeighted(players, extractor) {
    if (!players?.length) return 0;
    return sum(players.map((player) => extractor(player))) / players.length;
  }

  #pickLine(lines, iceTimeByLine) {
    const sharesByLineIndex = new Map((iceTimeByLine || []).map((item) => [item.lineIndex, item.share]));
    const weights = (lines || []).map((line) => Math.max(0.05, sharesByLineIndex.get(line.lineIndex) || line.weight || 0.5));
    return this.#pickWeighted(lines, weights);
  }

  #pickWeighted(items, weights) {
    if (!items?.length) return null;
    const safeWeights = (weights || []).map((weight) => Math.max(0, Number(weight) || 0));
    const total = sum(safeWeights);
    if (total <= 0) return items[Math.floor(Math.random() * items.length)] || null;
    let roll = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= safeWeights[i] || 0;
      if (roll <= 0) return items[i];
    }
    return items[items.length - 1] || null;
  }
}
