import { MatchSimulator } from "../sim/MatchSimulator.js";
import { StatsTracker } from "../stats/StatsTracker.js";
import { AiRenewalService } from "../contracts/AiRenewalService.js";
import { ContractService } from "../contracts/ContractService.js";
import { StandingsTracker } from "../stats/StandingsTracker.js";
import { setSeasonReferenceDate } from "../contracts/SeasonUtils.js";
import { PlayerDevelopmentService } from "../progression/PlayerDevelopmentService.js";
import { TradeService } from "../trade/TradeService.js";
import {
  buildCompetitiveOfferDecision,
  collectResolvableOfferGroups,
  formatSalaryMillions,
  upsertCompetitiveOffer,
} from "../season/OffseasonFreeAgencyMarket.js";
import { getPreseasonDateAt, getPreseasonNextDate } from "../season/PreseasonSchedule.js";
import { SeasonTransitionService } from "../season/SeasonTransitionService.js";
import { JuniorTeamService } from "../season/JuniorTeamService.js";
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

const dedupeFreeAgents = (players = []) => {
  const uniqueById = new Map();
  (players || []).forEach((player) => {
    if (!player?.id || player.affiliation?.teamId) return;
    uniqueById.set(player.id, player);
  });
  return [...uniqueById.values()];
};

export class AppState {
  #teams;
  #calendar;
  #freeAgents;
  #stats = new StatsTracker();
  #standings = new StandingsTracker();
  #sim = new MatchSimulator();
  #contracts;
  #development = new PlayerDevelopmentService();
  #juniors = new JuniorTeamService();
  #trade;
  #aiRenewals;
  #seasonTransition;
  #lastMatch = null;
  #activeTeamId = null;
  #notifications = [];
  #seasonHistory = [];
  #seasonState;
  #retiredPlayerIds = new Set();

