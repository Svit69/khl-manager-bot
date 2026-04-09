import { MatchSimulator } from "../sim/MatchSimulator.js";
import { StatsTracker } from "../stats/StatsTracker.js";
import { AiRenewalService } from "../contracts/AiRenewalService.js";
import { ContractService } from "../contracts/ContractService.js";
import { StandingsTracker } from "../stats/StandingsTracker.js";
import { buildCompetitiveLines } from "../data/lineupBuilder.js";
import { calculateAge, setSeasonReferenceDate } from "../contracts/SeasonUtils.js";
import { PlayerDevelopmentService } from "../progression/PlayerDevelopmentService.js";
import { TradeService } from "../trade/TradeService.js";
import { SeasonTransitionService } from "../season/SeasonTransitionService.js";

export class AppState {
  #teams;
  #calendar;
  #freeAgents;
  #stats = new StatsTracker();
  #standings = new StandingsTracker();
  #sim = new MatchSimulator();
  #contracts;
  #development = new PlayerDevelopmentService();
  #trade;
  #aiRenewals;
  #seasonTransition;
  #lastMatch = null;
  #activeTeamId = null;
  #notifications = [];
  #seasonHistory = [];
  #seasonState;

  constructor(teams, calendar, contracts, freeAgents = []) {
    this.#teams = teams;
    this.#calendar = calendar;
    this.#freeAgents = freeAgents;
    this.#contracts = new ContractService(contracts);
    this.#aiRenewals = new AiRenewalService(this.#contracts);
    this.#seasonTransition = new SeasonTransitionService(this.#contracts, this.#aiRenewals, this.#development);
    this.#trade = new TradeService((playerId) => this.#contracts.getContractsForPlayer(playerId));
    this.#seasonState = {
      phase: "preseason",
      seasonLabel: this.#calendar.seasonLabel,
      previousSeasonLabel: null,
    };
    this.#syncSeasonReferenceDate();
    this.#syncSeasonPhase();
  }

  get teams() { return this.#teams; }
  get calendar() { return this.#calendar; }
  get currentSeasonDate() { return this.#getEffectiveNegotiationDate(); }
  get currentSeasonDateLabel() {
    const effectiveDate = new Date(this.#getEffectiveNegotiationDate());
    return Number.isNaN(effectiveDate.getTime())
      ? this.#calendar.currentDateLabel
      : effectiveDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  }
  get lastMatch() { return this.#lastMatch; }
  get seasonStats() { return this.#stats.getSeasonStats(); }
  get activeTeamId() { return this.#activeTeamId; }
  get activeTeam() { return this.#teams.find((team) => team.id === this.#activeTeamId) || null; }
  get seasonHistory() { return [...this.#seasonHistory]; }
  getSeasonState() {
    return {
      ...this.#seasonState,
      canAdvance: this.canAdvanceToNextSeason(),
      latestArchive: this.#seasonHistory[0] || null,
    };
  }

  getStandingsTable() { return this.#standings.getTable(this.#teams); }
  getPlayoffBracketData() { return this.#calendar.getPlayoffBracketData(); }
  getTopScorers(limit = 10) {
    const playersById = new Map(this.getAllPlayers().map((player) => [player.id, player]));
    return this.#stats.getSeasonStats().map((row) => {
      const player = row.playerId
        ? playersById.get(row.playerId)
        : [...playersById.values()].find((entry) => entry.name === row.name);
      const team = player?.affiliation?.teamId
        ? this.#teams.find((entry) => entry.id === player.affiliation.teamId)
        : null;
      return {
        ...row,
        team: team?.shortName || team?.name || "—",
      };
    }).slice(0, limit);
  }

  getUnreadNotificationCount() {
    return this.#notifications.filter((notification) => !notification.read).length;
  }

  getUnreadNotifications(limit = 6) {
    return this.#notifications.filter((notification) => !notification.read).slice(0, limit);
  }

  markNotificationsRead() {
    let changed = false;
    this.#notifications = this.#notifications.map((notification) => {
      if (notification.read) return notification;
      changed = true;
      return { ...notification, read: true };
    });
    return changed;
  }

  setActiveTeamId(teamId) {
    this.#activeTeamId = teamId;
  }

  getVisibleCalendarDay() {
    return this.#activeTeamId ? this.#calendar.getCurrentForTeam(this.#activeTeamId) : this.#calendar.getCurrent();
  }

  getCalendarScheduleRows() {
    return this.#calendar.getScheduleRows(this.#activeTeamId);
  }

  getAllPlayers() {
    return [...this.#teams.flatMap((team) => team.getRoster()), ...this.#freeAgents];
  }

  getActiveTeamContractRows() {
    return this.activeTeam ? this.#contracts.getTeamContractRows(this.activeTeam, this.#getEffectiveNegotiationDate()) : [];
  }

  getTeamStatisticsRows(teamId = this.#activeTeamId, sortBy = "points") {
    const team = this.#teams.find((entry) => entry.id === teamId) || null;
    return team ? this.#contracts.getTeamStatisticsRows(team, this.#buildNegotiationContext(team), sortBy) : [];
  }

  getActiveTeamStatisticsRows(sortBy = "points") {
    return this.getTeamStatisticsRows(this.#activeTeamId, sortBy);
  }

  getActiveTeamFreeAgentRows() {
    return this.#contracts.getFreeAgentRows(this.getAvailableFreeAgents());
  }

  getTradePartnerTeams() {
    return this.activeTeam ? this.#teams.filter((team) => team.id !== this.#activeTeamId) : [];
  }

  getAvailableFreeAgents() {
    return this.#freeAgents.filter((player) => !player.affiliation?.teamId);
  }

  evaluateTradeWithTeam(teamId, givePlayerIds, receivePlayerIds) {
    const opponent = this.#teams.find((team) => team.id === teamId);
    return this.activeTeam && opponent ? this.#trade.evaluateTrade(this.activeTeam, opponent, givePlayerIds, receivePlayerIds) : null;
  }

  submitTradeWithTeam(teamId, givePlayerIds, receivePlayerIds) {
    const opponent = this.#teams.find((team) => team.id === teamId);
    return this.activeTeam && opponent ? this.#trade.executeTrade(this.activeTeam, opponent, givePlayerIds, receivePlayerIds) : null;
  }

  getActiveTeamNegotiationPreview(playerId, offer) {
    const player = this.activeTeam?.getRoster().find((entry) => entry.id === playerId);
    return player ? this.#contracts.getRenewalPreview(this.activeTeam, player, offer, this.#buildNegotiationContext(this.activeTeam)) : null;
  }

  submitActiveTeamNegotiation(playerId, offer) {
    const player = this.activeTeam?.getRoster().find((entry) => entry.id === playerId);
    return player ? this.#contracts.submitRenewalOffer(this.activeTeam, player, offer, this.#buildNegotiationContext(this.activeTeam)) : null;
  }

  getFreeAgentSigningPreview(playerId, offer) {
    const player = this.getAvailableFreeAgents().find((entry) => entry.id === playerId);
    return this.activeTeam && player
      ? this.#contracts.getFreeAgentPreview(this.activeTeam, player, offer, this.#buildNegotiationContext(this.activeTeam))
      : null;
  }

  submitFreeAgentSigning(playerId, offer) {
    const player = this.getAvailableFreeAgents().find((entry) => entry.id === playerId);
    if (!this.activeTeam || !player) return null;
    const result = this.#contracts.submitFreeAgentOffer(this.activeTeam, player, offer, this.#buildNegotiationContext(this.activeTeam));
    if (result?.decision === "accept") {
      player.affiliation.acquiredDay = this.#calendar.currentDay;
      this.activeTeam.reservePlayers.push(player);
      this.#freeAgents = this.#freeAgents.filter((entry) => entry.id !== player.id);
      this.#refreshExpectedRoles(this.activeTeam);
    }
    return result;
  }

  extendActiveTeamPlayerContract(playerId, mode) {
    const player = this.activeTeam?.getRoster().find((entry) => entry.id === playerId);
    return player ? this.#contracts.extendContract(player, mode) : null;
  }

  moveActiveTeamLinePlayerToReserve(lineIndex, slotIndex) {
    const moved = this.activeTeam ? this.activeTeam.moveLinePlayerToReserve(lineIndex, slotIndex) : false;
    if (moved && this.activeTeam) this.#refreshExpectedRoles(this.activeTeam);
    return moved;
  }

  swapActiveTeamRosterSlots(source, target) {
    const moved = this.activeTeam ? this.activeTeam.swapRosterSlots(source, target) : false;
    if (moved && this.activeTeam) this.#refreshExpectedRoles(this.activeTeam);
    return moved;
  }

  playDay() {
    const day = this.#calendar.getCurrent();
    return day ? this.#simulateCalendarDay(day, null) : null;
  }

  playDayForActiveTeam() {
    if (!this.#activeTeamId) return this.playDay();
    while (true) {
      const day = this.#calendar.getCurrent();
      if (!day) return null;
      if (!day.matches?.length) return this.#simulateCalendarDay(day, null);
      const simulated = this.#simulateCalendarDay(day, this.#activeTeamId);
      if (simulated) return simulated;
    }
  }

  canAdvanceToNextSeason() {
    return this.#calendar.isFinished();
  }

  canStartSeason() {
    return Boolean(this.#seasonState?.phase === "preseason" && this.#seasonState?.preseasonOpen);
  }

  startSeason() {
    if (!this.canStartSeason()) return false;
    this.#seasonState = {
      ...this.#seasonState,
      preseasonOpen: false,
      phase: "regular",
    };
    this.#syncSeasonReferenceDate();
    return true;
  }

  advanceToNextSeason() {
    if (!this.canAdvanceToNextSeason()) return null;
    const transition = this.#seasonTransition.advanceToNextSeason({
      teams: this.#teams,
      calendar: this.#calendar,
      activeTeamId: this.#activeTeamId,
      standingsTable: this.getStandingsTable(),
      scorerTable: this.#stats.getSeasonStats(),
      allPlayers: this.getAllPlayers(),
      buildContext: (team) => this.#buildNegotiationContext(team),
      pushNotification: (notification) => this.#pushNotification(notification),
    });
    this.#seasonHistory.unshift(transition.archive);
    this.#seasonHistory = this.#seasonHistory.slice(0, 12);
    this.#freeAgents = transition.freeAgents;
    this.#stats.importStats([]);
    this.#standings.importSnapshot([]);
    this.#lastMatch = null;
    this.#seasonState = transition.seasonState;
    this.#syncSeasonReferenceDate();
    this.#syncSeasonPhase();
    return transition;
  }

  exportState() {
    const players = [...new Map(this.getAllPlayers().map((player) => [player.id, player])).values()].map((player) => ({
      id: player.id,
      fatigueScore: player.fatigueScore,
      form: player.form,
      injuryUntilDay: player.condition.injuryUntilDay,
      moodScore: player.moodScore,
      attributes: player.attributes.exportSnapshot(),
      potential: player.potential.exportSnapshot(),
      career: player.career?.exportSnapshot?.() || null,
      seasonStats: player.seasonStats.exportSnapshot(),
      teamId: player.affiliation?.teamId || null,
      contractId: player.affiliation?.contractId || null,
      acquiredDay: player.affiliation?.acquiredDay ?? null,
      expectedLineIndex: player.expectedLineIndex ?? null,
    }));
    const rosters = this.#teams.map((team) => ({
      teamId: team.id,
      linePlayerIds: team.lines.map((line) => line.players.map((player) => player?.id || null)),
      reservePlayerIds: team.reservePlayers.map((player) => player.id),
    }));
    return {
      calendar: this.#calendar.exportState(),
      players,
      stats: this.#stats.getSeasonStats(),
      activeTeamId: this.#activeTeamId,
      contracts: this.#contracts.exportContracts(),
      standings: this.#standings.getSnapshot(),
      rosters,
      notifications: this.#notifications,
      seasonHistory: this.#seasonHistory,
      seasonState: this.#seasonState,
    };
  }

  importState(saved) {
    if (!saved) return;
    const allPlayers = [...new Map(this.getAllPlayers().map((player) => [player.id, player])).values()];
    this.#activeTeamId = saved.activeTeamId || null;
    if (saved.calendar) this.#calendar.importState(saved.calendar);
    else {
      this.#calendar.index = saved.calendarIndex || 0;
      if (saved.calendarResults) this.#calendar.importResults(saved.calendarResults);
    }
    if (saved.rosters) this.#importRosters(saved.rosters);

    const map = new Map((saved.players || []).map((player) => [player.id, player]));
    allPlayers.forEach((player) => {
      const snapshot = map.get(player.id);
      if (!snapshot) return;
      player.applyFatigue(snapshot.fatigueScore - player.fatigueScore);
      player.applyFormDelta(snapshot.form - player.form);
      if ("moodScore" in snapshot) player.applyMoodDelta(snapshot.moodScore - player.moodScore);
      if (snapshot.attributes) player.attributes.importSnapshot(snapshot.attributes);
      if (snapshot.potential) player.potential.importSnapshot(snapshot.potential);
      if (snapshot.career) player.career?.importSnapshot?.(snapshot.career);
      if (snapshot.seasonStats) player.seasonStats.importSnapshot(snapshot.seasonStats);
      if ("teamId" in snapshot) player.affiliation.teamId = snapshot.teamId;
      if ("contractId" in snapshot) player.affiliation.contractId = snapshot.contractId;
      if ("acquiredDay" in snapshot) player.affiliation.acquiredDay = snapshot.acquiredDay;
      if ("expectedLineIndex" in snapshot) player.expectedLineIndex = snapshot.expectedLineIndex;
    });

    this.#freeAgents = allPlayers.filter((player) => !player.affiliation?.teamId);
    if (saved.contracts) this.#contracts.importContracts(saved.contracts);
    if (saved.standings) this.#standings.importSnapshot(saved.standings);
    this.#calendar.ensurePlayoffs(this.getStandingsTable());
    this.#stats.importStats(saved.stats);
    this.#seasonHistory = Array.isArray(saved.seasonHistory) ? [...saved.seasonHistory] : [];
    this.#seasonState = saved.seasonState && typeof saved.seasonState === "object"
      ? { ...saved.seasonState, seasonLabel: saved.seasonState.seasonLabel || this.#calendar.seasonLabel }
      : { phase: "preseason", seasonLabel: this.#calendar.seasonLabel, previousSeasonLabel: null, preseasonOpen: false };
    this.#notifications = (saved.notifications || []).map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      day: Number(notification.day) || this.#calendar.currentDay,
      createdAt: notification.createdAt || null,
      playerId: notification.playerId || null,
      read: Boolean(notification.read),
    }));
    this.#syncSeasonReferenceDate();
    this.#syncSeasonPhase();
  }

  applyFantasyDraft(assignmentsByTeamId) {
    const allPlayers = [...new Map(this.getAllPlayers().map((player) => [player.id, player])).values()];
    const draftedPlayersById = new Map();
    Object.values(assignmentsByTeamId || {}).flat().forEach((player) => {
      if (player?.id) draftedPlayersById.set(player.id, player);
    });
    const undraftedPlayers = allPlayers.filter((player) => !draftedPlayersById.has(player.id));

    this.#teams.forEach((team) => {
      const picked = [...(assignmentsByTeamId?.[team.id] || [])];
      picked.forEach((player) => {
        player.affiliation.teamId = team.id;
        player.affiliation.acquiredDay = null;
        this.#contracts.reassignPlayerContracts(player.id, team.id);
      });
      const lineup = buildCompetitiveLines(picked);
      team.lines.splice(0, team.lines.length, ...lineup.lines);
      team.reservePlayers.splice(0, team.reservePlayers.length, ...lineup.reservePlayers);
      this.#refreshExpectedRoles(team);
    });

    undraftedPlayers.forEach((player) => {
      player.affiliation.teamId = null;
      player.affiliation.contractId = null;
      player.affiliation.acquiredDay = null;
      player.expectedLineIndex = null;
    });
    this.#contracts.releasePlayers(undraftedPlayers.map((player) => player.id));
    this.#freeAgents = undraftedPlayers;
    this.#calendar.index = 0;
    this.#seasonState = { phase: "preseason", seasonLabel: this.#calendar.seasonLabel, previousSeasonLabel: null, preseasonOpen: false };
    this.#syncSeasonReferenceDate();
    this.#lastMatch = null;
    this.#stats.importStats([]);
    this.#standings.importSnapshot([]);
    this.getAllPlayers().forEach((player) => player.seasonStats.importSnapshot());
  }

  #importRosters(rosters) {
    const playersById = new Map(this.getAllPlayers().map((player) => [player.id, player]));
    (rosters || []).forEach((item) => {
      const team = this.#teams.find((entry) => entry.id === item.teamId);
      if (!team) return;
      const restored = this.#restoreSavedRoster(team, item, playersById);
      if (!restored) {
        const picked = (item.playerIds || []).map((playerId) => playersById.get(playerId)).filter(Boolean);
        picked.forEach((player) => { player.affiliation.teamId = team.id; });
        const lineup = buildCompetitiveLines(picked);
        team.lines.splice(0, team.lines.length, ...lineup.lines);
        team.reservePlayers.splice(0, team.reservePlayers.length, ...lineup.reservePlayers);
      }
      this.#refreshExpectedRoles(team);
    });
  }

  #restoreSavedRoster(team, item, playersById) {
    const linePlayerIds = item?.linePlayerIds;
    const reservePlayerIds = item?.reservePlayerIds;
    if (!Array.isArray(linePlayerIds) || !Array.isArray(reservePlayerIds)) return false;
    linePlayerIds.forEach((lineIds, lineIndex) => {
      const line = team.lines[lineIndex];
      if (!line || !Array.isArray(lineIds)) return;
      const paddedLineIds = Array.from({ length: line.positions.length }, (_, slotIndex) => lineIds[slotIndex] || null);
      line.players.splice(0, line.players.length, ...paddedLineIds.map((playerId) => {
        const player = playerId ? playersById.get(playerId) : null;
        if (player) player.affiliation.teamId = team.id;
        return player || null;
      }));
    });
    team.reservePlayers.splice(0, team.reservePlayers.length, ...reservePlayerIds
      .map((playerId) => {
        const player = playersById.get(playerId);
        if (player) player.affiliation.teamId = team.id;
        return player;
      })
      .filter(Boolean));
    return true;
  }

  #simulateCalendarDay(day, focusTeamId) {
    const previousDate = this.#calendar.currentDate;
    const matches = day?.matches || [];
    if (matches.length === 0) {
      this.#lastMatch = null;
      this.#applyFatigue(this.#teams, -8);
      this.#calendar.advanceDay();
      this.#syncSeasonReferenceDate();
      this.#runMonthlyAiRenewals(previousDate, this.#calendar.currentDate);
      this.#syncSeasonPhase();
      return null;
    }

    const focusedMatches = [];
    const playedTeams = new Set();
    matches.forEach((match) => {
      const simulated = this.#sim.simulateMatch(match.home, match.away, { phase: day?.phase || "regular" });
      this.#calendar.recordResult(day.day, match.id, simulated);
      if (day?.phase !== "playoffs") this.#standings.recordMatch(simulated);
      this.#stats.recordMatch(simulated);
      this.#applyMatchPlayerStats(simulated);
      const homeDevelopmentEvents = this.#development.applyMatchDevelopment(simulated.home, simulated.summary?.home, {
        teamGamesPlayed: this.#standings.getTeamStats(simulated.home.id)?.gp || 0,
      });
      const awayDevelopmentEvents = this.#development.applyMatchDevelopment(simulated.away, simulated.summary?.away, {
        teamGamesPlayed: this.#standings.getTeamStats(simulated.away.id)?.gp || 0,
      });
      this.#pushDevelopmentNotifications(simulated.home, homeDevelopmentEvents, day.day);
      this.#pushDevelopmentNotifications(simulated.away, awayDevelopmentEvents, day.day);
      this.#applyMatchMood(simulated.home, simulated.summary?.home);
      this.#applyMatchMood(simulated.away, simulated.summary?.away);
      playedTeams.add(match.home.id);
      playedTeams.add(match.away.id);
      if (!focusTeamId || match.home.id === focusTeamId || match.away.id === focusTeamId) {
        focusedMatches.push(simulated);
      }
    });

    const playedTeamList = this.#teams.filter((team) => playedTeams.has(team.id));
    const idleTeamList = this.#teams.filter((team) => !playedTeams.has(team.id));
    if (playedTeamList.length) this.#applyFatigue(playedTeamList, 12);
    if (idleTeamList.length) this.#applyFatigue(idleTeamList, -8);
    this.#calendar.advanceDay();
    this.#calendar.ensurePlayoffs(this.getStandingsTable());
    this.#syncSeasonReferenceDate();
    this.#runMonthlyAiRenewals(previousDate, this.#calendar.currentDate);
    this.#lastMatch = focusedMatches[0] || null;
    this.#syncSeasonPhase();
    return this.#lastMatch;
  }

  #applyFatigue(teams, delta) {
    teams.flatMap((team) => team.getRoster()).forEach((player) => {
      player.applyFatigue(delta);
      player.applyFormDelta(Math.random() * 0.02 - 0.01);
    });
  }

  #applyMatchPlayerStats(match) {
    const applySide = (teamSummary, team) => {
      const byId = new Map(team.getRoster().map((player) => [player.id, player]));
      (teamSummary?.playerStats || []).forEach((stat) => {
        const player = byId.get(stat.playerId);
        if (player) player.seasonStats.applyMatch(stat);
      });
    };
    applySide(match?.summary?.home, match?.home);
    applySide(match?.summary?.away, match?.away);
  }

  #applyMatchMood(team, teamSummary) {
    const roster = team?.getRoster?.() || [];
    if (!roster.length) return;
    const statsById = new Map((teamSummary?.playerStats || []).map((stat) => [stat.playerId, stat]));
    const playedPlayers = roster.filter((player) => statsById.has(player.id));
    const playedByGroup = new Map();
    playedPlayers.forEach((player) => {
      const group = this.#getPositionMoodGroup(player.identity?.primaryPosition);
      if (!playedByGroup.has(group)) playedByGroup.set(group, []);
      playedByGroup.get(group).push(player);
    });

    roster.forEach((player) => {
      const stat = statsById.get(player.id);
      if (stat) {
        const iceMinutes = (Number(stat.totalIceTime) || 0) / 60;
        let moodDelta = 1.1;
        if (iceMinutes >= 18) moodDelta += 0.9;
        else if (iceMinutes >= 12) moodDelta += 0.5;
        else if (iceMinutes < 8) moodDelta -= 0.2;
        if (player.moodState === "red" || player.moodState === "orange") moodDelta += 0.35;
        player.applyMoodDelta(moodDelta);
        return;
      }

      const groupPlayers = playedByGroup.get(this.#getPositionMoodGroup(player.identity?.primaryPosition)) || [];
      const age = calculateAge(player.identity?.birthDate);
      const sensitivity = age <= 19 ? 0.25 : (age <= 22 ? 0.55 : 1);
      if (!groupPlayers.length) {
        player.applyMoodDelta(-0.35 * sensitivity);
        return;
      }

      const strongerThanSomeone = groupPlayers.some((activePlayer) => (player.ovr || 0) > (activePlayer.ovr || 0));
      const averageActiveOvr = groupPlayers.reduce((total, activePlayer) => total + (activePlayer.ovr || 0), 0) / groupPlayers.length;
      let moodDelta = -0.75;
      if (strongerThanSomeone && (player.ovr || 0) >= averageActiveOvr + 1) {
        moodDelta = -3.2;
      } else if ((player.ovr || 0) >= averageActiveOvr - 1) {
        moodDelta = -1.6;
      } else if ((player.ovr || 0) <= averageActiveOvr - 4) {
        moodDelta = -0.35;
      }
      player.applyMoodDelta(moodDelta * sensitivity);
    });
  }

  #getPositionMoodGroup(position) {
    if (position === "ЗАЩ") return "DEF";
    if (position === "ВРТ") return "G";
    return "FWD";
  }

  #buildNegotiationContext(team) {
    const rank = this.#standings.getRank(team.id, this.#teams);
    const teamsCount = this.#teams.length;
    const teamStats = this.#standings.getTeamStats(team.id);
    const teamGamesPlayed = teamStats?.gp || 0;
    const currentDate = this.#getEffectiveNegotiationDate();
    return {
      teamRank: rank,
      teamsCount,
      teamGamesPlayed,
      currentDate,
      isInTop8: rank !== null && rank <= 8,
      teamRoster: team.getRoster(),
      allPlayers: this.getAllPlayers(),
    };
  }

  #syncSeasonReferenceDate() {
    setSeasonReferenceDate(this.#getEffectiveNegotiationDate());
  }

  #syncSeasonPhase() {
    if (this.#calendar.isFinished()) {
      this.#seasonState = {
        ...this.#seasonState,
        phase: "offseason-ready",
        preseasonOpen: false,
        seasonLabel: this.#calendar.seasonLabel,
      };
      return;
    }
    if (this.#calendar.getPlayoffBracketData().active) {
      this.#seasonState = {
        ...this.#seasonState,
        phase: "playoffs",
        preseasonOpen: false,
        seasonLabel: this.#calendar.seasonLabel,
      };
      return;
    }
    const totalGamesPlayed = this.getStandingsTable().reduce((sum, row) => sum + (row.gp || 0), 0);
    const keepPreseason = totalGamesPlayed === 0 && this.#seasonState?.preseasonOpen;
    this.#seasonState = {
      ...this.#seasonState,
      phase: keepPreseason ? "preseason" : totalGamesPlayed > 0 ? "regular" : "preseason",
      seasonLabel: this.#calendar.seasonLabel,
    };
  }

  #getEffectiveNegotiationDate() {
    if (this.#calendar.isFinished()) {
      return new Date(Date.UTC(this.#calendar.seasonStartYear + 1, 6, 1)).toISOString().slice(0, 10);
    }
    if (this.#seasonState?.preseasonOpen && this.#seasonState?.preseasonDateIso) {
      return this.#seasonState.preseasonDateIso;
    }
    return this.#calendar.currentDate;
  }

  #runMonthlyAiRenewals(previousDate, currentDate) {
    if (!this.#didMonthChange(previousDate, currentDate)) return;
    const notifications = this.#aiRenewals.processMonthlyRenewals({
      teams: this.#teams,
      activeTeamId: this.#activeTeamId,
      standingsTable: this.getStandingsTable(),
      currentDate,
      currentDay: this.#calendar.currentDay,
      allPlayers: this.getAllPlayers(),
      buildContext: (team) => this.#buildNegotiationContext(team),
    });
    notifications.forEach((notification) => this.#pushNotification(notification));
  }

  #didMonthChange(previousDate, currentDate) {
    const left = new Date(previousDate);
    const right = new Date(currentDate);
    if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return false;
    return left.getUTCFullYear() !== right.getUTCFullYear() || left.getUTCMonth() !== right.getUTCMonth();
  }

  #pushNotification(notification) {
    if (!notification) return;
    this.#notifications.unshift(notification);
    this.#notifications = this.#notifications.slice(0, 80);
  }

  #pushDevelopmentNotifications(team, events, day) {
    if (!this.#activeTeamId || team?.id !== this.#activeTeamId || !events?.length) return;
    events.forEach((event) => {
      const isUpgrade = event.type === "upgrade";
      this.#pushNotification({
        id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: event.type,
        title: isUpgrade ? "Рост рейтинга" : "Снижение рейтинга",
        message: `${event.playerName}: OVR ${event.oldOvr} → ${event.newOvr}`,
        day,
        createdAt: new Date().toISOString(),
        playerId: event.playerId,
        read: false,
      });
    });
  }

  #refreshExpectedRoles(team) {
    if (!team) return;
    team.lines.forEach((line, lineIndex) => {
      line.players.forEach((player) => {
        if (player) player.expectedLineIndex = lineIndex + 1;
      });
    });
    team.reservePlayers.forEach((player) => {
      if (player) player.expectedLineIndex = null;
    });
  }
}
