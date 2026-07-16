import { formatCalendarDate } from "../contracts/SeasonUtils.js";
import { getTeamConference } from "../data/teamConferences.js";

const REGULAR_MATCH_ID = (roundIndex, matchIndex) => `regular-round-${roundIndex + 1}-match-${matchIndex + 1}`;
const PLAYOFF_SERIES_ID = (roundIndex, seriesIndex) => `playoff-round-${roundIndex + 1}-series-${seriesIndex + 1}`;
const PLAYOFF_MATCH_ID = (roundIndex, seriesIndex, gameNumber) => `playoff-round-${roundIndex + 1}-series-${seriesIndex + 1}-game-${gameNumber}`;
const PLAYOFF_HOME_PATTERN = ["higher", "higher", "lower", "lower", "higher", "lower", "higher"];
const DAY_MS = 24 * 60 * 60 * 1000;

const createUtcDate = (year, monthIndex, day) => new Date(Date.UTC(year, monthIndex, day));
const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);
const diffDays = (left, right) => Math.round((right.getTime() - left.getTime()) / DAY_MS);
const toIsoDate = (date) => {
  const safeDate = date instanceof Date ? date : new Date(date);
  return Number.isNaN(safeDate.getTime()) ? "" : safeDate.toISOString().slice(0, 10);
};
const toDateSnapshot = (date) => ({
  dateIso: toIsoDate(date),
  dateLabel: formatCalendarDate(date),
  shortDateLabel: formatCalendarDate(date, { day: "numeric", month: "short" }),
});
const createCalendarDay = (day, date, payload = {}) => ({
  day,
  ...toDateSnapshot(date),
  ...payload,
});

const toResultSnapshot = (matchResult) => ({
  homeGoals: Number(matchResult?.homeGoals) || 0,
  awayGoals: Number(matchResult?.awayGoals) || 0,
  wentToOvertime: Boolean(matchResult?.summary?.wentToOvertime),
});

const buildRoundRobinPairings = (teams) => {
  const rotation = [...teams];
  const hasBye = rotation.length % 2 === 1;
  if (hasBye) rotation.push(null);

  const rounds = [];
  const halfSize = rotation.length / 2;
  for (let roundIndex = 0; roundIndex < rotation.length - 1; roundIndex++) {
    const matches = [];
    for (let slotIndex = 0; slotIndex < halfSize; slotIndex++) {
      const left = rotation[slotIndex];
      const right = rotation[rotation.length - 1 - slotIndex];
      if (!left || !right) continue;
      const shouldFlipHome = roundIndex % 2 === 1;
      const home = shouldFlipHome ? right : left;
      const away = shouldFlipHome ? left : right;
      matches.push({ home, away });
    }
    rounds.push(matches);

    const fixed = rotation[0];
    const moving = rotation.slice(1);
    moving.unshift(moving.pop());
    rotation.splice(0, rotation.length, fixed, ...moving);
  }
  return rounds;
};

const groupMatchesByDay = (matches) => {
  const byDay = new Map();
  matches.forEach((match) => {
    if (!byDay.has(match.day)) {
      byDay.set(match.day, createCalendarDay(match.day, match.dateIso, {
        phase: "playoffs",
        stageLabel: match.roundName,
        roundIndex: match.roundIndex,
        matches: [],
      }));
    }
    byDay.get(match.day).matches.push(match);
  });
  return [...byDay.values()].sort((left, right) => left.day - right.day);
};

const getPlayoffTeamCount = (teamCount) => {
  if (teamCount >= 16) return 16;
  if (teamCount >= 8) return 8;
  const fallback = 2 ** Math.floor(Math.log2(Math.max(2, teamCount)));
  return Math.max(2, fallback);
};

export class SeasonCalendar {
  #teamsById;
  #days;
  #regularSeasonDaysCount;
  #index = 0;
  #playoffs;
  #seasonStartYear;
  #regularSeasonStartDate;
  #playoffStartDate;
  #nextPlayoffDate;
  #conferencesEnabled = true;