  constructor(teams, calendar, contracts, freeAgents = []) {
    this.#teams = teams;
    this.#calendar = calendar;
    this.#freeAgents = dedupeFreeAgents(freeAgents);
    this.#contracts = new ContractService(contracts);
    this.#juniors.ensureJuniorDepth({ teams: this.#teams, contracts: this.#contracts, seasonLabel: this.#calendar.seasonLabel });
    this.#aiRenewals = new AiRenewalService(this.#contracts);
    this.#seasonTransition = new SeasonTransitionService(this.#contracts, this.#aiRenewals, this.#development);
    this.#trade = new TradeService({
      getPlayerContracts: (playerId) => this.#contracts.getContractsForPlayer(playerId),
      reassignPlayerContracts: (playerId, teamId) => this.#contracts.reassignPlayerContracts(playerId, teamId),
      getCurrentDay: () => this.#calendar.currentDay,
    });
    this.#seasonState = {
      phase: "preseason",
      seasonLabel: this.#calendar.seasonLabel,
      previousSeasonLabel: null,
      preseasonDates: [],
      preseasonOffers: [],
      restrictedRightsOffers: [],
      preseasonIndex: 0,
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
      canAdvancePreseason: this.canAdvancePreseasonDay(),
      canStartSeason: this.canStartSeason(),
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
    return [...this.#teams.flatMap((team) => [...team.getRoster(), ...(team.juniorPlayers || [])]), ...this.#freeAgents].filter(
      (player) => !this.#retiredPlayerIds.has(player.id),
    );
  }

  getFantasyDraftPlayerPool() {
    return [...this.#teams.flatMap((team) => team.getRoster()), ...this.#freeAgents].filter(
      (player) => !this.#retiredPlayerIds.has(player.id),
    );
  }

  getActiveTeamContractRows() {
    return this.activeTeam ? this.#contracts.getTeamContractRows(this.activeTeam, this.#getEffectiveNegotiationDate()) : [];
  }

  getActiveTeamRestrictedRightsRows() {
    if (!this.#activeTeamId) return [];
    const playersById = new Map(this.getAllPlayers().map((player) => [player.id, player]));
    return (this.#seasonState?.restrictedRightsOffers || [])
      .filter((entry) => entry?.status === "pending" && entry.rightsTeamId === this.#activeTeamId)
      .map((entry) => {
        const player = playersById.get(entry.playerId);
        if (!player) return null;
        return {
          ...entry,
          playerName: player.name,
          position: player.identity?.primaryPosition || "",
          ovr: player.ovr,
        };
      })
      .filter(Boolean);
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

  getActiveTeamJuniorView() {
    if (!this.activeTeam) return null;
    return {
      juniorTeam: this.activeTeam.juniorTeam,
      players: [...(this.activeTeam.juniorPlayers || [])].sort((left, right) => (right.ovr - left.ovr) || left.name.localeCompare(right.name, "ru")),
      mainPlayers: this.activeTeam.getRoster().map((player) => ({
        player,
        canSend: this.#contracts.hasThreeWayContract(player.id, this.#seasonState?.seasonLabel || this.#calendar.seasonLabel),
      })),
      targetSize: 22,
    };
  }

  getTradePartnerTeams() {
    return this.activeTeam ? this.#teams.filter((team) => team.id !== this.#activeTeamId) : [];
  }

  getAvailableFreeAgents() {
    return dedupeFreeAgents(this.#freeAgents);
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

  matchRestrictedRightsOffer(offerId, offer) {
    const entry = (this.#seasonState?.restrictedRightsOffers || []).find(
      (candidate) => candidate.id === offerId && candidate.rightsTeamId === this.#activeTeamId && candidate.status === "pending",
    );
    if (!entry || !this.activeTeam) return { accepted: false, message: "Предложение ОСА не найдено." };
    const player = this.activeTeam.getRoster().find((candidate) => candidate.id === entry.playerId);
    if (!player) return { accepted: false, message: "Игрок уже не находится в системе клуба." };

    const bestOffer = entry.offer || {};
    const submittedOffer = {
      years: Math.max(Number(bestOffer.years) || 1, Number(offer?.years) || 1),
      salaryRub: this.#roundSalaryRub(Math.max(Number(bestOffer.salaryRub) || 0, Number(offer?.salaryRub) || 0)),
    };
    const contract = this.#contracts.matchRestrictedFreeAgentOffer(
      player,
      this.#activeTeamId,
      submittedOffer,
      entry.season || this.#seasonState?.seasonLabel,
    );
    this.#resolveRestrictedRightsOffer(entry.id, "matched");
    this.#pushNotification({
      id: `notification-osa-match-${player.id}-${Date.now()}`,
      type: "offseason-retention",
      title: "Права ОСА",
      message: `${player.name} остался в клубе: ${submittedOffer.years} г. • ${formatSalaryMillions(submittedOffer.salaryRub)} млн`,
      day: this.#calendar.currentDay,
      createdAt: new Date().toISOString(),
      playerId: player.id,
      read: false,
    });
    return { accepted: true, decision: "matched", contract };
  }

  releaseRestrictedRightsOffer(offerId) {
    const entry = (this.#seasonState?.restrictedRightsOffers || []).find(
      (candidate) => candidate.id === offerId && candidate.rightsTeamId === this.#activeTeamId && candidate.status === "pending",
    );
    if (!entry) return { accepted: false, message: "Предложение ОСА не найдено." };
    const player = this.getAllPlayers().find((candidate) => candidate.id === entry.playerId);
    const newTeam = this.#teams.find((candidate) => candidate.id === entry.offerTeamId);
    if (!player || !newTeam) return { accepted: false, message: "Не удалось завершить переход ОСА." };

    const contract = this.#contracts.signRestrictedFreeAgentOfferSheet(
      player,
      newTeam.id,
      entry.offer,
      entry.season || this.#seasonState?.seasonLabel,
    );
    player.affiliation.acquiredDay = this.#calendar.currentDay;
    this.#resolveRestrictedRightsOffer(entry.id, "released");
    this.#seasonTransition.rebuildRosters(this.#teams, this.getAllPlayers());
    this.#refreshExpectedRoles(newTeam);
    if (this.activeTeam) this.#refreshExpectedRoles(this.activeTeam);
    this.#pushNotification({
      id: `notification-osa-release-${player.id}-${Date.now()}`,
      type: "offseason-departure",
      title: "Права ОСА",
      message: `${player.name} перешел в ${newTeam.name}: ${entry.offer.years} г. • ${formatSalaryMillions(entry.offer.salaryRub)} млн`,
      day: this.#calendar.currentDay,
      createdAt: new Date().toISOString(),
      playerId: player.id,
      read: false,
    });
    return { accepted: true, decision: "released", contract };
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
    if (this.#seasonState?.phase === "preseason" && this.#seasonState?.preseasonOpen) {
      return this.#queuePreseasonFreeAgentOffer(player, offer);
    }
    const result = this.#contracts.submitFreeAgentOffer(this.activeTeam, player, offer, this.#buildNegotiationContext(this.activeTeam));
    if (result?.decision === "accept") {
      player.affiliation.acquiredDay = this.#calendar.currentDay;
      this.activeTeam.reservePlayers.push(player);
      this.#freeAgents = dedupeFreeAgents(this.#freeAgents.filter((entry) => entry.id !== player.id));
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

  sendPlayerToJunior(playerId) {
    if (!this.activeTeam || !playerId || !this.#contracts.hasThreeWayContract(playerId, this.#seasonState?.seasonLabel || this.#calendar.seasonLabel)) return false;
    const team = this.activeTeam;
    let player = null;
    team.lines.forEach((line) => {
      line.players.forEach((entry, index) => {
        if (entry?.id === playerId) {
          player = entry;
          line.players[index] = null;
        }
      });
    });
    if (!player) {
      const reserveIndex = team.reservePlayers.findIndex((entry) => entry.id === playerId);
      if (reserveIndex >= 0) player = team.reservePlayers.splice(reserveIndex, 1)[0];
    }
    if (!player || team.juniorPlayers.some((entry) => entry.id === player.id)) return false;
    player.expectedLineIndex = null;
    team.juniorPlayers.push(player);
    this.#refreshExpectedRoles(team);
    return true;
  }

  promoteJuniorPlayer(playerId) {
    if (!this.activeTeam || !playerId) return false;
    const team = this.activeTeam;
    const juniorIndex = team.juniorPlayers.findIndex((entry) => entry.id === playerId);
    if (juniorIndex < 0) return false;
    const [player] = team.juniorPlayers.splice(juniorIndex, 1);
    team.reservePlayers.push(player);
    player.expectedLineIndex = null;
    this.#refreshExpectedRoles(team);
    return true;
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
    if (!(this.#seasonState?.phase === "preseason" && this.#seasonState?.preseasonOpen)) return false;
    if ((this.#seasonState?.restrictedRightsOffers || []).some((entry) => entry?.status === "pending" && entry.rightsTeamId === this.#activeTeamId)) return false;
    const dates = this.#seasonState?.preseasonDates || [];
    return (Number(this.#seasonState?.preseasonIndex) || 0) >= Math.max(0, dates.length - 1);
  }

  canAdvancePreseasonDay() {
    if (!(this.#seasonState?.phase === "preseason" && this.#seasonState?.preseasonOpen)) return false;
    const dates = this.#seasonState?.preseasonDates || [];
    return (Number(this.#seasonState?.preseasonIndex) || 0) < Math.max(0, dates.length - 1);
  }

  startSeason() {
    if (!this.canStartSeason()) return false;
    const preseasonDate = this.#seasonState?.preseasonDateIso || this.#calendar.currentDate;
    this.#resolvePreseasonFreeAgencyWindow({
      decisionIndex: Number(this.#seasonState?.preseasonIndex) || 0,
      decisionDate: preseasonDate,
    });
    this.#seasonTransition.ensureMinimumRosterDepth({
      teams: this.#teams,
      activeTeamId: this.#activeTeamId,
      allPlayers: this.getAllPlayers(),
      buildContext: (team) => this.#buildNegotiationContext(team),
      negotiationDate: preseasonDate,
      currentDay: this.#calendar.currentDay,
      pushNotification: (notification) => this.#pushNotification(notification),
    });
    this.#seasonTransition.rebuildRosters(this.#teams, this.getAllPlayers());
    this.#seasonState = {
      ...this.#seasonState,
      preseasonOpen: false,
      phase: "regular",
      preseasonOffers: [],
    };
    this.#syncSeasonReferenceDate();
    return true;
  }

  advancePreseasonDay() {
    if (!this.canAdvancePreseasonDay()) return false;
    const preseasonDates = this.#seasonState?.preseasonDates || [];
    const currentIndex = Number(this.#seasonState?.preseasonIndex) || 0;
    const nextIndex = Math.min(preseasonDates.length - 1, currentIndex + 1);
    const nextDate = getPreseasonDateAt(preseasonDates, nextIndex);

    this.#queueAiPreseasonFreeAgentOffers(currentIndex, nextDate);
    this.#resolvePreseasonFreeAgencyWindow({
      decisionIndex: nextIndex,
      decisionDate: nextDate,
    });

    this.#seasonState = {
      ...this.#seasonState,
      preseasonIndex: nextIndex,
      preseasonDateIso: nextDate || this.#seasonState?.preseasonDateIso,
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
    (transition.retiredPlayerIds || []).forEach((playerId) => this.#retiredPlayerIds.add(playerId));
    this.#freeAgents = dedupeFreeAgents(transition.freeAgents);
    this.#stats.importStats([]);
    this.#standings.importSnapshot([]);
    this.#lastMatch = null;
    this.#seasonState = transition.seasonState;
    this.#juniors.applyOffseasonDevelopment(this.#teams, this.#getEffectiveNegotiationDate());
    this.#juniors.ensureJuniorDepth({ teams: this.#teams, contracts: this.#contracts, seasonLabel: this.#seasonState.seasonLabel });
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
      retiredPlayerIds: [...this.#retiredPlayerIds],
    };
  }

  importState(saved) {
    if (!saved) return;
    this.#retiredPlayerIds = new Set(Array.isArray(saved.retiredPlayerIds) ? saved.retiredPlayerIds : []);
    this.#activeTeamId = saved.activeTeamId || null;
    if (saved.calendar) this.#calendar.importState(saved.calendar);
    else {
      this.#calendar.index = saved.calendarIndex || 0;
      if (saved.calendarResults) this.#calendar.importResults(saved.calendarResults);
    }
    if (saved.contracts) this.#contracts.importContracts(saved.contracts);
    if (saved.rosters) {
      this.#juniors.ensureSavedJuniorPlayers({
        teams: this.#teams,
        rosters: saved.rosters,
        contracts: this.#contracts,
        seasonLabel: this.#calendar.seasonLabel,
      });
    }
    let basePlayers = [...new Map([
      ...this.#teams.flatMap((team) => [...team.getRoster(), ...(team.juniorPlayers || [])]),
      ...this.#freeAgents,
    ].map((player) => [player.id, player])).values()];
    if (saved.rosters) {
      importSavedRosters({
        teams: this.#teams,
        rosters: saved.rosters,
        allPlayers: basePlayers,
        refreshExpectedRoles: (team) => this.#refreshExpectedRoles(team),
      });
      basePlayers = [...new Map([
        ...this.#teams.flatMap((team) => [...team.getRoster(), ...(team.juniorPlayers || [])]),
        ...this.#freeAgents,
      ].map((player) => [player.id, player])).values()];
    }
    restorePlayerSnapshots(basePlayers, saved.players);

    const activePlayers = basePlayers.filter((player) => !this.#retiredPlayerIds.has(player.id));
    this.#freeAgents = dedupeFreeAgents(activePlayers);
    this.#seasonTransition.rebuildRosters(this.#teams, activePlayers);
    if (saved.standings) this.#standings.importSnapshot(saved.standings);
    this.#calendar.ensurePlayoffs(this.getStandingsTable());
    this.#stats.importStats(saved.stats);
    this.#seasonHistory = Array.isArray(saved.seasonHistory) ? [...saved.seasonHistory] : [];
    this.#seasonState = normalizeSeasonState(saved.seasonState, this.#calendar.seasonLabel);
    this.#notifications = normalizeNotifications(saved.notifications, this.#calendar.currentDay);
    this.#juniors.ensureJuniorDepth({ teams: this.#teams, contracts: this.#contracts, seasonLabel: this.#seasonState.seasonLabel });
    this.#syncSeasonReferenceDate();
    this.#syncSeasonPhase();
  }

  applyFantasyDraft(assignmentsByTeamId) {
    this.#teams.forEach((team) => team.juniorPlayers?.splice?.(0, team.juniorPlayers.length));
    const { undraftedPlayers } = applyFantasyDraftAssignments({
      teams: this.#teams,
      allPlayers: [...new Map(this.getFantasyDraftPlayerPool().map((player) => [player.id, player])).values()],
      assignmentsByTeamId,
      contracts: this.#contracts,
      refreshExpectedRoles: (team) => this.#refreshExpectedRoles(team),
    });
    this.#freeAgents = dedupeFreeAgents(undraftedPlayers);
    this.#calendar.index = 0;
    this.#seasonState = {
      phase: "preseason",
      seasonLabel: this.#calendar.seasonLabel,
      previousSeasonLabel: null,
      preseasonOpen: false,
      preseasonDates: [],
      preseasonOffers: [],
      restrictedRightsOffers: [],
      preseasonIndex: 0,
    };
    this.#syncSeasonReferenceDate();
    this.#lastMatch = null;
    this.#stats.importStats([]);
    this.#standings.importSnapshot([]);
    this.#juniors.ensureJuniorDepth({ teams: this.#teams, contracts: this.#contracts, seasonLabel: this.#seasonState.seasonLabel });
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

    if (matches.length && ["regular", "playoffs"].includes(String(day?.phase || ""))) {
      this.#development.applyFreeAgentInactivity(this.getAvailableFreeAgents(), {
        phase: day.phase,
        opportunityCount: 1,
      });
    }

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

  #queuePreseasonFreeAgentOffer(player, offer) {
    const preview = this.#contracts.getFreeAgentPreview(this.activeTeam, player, offer, this.#buildNegotiationContext(this.activeTeam));
    const nextDecisionIndex = Math.min(
      (this.#seasonState?.preseasonDates || []).length - 1,
      (Number(this.#seasonState?.preseasonIndex) || 0) + 1,
    );
    const nextDecisionDate = getPreseasonNextDate(this.#seasonState?.preseasonDates || [], this.#seasonState?.preseasonIndex || 0);
    this.#seasonState = {
      ...this.#seasonState,
      preseasonOffers: upsertCompetitiveOffer(this.#seasonState?.preseasonOffers, {
        playerId: player.id,
        teamId: this.activeTeam.id,
        offer: { ...preview.offer },
        source: "user",
        createdAtDay: this.#calendar.currentDay,
        decisionIndex: nextDecisionIndex,
        submittedDateIso: this.#seasonState?.preseasonDateIso || this.#calendar.currentDate,
      }),
    };
    return {
      decision: "queued",
      preview,
      resolvesOn: nextDecisionDate,
    };
  }

  #queueAiPreseasonFreeAgentOffers(currentIndex, decisionDate) {
    const aiOffers = this.#aiRenewals.buildPreseasonFreeAgencyOffers({
      teams: this.#teams,
      activeTeamId: this.#activeTeamId,
      standingsTable: this.getStandingsTable(),
      freeAgents: this.getAvailableFreeAgents(),
      negotiationDate: this.#seasonState?.preseasonDateIso || this.#calendar.currentDate,
      currentDay: this.#calendar.currentDay,
      allPlayers: this.getAllPlayers(),
      buildContext: (team) => this.#buildNegotiationContext(team),
      existingOffers: this.#seasonState?.preseasonOffers || [],
    });
    if (!aiOffers.length) return;

    const decisionIndex = Math.min(
      (this.#seasonState?.preseasonDates || []).length - 1,
      currentIndex + 1,
    );
    let preseasonOffers = [...(this.#seasonState?.preseasonOffers || [])];
    aiOffers.forEach((entry) => {
      preseasonOffers = upsertCompetitiveOffer(preseasonOffers, {
        ...entry,
        decisionIndex,
        submittedDateIso: this.#seasonState?.preseasonDateIso || decisionDate,
      });
    });
    this.#seasonState = {
      ...this.#seasonState,
      preseasonOffers,
    };
  }

  #resolvePreseasonFreeAgencyWindow({ decisionIndex, decisionDate }) {
    const groupedOffers = collectResolvableOfferGroups(this.#seasonState?.preseasonOffers || [], decisionIndex);
    if (!groupedOffers.size) return;

    groupedOffers.forEach((offerEntries, playerId) => {
      const player = this.getAvailableFreeAgents().find((entry) => entry.id === playerId);
      if (!player) return;

      const previewByTeamId = new Map();
      offerEntries.forEach((entry) => {
        const team = this.#teams.find((candidate) => candidate.id === entry.teamId);
        if (!team) return;
        previewByTeamId.set(
          entry.teamId,
          this.#contracts.getFreeAgentPreview(team, player, entry.offer, {
            ...this.#buildNegotiationContext(team),
            currentDate: decisionDate,
            allPlayers: this.getAllPlayers(),
          }),
        );
      });

      const decision = buildCompetitiveOfferDecision({
        player,
        offerEntries,
        previewByTeamId,
      });

      if (decision.decision === "accept" && decision.winningOffer) {
        this.#finalizeCompetitiveFreeAgentSigning(player, decision.winningOffer, decisionDate, offerEntries);
        return;
      }

      offerEntries
        .filter((entry) => entry.teamId === this.#activeTeamId)
        .forEach(() => {
          this.#pushNotification({
            id: `notification-fa-reject-${player.id}-${decisionIndex}-${Math.random().toString(36).slice(2, 8)}`,
            type: "free-agent-market",
            title: "Свободные агенты",
            message: `${player.name} отклонил предложения на этом окне рынка`,
            day: this.#calendar.currentDay,
            createdAt: new Date().toISOString(),
            playerId: player.id,
            read: false,
          });
        });
    });

    this.#seasonState = {
      ...this.#seasonState,
      preseasonOffers: (this.#seasonState?.preseasonOffers || []).filter(
        (entry) => Number(entry?.decisionIndex) !== Number(decisionIndex),
      ),
    };
  }

  #finalizeCompetitiveFreeAgentSigning(player, winningOffer, decisionDate, competingOffers) {
    const team = this.#teams.find((entry) => entry.id === winningOffer.teamId);
    if (!team) return;

    const newContracts = this.#contracts.finalizeFreeAgentSigning(team, player, winningOffer.offer, { currentDate: decisionDate });
    player.affiliation.acquiredDay = this.#calendar.currentDay;
    if (!team.getRoster().some((entry) => entry?.id === player.id)) {
      team.reservePlayers.push(player);
    }
    this.#freeAgents = dedupeFreeAgents(this.#freeAgents.filter((entry) => entry.id !== player.id));
    this.#refreshExpectedRoles(team);

    const signedContract = newContracts?.[newContracts.length - 1] || null;
    const seasonEnd = signedContract?.season ? Number(String(signedContract.season).split("/")[1]) || "" : "";
    const salaryLabel = formatSalaryMillions(winningOffer.offer.salaryRub);

    if (winningOffer.teamId !== this.#activeTeamId) {
      this.#pushNotification({
        id: `notification-fa-win-ai-${player.id}-${Math.random().toString(36).slice(2, 8)}`,
        type: "ai-signing",
        title: "Рынок свободных агентов",
        message: `${team.name} подписал ${player.name} ${player.ovr} до ${seasonEnd} с зарплатой ${salaryLabel} млн`,
        day: this.#calendar.currentDay,
        createdAt: new Date().toISOString(),
        playerId: player.id,
        read: false,
      });
    }

    (competingOffers || [])
      .filter((entry) => entry.teamId === this.#activeTeamId)
      .forEach(() => {
        const message = winningOffer.teamId === this.#activeTeamId
          ? `${player.name} принял ваше предложение: ${winningOffer.offer.years} г. • ${salaryLabel} млн`
          : `${player.name} выбрал ${team.name} вместо вашего предложения`;
        this.#pushNotification({
          id: `notification-fa-user-result-${player.id}-${Math.random().toString(36).slice(2, 8)}`,
          type: winningOffer.teamId === this.#activeTeamId ? "user-signing" : "free-agent-market",
          title: "Свободные агенты",
          message,
          day: this.#calendar.currentDay,
          createdAt: new Date().toISOString(),
          playerId: player.id,
          read: false,
        });
      });
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

  #resolveRestrictedRightsOffer(offerId, status) {
    this.#seasonState = {
      ...this.#seasonState,
      restrictedRightsOffers: (this.#seasonState?.restrictedRightsOffers || []).map((entry) =>
        entry.id === offerId ? { ...entry, status } : entry,
      ),
    };
  }

  #roundSalaryRub(value) {
    return Math.max(500000, Math.round((Number(value) || 0) / 500000) * 500000);
  }
}
