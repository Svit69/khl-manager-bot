import { MatchSimulator } from "../sim/MatchSimulator.js";
import { StatsTracker } from "../stats/StatsTracker.js";
import { AiRenewalService } from "../contracts/AiRenewalService.js";
import { ContractService } from "../contracts/ContractService.js";
import { StandingsTracker } from "../stats/StandingsTracker.js";
import { setSeasonReferenceDate } from "../contracts/SeasonUtils.js";
import { PlayerDevelopmentService } from "../progression/PlayerDevelopmentService.js";
import { TradeService } from "../trade/TradeService.js";
import { SeasonTransitionService } from "../season/SeasonTransitionService.js";
import {
  createDevelopmentNotification,
  markNotificationsRead,
  normalizeNotifications,
  sortUnreadNotifications,
} from "./AppStateNotifications.js";
import { applyMatchMood, applyMatchPlayerStats } from "./AppStateMatchEffects.js";
import {
  createPlayerSnapshots,
  normalizeSeasonState,
  restorePlayerSnapshots,
} from "./AppStatePersistence.js";
import {
  applyFantasyDraftAssignments,
  createRosterSnapshots,
  importSavedRosters,
} from "./AppStateRoster.js";

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
    return this.#getSortedUnreadNotifications().slice(0, limit);
  }

  getUnreadNotificationTotal() {
    return this.#getSortedUnreadNotifications().length;
  }

  markNotificationsRead() {
    const { changed, notifications } = markNotificationsRead(this.#notifications);
    this.#notifications = notifications;
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
    return {
      calendar: this.#calendar.exportState(),
      players: createPlayerSnapshots(this.getAllPlayers()),
      stats: this.#stats.getSeasonStats(),
      activeTeamId: this.#activeTeamId,
      contracts: this.#contracts.exportContracts(),
      standings: this.#standings.getSnapshot(),
      rosters: createRosterSnapshots(this.#teams),
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
    if (saved.rosters) {
      importSavedRosters({
        teams: this.#teams,
        rosters: saved.rosters,
        allPlayers,
        refreshExpectedRoles: (team) => this.#refreshExpectedRoles(team),
      });
    }
    restorePlayerSnapshots(allPlayers, saved.players);

    this.#freeAgents = allPlayers.filter((player) => !player.affiliation?.teamId);
    if (saved.contracts) this.#contracts.importContracts(saved.contracts);
    if (saved.standings) this.#standings.importSnapshot(saved.standings);
    this.#calendar.ensurePlayoffs(this.getStandingsTable());
    this.#stats.importStats(saved.stats);
    this.#seasonHistory = Array.isArray(saved.seasonHistory) ? [...saved.seasonHistory] : [];
    this.#seasonState = normalizeSeasonState(saved.seasonState, this.#calendar.seasonLabel);
    this.#notifications = normalizeNotifications(saved.notifications, this.#calendar.currentDay);
    this.#syncSeasonReferenceDate();
    this.#syncSeasonPhase();
  }

  applyFantasyDraft(assignmentsByTeamId) {
    const { undraftedPlayers } = applyFantasyDraftAssignments({
      teams: this.#teams,
      allPlayers: [...new Map(this.getAllPlayers().map((player) => [player.id, player])).values()],
      assignmentsByTeamId,
      contracts: this.#contracts,
      refreshExpectedRoles: (team) => this.#refreshExpectedRoles(team),
    });
    this.#freeAgents = undraftedPlayers;
    this.#calendar.index = 0;
    this.#seasonState = { phase: "preseason", seasonLabel: this.#calendar.seasonLabel, previousSeasonLabel: null, preseasonOpen: false };
    this.#syncSeasonReferenceDate();
    this.#lastMatch = null;
    this.#stats.importStats([]);
    this.#standings.importSnapshot([]);
    this.getAllPlayers().forEach((player) => player.seasonStats.importSnapshot());
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
      applyMatchPlayerStats(simulated);
      const homeDevelopmentEvents = this.#development.applyMatchDevelopment(simulated.home, simulated.summary?.home, {
        teamGamesPlayed: this.#standings.getTeamStats(simulated.home.id)?.gp || 0,
      });
      const awayDevelopmentEvents = this.#development.applyMatchDevelopment(simulated.away, simulated.summary?.away, {
        teamGamesPlayed: this.#standings.getTeamStats(simulated.away.id)?.gp || 0,
      });
      this.#pushDevelopmentNotifications(simulated.home, homeDevelopmentEvents, day.day);
      this.#pushDevelopmentNotifications(simulated.away, awayDevelopmentEvents, day.day);
      applyMatchMood(simulated.home, simulated.summary?.home);
      applyMatchMood(simulated.away, simulated.summary?.away);
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

  #getSortedUnreadNotifications() {
    return sortUnreadNotifications(this.#notifications);
  }

  #pushDevelopmentNotifications(team, events, day) {
    if (!this.#activeTeamId || team?.id !== this.#activeTeamId || !events?.length) return;
    events.forEach((event) => {
      this.#pushNotification(createDevelopmentNotification(event, day));
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