  constructor(teams, seasonStartYear = 2025) {
    this.#teamsById = new Map((teams || []).map((team) => [team.id, team]));
    this.#seasonStartYear = Number(seasonStartYear) || 2025;
    this.#regularSeasonStartDate = createUtcDate(this.#seasonStartYear, 8, 1);
    this.#playoffStartDate = createUtcDate(this.#seasonStartYear + 1, 2, 23);
    this.#nextPlayoffDate = this.#playoffStartDate;
    this.#days = this.#buildRegularSeason(teams);
    this.#regularSeasonDaysCount = this.#days.length;
    this.#playoffs = this.#createEmptyPlayoffState();
  }

  get index() { return this.#index; }
  set index(value) {
    this.#index = Math.max(0, Math.min(this.#days.length, Number(value) || 0));
  }

  get currentDay() {
    return Math.min(this.#index + 1, Math.max(1, this.#days.length));
  }

  get currentDate() {
    return this.#resolveDateForIndex(this.#index)?.dateIso || toIsoDate(this.#regularSeasonStartDate);
  }

  get currentDateLabel() {
    return this.#resolveDateForIndex(this.#index)?.dateLabel || formatCalendarDate(this.#regularSeasonStartDate);
  }

  get seasonStartYear() {
    return this.#seasonStartYear;
  }

  get seasonLabel() {
    return `${this.#seasonStartYear}/${this.#seasonStartYear + 1}`;
  }

  get regularSeasonStartDate() {
    return toIsoDate(this.#regularSeasonStartDate);
  }

  get playoffStartDate() {
    return toIsoDate(this.#playoffStartDate);
  }

  setConferencesEnabled(enabled) {
    this.#conferencesEnabled = enabled !== false;
  }

  getCurrent() {
    return this.#days[this.#index] || null;
  }

  getCurrentForTeam(teamId) {
    if (!teamId) return this.getCurrent();
    for (let index = this.#index; index < this.#days.length; index++) {
      const day = this.#days[index];
      if (day.matches.length === 0) return day;
      if (day.matches.some((match) => match.home?.id === teamId || match.away?.id === teamId)) {
        return day;
      }
    }
    return this.getCurrent();
  }

  getScheduleRows(activeTeamId = null) {
    return this.#days.map((day, index) => {
      const myMatch = activeTeamId
        ? day.matches.find((match) => match.home?.id === activeTeamId || match.away?.id === activeTeamId) || null
        : null;
      const playedMatches = day.matches.filter((match) => Boolean(match.result)).length;
      const previewMatches = day.matches.slice(0, 2).map((match) => ({
        id: match.id,
        home: { id: match.home.id, name: match.home.name, shortName: match.home.shortName },
        away: { id: match.away.id, name: match.away.name, shortName: match.away.shortName },
        result: match.result ? { ...match.result } : null,
      }));
      return {
        day: day.day,
        dateIso: day.dateIso,
        dateLabel: day.dateLabel,
        shortDateLabel: day.shortDateLabel,
        phase: day.phase || "regular",
        stageLabel: day.stageLabel || "",
        isPlayed: day.matches.length > 0 && playedMatches === day.matches.length,
        isCurrent: index === this.#index,
        isMyMatch: Boolean(myMatch),
        isRestDay: day.matches.length === 0,
        matchCount: day.matches.length,
        playedMatchCount: playedMatches,
        matches: previewMatches,
        myMatch: myMatch ? {
          id: myMatch.id,
          home: { id: myMatch.home.id, name: myMatch.home.name, shortName: myMatch.home.shortName },
          away: { id: myMatch.away.id, name: myMatch.away.name, shortName: myMatch.away.shortName },
          result: myMatch.result ? { ...myMatch.result } : null,
        } : null,
      };
    });
  }

  getPlayoffBracketData() {
    if (!this.#playoffs.active) {
      return {
        active: false,
        status: "not-started",
        rounds: [],
        champion: null,
      };
    }

    return {
      active: true,
      status: this.#playoffs.status,
      participantCount: this.#playoffs.participantCount,
      champion: this.#playoffs.championTeamId ? this.#teamsById.get(this.#playoffs.championTeamId) || null : null,
      rounds: this.#playoffs.rounds.map((round, roundIndex) => ({
        name: round.name,
        isCurrent: roundIndex === this.#playoffs.currentRoundIndex && this.#playoffs.status !== "complete",
        series: round.series.map((series) => ({
          id: series.id,
          higherSeed: {
            seed: series.higherSeed.seed,
            team: series.higherSeed.team,
            wins: series.higherSeed.wins,
          },
          lowerSeed: {
            seed: series.lowerSeed.seed,
            team: series.lowerSeed.team,
            wins: series.lowerSeed.wins,
          },
          winnerTeamId: series.winnerTeamId,
        })),
      })),
    };
  }

  ensurePlayoffs(standingsTable) {
    if (!this.#playoffs.active && this.#index >= this.#regularSeasonDaysCount) {
      return this.#startPlayoffs(standingsTable);
    }
    return false;
  }

  advanceDay() {
    if (this.#index < this.#days.length) this.#index += 1;
    this.#ensurePlayoffSchedule();
  }

  recordResult(dayNumber, matchId, matchResult) {
    const day = this.#days.find((entry) => entry.day === dayNumber);
    if (!day || !matchId || !matchResult) return;
    const match = day.matches.find((entry) => entry.id === matchId);
    if (!match || match.result) return;

    match.result = toResultSnapshot(matchResult);
    if (match.phase === "playoffs") {
      this.#applyPlayoffResult(match);
    }
  }

  exportState() {
    return {
      index: this.#index,
      seasonStartYear: this.#seasonStartYear,
      regularResults: this.#days
        .slice(0, this.#regularSeasonDaysCount)
        .flatMap((day) => day.matches.filter((match) => match.result).map((match) => ({
          day: day.day,
          matchId: match.id,
          ...match.result,
        }))),
      playoffs: this.#serializePlayoffs(),
    };
  }

  importState(payload) {
    const nextSeasonStartYear = Number(payload?.seasonStartYear) || this.#seasonStartYear;
    if (nextSeasonStartYear !== this.#seasonStartYear) {
      this.resetForNextSeason(nextSeasonStartYear);
    }
    this.#days = this.#days.slice(0, this.#regularSeasonDaysCount);
    this.#playoffs = this.#createEmptyPlayoffState();
    this.#nextPlayoffDate = this.#playoffStartDate;
    this.#index = Math.max(0, Math.min(this.#days.length, Number(payload?.index) || 0));
    this.#importRegularResults(payload?.regularResults || []);
    if (payload?.playoffs?.active) {
      this.#importPlayoffs(payload.playoffs);
    }
    this.#index = Math.max(0, Math.min(this.#days.length, Number(payload?.index) || 0));
  }

  exportResults() {
    return this.exportState();
  }

  importResults(payload) {
    this.importState(payload);
  }

  isFinished() {
    return this.#index >= this.#days.length && (!this.#playoffs.active || this.#playoffs.status === "complete");
  }

  resetForNextSeason(seasonStartYear = this.#seasonStartYear + 1) {
    this.#seasonStartYear = Number(seasonStartYear) || (this.#seasonStartYear + 1);
    this.#regularSeasonStartDate = createUtcDate(this.#seasonStartYear, 8, 1);
    this.#playoffStartDate = createUtcDate(this.#seasonStartYear + 1, 2, 23);
    this.#nextPlayoffDate = this.#playoffStartDate;
    this.#days = this.#buildRegularSeason([...this.#teamsById.values()]);
    this.#regularSeasonDaysCount = this.#days.length;
    this.#playoffs = this.#createEmptyPlayoffState();
    this.#index = 0;
  }

  #resolveDateForIndex(index) {
    if (!this.#days.length) return null;
    const safeIndex = Math.max(0, Math.min(this.#days.length - 1, Number(index) || 0));
    return this.#days[safeIndex];
  }

  #buildRegularSeason(teams) {
    const firstLeg = buildRoundRobinPairings(teams);
    const secondLeg = firstLeg.map((round) => round.map((match) => ({
      home: match.away,
      away: match.home,
    })));
    const rounds = [...firstLeg, ...secondLeg];
    const regularSeasonEndDate = addDays(this.#playoffStartDate, -1);
    const totalSpanDays = Math.max(0, diffDays(this.#regularSeasonStartDate, regularSeasonEndDate));

    return rounds.map((round, roundIndex) => {
      const offset = rounds.length <= 1 ? 0 : Math.floor((totalSpanDays * roundIndex) / Math.max(1, rounds.length - 1));
      const roundDate = addDays(this.#regularSeasonStartDate, offset);
      return createCalendarDay(roundIndex + 1, roundDate, {
        phase: "regular",
        stageLabel: "Регулярный сезон",
        matches: round.map((match, matchIndex) => ({
          id: REGULAR_MATCH_ID(roundIndex, matchIndex),
          home: match.home,
          away: match.away,
          result: null,
          phase: "regular",
          dateIso: toIsoDate(roundDate),
        })),
      });
    });
  }

  #createEmptyPlayoffState() {
    return {
      active: false,
      status: "not-started",
      participantCount: 0,
      currentRoundIndex: -1,
      rounds: [],
      championTeamId: null,
    };
  }

  #startPlayoffs(standingsTable) {
    const orderedTeams = (standingsTable || []).map((row, index) => ({
      seed: index + 1,
      regularSeasonRank: index + 1,
      regularSeasonPoints: Number(row.pts) || 0,
      team: this.#teamsById.get(row.teamId),
    })).filter((entry) => entry.team);
    const seededTeams = this.#conferencesEnabled
      ? this.#selectConferencePlayoffTeams(orderedTeams)
      : orderedTeams.slice(0, Math.min(getPlayoffTeamCount(orderedTeams.length), orderedTeams.length));
    const participantCount = seededTeams.length;
    if (participantCount < 2) return false;

    this.#playoffs = {
      active: true,
      status: "active",
      participantCount,
      currentRoundIndex: 0,
      rounds: [this.#createFirstPlayoffRound(seededTeams, participantCount)],
      championTeamId: null,
    };
    this.#nextPlayoffDate = this.#playoffStartDate;
    this.#ensurePlayoffSchedule();
    return true;
  }

  #selectConferencePlayoffTeams(orderedTeams) {
    const groups = { east: [], west: [] };
    orderedTeams.forEach((entry) => {
      const conference = getTeamConference(entry.team);
      const group = groups[conference] || groups.west;
      group.push({ ...entry, conference, seed: group.length + 1 });
    });
    const participants = [...groups.east.slice(0, 8), ...groups.west.slice(0, 8)];
    return participants.length >= 2 ? participants : orderedTeams.slice(0, Math.min(getPlayoffTeamCount(orderedTeams.length), orderedTeams.length));
  }

  #createFirstPlayoffRound(seededTeams, participantCount) {
    if (!this.#conferencesEnabled) return this.#createPlayoffRound(0, seededTeams, participantCount);
    const groups = ["east", "west"].map((conference) => seededTeams.filter((entry) => entry.conference === conference));
    const round = this.#createPlayoffRound(0, [], participantCount);
    let seriesOffset = 0;
    round.series = groups.flatMap((group) => {
      const series = this.#createPlayoffSeries(0, group, seriesOffset);
      seriesOffset += series.length;
      return series;
    });
    return round;
  }

  #createPlayoffRound(roundIndex, seededTeams, participantCount) {
    const roundNamesByTotal = {
      8: ["Четвертьфинал", "Полуфинал", "Финал"],
      16: ["1/8 финала", "Четвертьфинал", "Полуфинал", "Финал"],
    };
    const totalRounds = Math.log2(participantCount);
    const names = roundNamesByTotal[participantCount] || Array.from({ length: totalRounds }, (_, index) => `Раунд ${index + 1}`);
    const series = [];
    series.push(...this.#createPlayoffSeries(roundIndex, seededTeams));
    return {
      roundIndex,
      name: names[Math.min(roundIndex, names.length - 1)],
      series,
    };
  }

  #createPlayoffSeries(roundIndex, seededTeams, seriesOffset = 0) {
    const series = [];
    for (let seriesIndex = 0; seriesIndex < seededTeams.length / 2; seriesIndex++) {
      const seriesSlot = seriesOffset + seriesIndex;
      const higherSeed = seededTeams[seriesIndex];
      const lowerSeed = seededTeams[seededTeams.length - 1 - seriesIndex];
      series.push({
        id: PLAYOFF_SERIES_ID(roundIndex, seriesSlot),
        seriesSlot,
        higherSeed: { ...higherSeed, wins: 0 },
        lowerSeed: { ...lowerSeed, wins: 0 },
        winnerTeamId: null,
        games: [],
      });
    }
    return series;
  }

  #ensurePlayoffSchedule() {
    if (!this.#playoffs.active || this.#playoffs.status === "complete") return;

    while (this.#index >= this.#days.length) {
      const round = this.#playoffs.rounds[this.#playoffs.currentRoundIndex];
      if (!round) return;

      const unfinishedSeries = round.series.filter((series) => !series.winnerTeamId && series.games.length < 7);
      if (unfinishedSeries.length) {
        this.#schedulePlayoffDay(round, unfinishedSeries);
        return;
      }

      const winners = round.series
        .map((series) => ({
          seed: series.winnerTeamId === series.higherSeed.team.id ? series.higherSeed.seed : series.lowerSeed.seed,
          regularSeasonRank: series.winnerTeamId === series.higherSeed.team.id ? series.higherSeed.regularSeasonRank : series.lowerSeed.regularSeasonRank,
          regularSeasonPoints: series.winnerTeamId === series.higherSeed.team.id ? series.higherSeed.regularSeasonPoints : series.lowerSeed.regularSeasonPoints,
          conference: series.winnerTeamId === series.higherSeed.team.id ? series.higherSeed.conference : series.lowerSeed.conference,
          team: this.#teamsById.get(series.winnerTeamId),
        }))
        .filter((entry) => entry.team)
        .sort((left, right) => this.#comparePlayoffSeeds(left, right));

      if (winners.length <= 1) {
        this.#playoffs.status = "complete";
        this.#playoffs.championTeamId = winners[0]?.team?.id || null;
        return;
      }

      this.#playoffs.currentRoundIndex += 1;
      this.#playoffs.rounds.push(this.#createPlayoffRound(this.#playoffs.currentRoundIndex, winners.map((entry) => ({
        ...entry,
        seed: this.#conferencesEnabled ? (entry.regularSeasonRank || entry.seed) : entry.seed,
      })), this.#playoffs.participantCount));
    }
  }

  #comparePlayoffSeeds(left, right) {
    if (!this.#conferencesEnabled) return left.seed - right.seed;
    return (right.regularSeasonPoints || 0) - (left.regularSeasonPoints || 0) ||
      (left.regularSeasonRank || left.seed) - (right.regularSeasonRank || right.seed);
  }

  #schedulePlayoffDay(round, unfinishedSeries) {
    const dayNumber = this.#days.length + 1;
    const scheduledDate = this.#nextPlayoffDate;
    const matches = unfinishedSeries.map((series, seriesIndex) => {
      const gameNumber = series.games.length + 1;
      const seriesSlot = Number.isFinite(series.seriesSlot) ? series.seriesSlot : seriesIndex;
      const homeRole = PLAYOFF_HOME_PATTERN[gameNumber - 1] || "higher";
      const homeTeam = homeRole === "higher" ? series.higherSeed.team : series.lowerSeed.team;
      const awayTeam = homeRole === "higher" ? series.lowerSeed.team : series.higherSeed.team;
      const match = {
        id: PLAYOFF_MATCH_ID(round.roundIndex, seriesSlot, gameNumber),
        home: homeTeam,
        away: awayTeam,
        result: null,
        phase: "playoffs",
        roundIndex: round.roundIndex,
        roundName: round.name,
        seriesId: series.id,
        gameNumber,
        day: dayNumber,
        dateIso: toIsoDate(scheduledDate),
      };
      series.games.push(match);
      return match;
    });

    this.#days.push(createCalendarDay(dayNumber, scheduledDate, {
      phase: "playoffs",
      stageLabel: round.name,
      roundIndex: round.roundIndex,
      matches,
    }));
    this.#nextPlayoffDate = addDays(scheduledDate, 2);
  }

  #applyPlayoffResult(match) {
    const round = this.#playoffs.rounds[match.roundIndex];
    const series = round?.series.find((entry) => entry.id === match.seriesId);
    if (!series || !match.result) return;

    const winnerTeamId = match.result.homeGoals > match.result.awayGoals ? match.home.id : match.away.id;
    if (winnerTeamId === series.higherSeed.team.id) series.higherSeed.wins += 1;
    else if (winnerTeamId === series.lowerSeed.team.id) series.lowerSeed.wins += 1;

    if (series.higherSeed.wins >= 4) series.winnerTeamId = series.higherSeed.team.id;
    if (series.lowerSeed.wins >= 4) series.winnerTeamId = series.lowerSeed.team.id;
  }

  #serializePlayoffs() {
    if (!this.#playoffs.active) return { active: false };
    return {
      active: true,
      status: this.#playoffs.status,
      participantCount: this.#playoffs.participantCount,
      currentRoundIndex: this.#playoffs.currentRoundIndex,
      championTeamId: this.#playoffs.championTeamId,
      rounds: this.#playoffs.rounds.map((round) => ({
        roundIndex: round.roundIndex,
        name: round.name,
        series: round.series.map((series) => ({
          id: series.id,
          seriesSlot: series.seriesSlot,
          higherSeed: {
            teamId: series.higherSeed.team.id,
            seed: series.higherSeed.seed,
            regularSeasonRank: series.higherSeed.regularSeasonRank || series.higherSeed.seed,
            regularSeasonPoints: series.higherSeed.regularSeasonPoints || 0,
            conference: series.higherSeed.conference || getTeamConference(series.higherSeed.team),
            wins: series.higherSeed.wins,
          },
          lowerSeed: {
            teamId: series.lowerSeed.team.id,
            seed: series.lowerSeed.seed,
            regularSeasonRank: series.lowerSeed.regularSeasonRank || series.lowerSeed.seed,
            regularSeasonPoints: series.lowerSeed.regularSeasonPoints || 0,
            conference: series.lowerSeed.conference || getTeamConference(series.lowerSeed.team),
            wins: series.lowerSeed.wins,
          },
          winnerTeamId: series.winnerTeamId,
          games: series.games.map((game) => ({
            id: game.id,
            homeTeamId: game.home.id,
            awayTeamId: game.away.id,
            day: game.day,
            gameNumber: game.gameNumber,
            roundIndex: game.roundIndex,
            roundName: game.roundName,
            seriesId: game.seriesId,
            dateIso: game.dateIso,
            result: game.result ? { ...game.result } : null,
          })),
        })),
      })),
    };
  }

  #importRegularResults(results) {
    const resultMap = new Map((results || []).map((entry) => [`${entry.day}:${entry.matchId}`, entry]));
    this.#days.slice(0, this.#regularSeasonDaysCount).forEach((day) => {
      day.matches.forEach((match) => {
        const snapshot = resultMap.get(`${day.day}:${match.id}`);
        match.result = snapshot ? {
          homeGoals: Number(snapshot.homeGoals) || 0,
          awayGoals: Number(snapshot.awayGoals) || 0,
          wentToOvertime: Boolean(snapshot.wentToOvertime),
        } : null;
      });
    });
  }

  #importPlayoffs(payload) {
    const rounds = (payload?.rounds || []).map((round) => ({
      roundIndex: Number(round.roundIndex) || 0,
      name: round.name || `Раунд ${(Number(round.roundIndex) || 0) + 1}`,
      series: (round.series || []).map((series, seriesIndex) => {
        const normalizedSeriesId = PLAYOFF_SERIES_ID(Number(round.roundIndex) || 0, seriesIndex);
        const seriesSlot = seriesIndex;
        return {
          id: normalizedSeriesId,
          seriesSlot,
          higherSeed: {
            team: this.#teamsById.get(series.higherSeed.teamId),
            seed: Number(series.higherSeed.seed) || 1,
            regularSeasonRank: Number(series.higherSeed.regularSeasonRank) || Number(series.higherSeed.seed) || 1,
            regularSeasonPoints: Number(series.higherSeed.regularSeasonPoints) || 0,
            conference: series.higherSeed.conference || getTeamConference(this.#teamsById.get(series.higherSeed.teamId)),
            wins: Number(series.higherSeed.wins) || 0,
          },
          lowerSeed: {
            team: this.#teamsById.get(series.lowerSeed.teamId),
            seed: Number(series.lowerSeed.seed) || 1,
            regularSeasonRank: Number(series.lowerSeed.regularSeasonRank) || Number(series.lowerSeed.seed) || 1,
            regularSeasonPoints: Number(series.lowerSeed.regularSeasonPoints) || 0,
            conference: series.lowerSeed.conference || getTeamConference(this.#teamsById.get(series.lowerSeed.teamId)),
            wins: Number(series.lowerSeed.wins) || 0,
          },
          winnerTeamId: series.winnerTeamId || null,
          games: (series.games || []).map((game) => {
            const gameNumber = Number(game.gameNumber) || 1;
            return {
              id: PLAYOFF_MATCH_ID(Number(round.roundIndex) || 0, seriesSlot, gameNumber),
              home: this.#teamsById.get(game.homeTeamId),
              away: this.#teamsById.get(game.awayTeamId),
              result: game.result ? { ...game.result } : null,
              phase: "playoffs",
              roundIndex: Number(game.roundIndex) || 0,
              roundName: game.roundName || round.name,
              seriesId: normalizedSeriesId,
              gameNumber,
              day: Number(game.day) || this.#days.length + 1,
              dateIso: game.dateIso || this.#playoffStartDate,
            };
          }).filter((game) => game.home && game.away),
        };
      }).filter((series) => series.higherSeed.team && series.lowerSeed.team),
    }));

    this.#playoffs = {
      active: true,
      status: payload.status || "active",
      participantCount: Number(payload.participantCount) || 0,
      currentRoundIndex: Number(payload.currentRoundIndex) || 0,
      rounds,
      championTeamId: payload.championTeamId || null,
    };

    const playoffDays = groupMatchesByDay(rounds.flatMap((round) => round.series.flatMap((series) => series.games)));
    this.#days.push(...playoffDays);
    const lastPlayoffDate = playoffDays.length ? new Date(playoffDays[playoffDays.length - 1].dateIso) : this.#playoffStartDate;
    this.#nextPlayoffDate = addDays(lastPlayoffDate, 2);
  }
}
