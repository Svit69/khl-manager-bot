import { MatchSimulator } from "../sim/MatchSimulator.js";
import { StatsTracker } from "../stats/StatsTracker.js";
import { AiRenewalService } from "../contracts/AiRenewalService.js";
import { ContractService } from "../contracts/ContractService.js";
import { ContractType } from "../contracts/ContractType.js";
import { getFallbackMarketSalaryRub } from "../contracts/FallbackMarketSalary.js";
import { SalaryCapService } from "../contracts/SalaryCapService.js";
import { SalaryCapComplianceService } from "../contracts/SalaryCapComplianceService.js";
import { buildTradeSalaryCapPreview } from "../contracts/TradeSalaryCapPreview.js";
import { AiCoachService } from "../coaches/AiCoachService.js";
import { CoachContractService } from "../coaches/CoachContractService.js";
import { CoachDevelopmentService } from "../coaches/CoachDevelopmentService.js";
import { CoachFitService } from "../coaches/CoachFitService.js";
import { HeadCoach } from "../models/HeadCoach.js";
import { StandingsTracker } from "../stats/StandingsTracker.js";
import { calculateAge, formatContractEndDate, formatNextSeason, parseSeasonEnd, setSeasonReferenceDate } from "../contracts/SeasonUtils.js";
import { PlayerDevelopmentService } from "../progression/PlayerDevelopmentService.js";
import { TradeService } from "../trade/TradeService.js";
import {
  buildCompetitiveOfferDecision,
  collectResolvableOfferGroups,
  formatSalaryMillions,
  upsertCompetitiveOffer,
} from "../season/OffseasonFreeAgencyMarket.js";
import { getPreseasonDateAt, getPreseasonNextDate } from "../season/PreseasonSchedule.js";
import { TEAM_ROSTER_TARGET_SIZE } from "../season/RosterTargets.js";
import { SeasonTransitionService } from "../season/SeasonTransitionService.js";
import { ExternalPlayerService, getExternalStatusLabel, getReturnInterestLabel } from "../season/ExternalPlayerService.js";
import { ExternalPlayerDevelopmentService } from "../season/ExternalPlayerDevelopmentService.js";
import { ExternalRightsOfferService } from "../season/ExternalRightsOfferService.js";
import { ExternalRightsInterestService } from "../season/ExternalRightsInterestService.js";
import { AiExternalRightsService } from "../season/AiExternalRightsService.js";
import { KhlProspectDepartureService } from "../season/KhlProspectDepartureService.js";
import { JuniorTeamService } from "../season/JuniorTeamService.js";
import { JuniorLeagueService } from "../season/JuniorLeagueService.js";
import { JuniorDepartureRiskService } from "../season/JuniorDepartureRiskService.js";
import { getJuniorIneligibilityReason, getJuniorSeasonAge } from "../season/JuniorEligibility.js";
import { getJuniorPracticeProfile, getScoutedPotential } from "../season/JuniorScouting.js";
import { getUfaStatus } from "../contracts/RenewalScoring.js";
import {
  createDevelopmentNotification,
  markNotificationsRead,
  normalizeNotifications,
  sortUnreadNotifications,
} from "./AppStateNotifications.js";
import { applyMatchFatigue, applyMatchMood, applyMatchPlayerStats } from "./AppStateMatchEffects.js";
import {
  createMissingSavedPlayers,
  createPlayerSnapshots,
  normalizeSeasonState,
  restorePlayerSnapshots,
} from "./AppStatePersistence.js";
import {
  collectSavedExternalPlayerIds,
  collectSavedExternalPlayerSnapshots,
  excludeExternalRightsPlayersFromActivePool,
  mergeExternalRightsPlayers,
  shouldRestoreExternalRightsPlayer,
} from "./AppStateExternalImport.js";
import {
  applyFantasyDraftAssignments,
  createRosterSnapshots,
  importSavedRosters,
} from "./AppStateRoster.js";
import { getPlayerPhotoUrl } from "../utils/PlayerPhoto.js";
import { lineupScoreForPosition } from "../utils/positionFit.js";

const dedupeFreeAgents = (players = []) => {
  const uniqueById = new Map();
  (players || []).forEach((player) => {
    if (!player?.id || player.affiliation?.teamId) return;
    uniqueById.set(player.id, player);
  });
  return [...uniqueById.values()];
};

const AI_ROTATION_MAX_ROSTER_SIZE = TEAM_ROSTER_TARGET_SIZE + 2;
const AI_RESTED_RESERVE_THRESHOLD = 35;
const AI_ROTATION_FATIGUE_THRESHOLD = 55;
const AI_DEPTH_SIGNING_FATIGUE_THRESHOLD = 58;

const normalizeTransferLedger = (items = []) =>
  (Array.isArray(items) ? items : [])
    .filter((entry) => entry?.id && entry?.teamId && entry?.playerId)
    .map((entry) => ({ ...entry }));
const normalizeGameSettings = (settings = {}) => ({
  restrictedFreeAgencyEnabled: settings.restrictedFreeAgencyEnabled !== false,
  salaryCapEnabled: settings.salaryCapEnabled !== false,
  salaryCapBaseRub: Math.max(500000000, Number(settings.salaryCapBaseRub) || 900000000),
  salaryCapGrowthRub: [0, 50000000, 100000000].includes(Number(settings.salaryCapGrowthRub)) ? Number(settings.salaryCapGrowthRub) : 50000000,
  coachesEnabled: settings.coachesEnabled !== false,
});
const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const getNorthAmericaWarningDate = (seasonLabel) => new Date(Date.UTC(parseSeasonEnd(seasonLabel), 2, 15));
const createJuniorGenerationSeed = () => {
  const random = globalThis.crypto?.getRandomValues ? globalThis.crypto.getRandomValues(new Uint32Array(2)).join("-") : Math.random().toString(36).slice(2);
  return `junior-seed-${Date.now()}-${random}`;
};

export class AppState {
  #teams;
  #calendar;
  #freeAgents;
  #externalPlayers;
  #stats = new StatsTracker();
  #standings = new StandingsTracker();
  #sim = new MatchSimulator();
  #contracts;
  #salaryCap = new SalaryCapService();
  #salaryCapCompliance = new SalaryCapComplianceService();
  #coachFit = new CoachFitService();
  #coachContracts = new CoachContractService();
  #coachDevelopment = new CoachDevelopmentService();
  #aiCoaches = new AiCoachService();
  #development = new PlayerDevelopmentService();
  #juniors = new JuniorTeamService();
  #trade;
  #aiRenewals;
  #seasonTransition;
  #externalPlayerService = new ExternalPlayerService();
  #externalDevelopment = new ExternalPlayerDevelopmentService();
  #externalRightsOffers = new ExternalRightsOfferService();
  #externalRightsInterest = new ExternalRightsInterestService();
  #aiExternalRights = new AiExternalRightsService();
  #prospectDepartures = new KhlProspectDepartureService();
  #juniorLeague = new JuniorLeagueService();
  #juniorDepartures = new JuniorDepartureRiskService();
  #lastMatch = null;
  #activeTeamId = null;
  #notifications = [];
  #seasonHistory = [];
  #seasonState;
  #gameSettings = normalizeGameSettings();
  #retiredPlayerIds = new Set();
  #transferLedger = [];
  #coaches;
  #juniorGenerationSeed = createJuniorGenerationSeed();

  constructor(teams, calendar, contracts, freeAgents = [], externalPlayers = [], coaches = []) {
    this.#teams = teams;
    this.#calendar = calendar;
    this.#freeAgents = dedupeFreeAgents(freeAgents);
    this.#externalPlayers = [...externalPlayers];
    this.#coaches = [...coaches];
    this.#contracts = new ContractService(contracts);
    this.#juniors.ensureJuniorDepth({ teams: this.#teams, contracts: this.#contracts, seasonLabel: this.#calendar.seasonLabel, generationSeed: this.#juniorGenerationSeed });
    this.#aiRenewals = new AiRenewalService(this.#contracts, {
      canSubmitOffer: (team, player, offer, context, mode) =>
        this.#canSubmitContractOffer(team, player, offer, mode, context).allowed,
    });
    this.#seasonTransition = new SeasonTransitionService(this.#contracts, this.#aiRenewals, this.#development);
    this.#trade = new TradeService({
      getPlayerContracts: (playerId) => this.#contracts.getContractsForPlayer(playerId),
      reassignPlayerContracts: (playerId, teamId) => this.#contracts.reassignPlayerContracts(playerId, teamId),
      getCurrentDay: () => this.#calendar.currentDay,
      getSeasonLabel: () => this.#seasonState?.seasonLabel || this.#calendar.seasonLabel,
    });
    this.#seasonState = {
      phase: "preseason",
      seasonLabel: this.#calendar.seasonLabel,
      previousSeasonLabel: null,
      preseasonDates: [],
      preseasonOffers: [],
      externalRightsOffers: [],
      restrictedRightsOffers: [],
      offerSheetCompensations: [],
      northAmericaWarningSeason: null,
      preseasonIndex: 0,
    };
    this.#transferLedger = [];
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
  get gameSettings() { return { ...this.#gameSettings }; }
  getCoachByTeamId(teamId) { return this.#coaches.find((coach) => coach.teamId === teamId) || null; }
  getFreeCoaches() { return this.#coaches.filter((coach) => !coach.teamId).sort((left, right) => right.overall - left.overall); }
  getCoachContractOffer(coachId, factor = 1, years = 2) {
    const coach = this.#coaches.find((entry) => entry.id === coachId) || null;
    return coach ? this.#coachContracts.buildOffer(coach, factor, years) : null;
  }
  renewActiveTeamCoach(years = 1, factor = 1) {
    const coach = this.getCoachByTeamId(this.#activeTeamId);
    if (!coach) return { accepted: false, message: "Главный тренер не назначен." };
    const offer = this.#coachContracts.buildOffer(coach, factor, years);
    const decision = this.#coachContracts.decide(coach, offer);
    if (!decision.accepted) return { accepted: false, message: `${coach.name} отклонил предложение. Шанс был ${decision.chance}%.` };
    const contractUntil = this.#getCoachContractUntil(coach, years);
    coach.assignToTeam(this.#activeTeamId, contractUntil, offer.salaryRub);
    return { accepted: true, message: `${coach.name}: контракт до ${this.#formatCoachContract(contractUntil)}, ${this.#formatCoachSalary(offer.salaryRub)}.` };
  }
  terminateActiveTeamCoach() {
    const coach = this.getCoachByTeamId(this.#activeTeamId);
    if (!coach) return { accepted: false, message: "Главный тренер уже отсутствует." };
    coach.releaseToMarket();
    return { accepted: true, message: `${coach.name} выведен на рынок свободных тренеров.` };
  }
  signFreeCoach(coachId, years = 2, factor = 1) {
    const coach = this.#coaches.find((entry) => entry.id === coachId && !entry.teamId);
    if (!this.#activeTeamId || !coach) return { accepted: false, message: "Тренер недоступен для подписания." };
    const offer = this.#coachContracts.buildOffer(coach, factor, years);
    const decision = this.#coachContracts.decide(coach, offer);
    if (!decision.accepted) return { accepted: false, message: `${coach.name} просит выше зарплату. Шанс был ${decision.chance}%.` };
    const current = this.getCoachByTeamId(this.#activeTeamId);
    if (current) current.releaseToMarket();
    const contractUntil = this.#getCoachContractUntil(null, years);
    coach.assignToTeam(this.#activeTeamId, contractUntil, offer.salaryRub);
    return { accepted: true, message: `${coach.name} подписан до ${this.#formatCoachContract(contractUntil)}, ${this.#formatCoachSalary(offer.salaryRub)}.` };
  }
  getSalaryCapSummary(teamId = this.#activeTeamId, seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel) {
    if (!this.#gameSettings.salaryCapEnabled || !teamId) return null;
    const contracts = this.#exportContractRows();
    const payrollRub = contracts
      .filter((contract) => contract.teamId === teamId && contract.season === seasonLabel)
      .reduce((sum, contract) => sum + (Number(contract.salaryRub) || 0), 0);
    const capRub = this.#getSalaryCapRub(seasonLabel);
    return { enabled: true, seasonLabel, capRub, payrollRub, remainingRub: Math.max(0, capRub - payrollRub) };
  }

  getSalaryCapComplianceView(selectedPlayerIds = []) {
    if (!this.#gameSettings.salaryCapEnabled || !this.activeTeam) return null;
    const seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
    const selectedIds = new Set(selectedPlayerIds || []);
    return this.#salaryCapCompliance.buildView(
      this.activeTeam,
      this.#exportContractRows(),
      seasonLabel,
      this.#getSalaryCapRub(seasonLabel),
      selectedIds,
    );
  }

  needsSalaryCapCompliance() {
    const view = this.getSalaryCapComplianceView();
    return !!view && !view.isCompliant;
  }

  applySalaryCapComplianceReleases(playerIds = []) {
    if (!this.activeTeam || !this.#gameSettings.salaryCapEnabled) return false;
    const selectedIds = [...new Set(playerIds || [])];
    const view = this.getSalaryCapComplianceView(selectedIds);
    if (!view?.isCompliant) return false;
    selectedIds.forEach((playerId) => this.#releasePlayerToFreeAgency(playerId, this.#activeTeamId, "salaryCapRelease"));
    this.#processAiSalaryCapCompliance();
    this.#fillRostersToTargetSize();
    this.#seasonTransition.rebuildRosters(this.#teams, this.getAllPlayers());
    return true;
  }

  getTradeSalaryCapPreview(opponentId, givePlayerIds = [], receivePlayerIds = []) {
    if (!this.#gameSettings.salaryCapEnabled || !this.#activeTeamId || !opponentId) return null;
    const seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
    return buildTradeSalaryCapPreview({
      contracts: this.#exportContractRows(),
      userTeamId: this.#activeTeamId,
      aiTeamId: opponentId,
      givePlayerIds,
      receivePlayerIds,
      seasonLabel,
      getCapRub: (season) => this.#getSalaryCapRub(season),
    });
  }

  getTradePlayerSalaryRub(playerId, seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel) {
    if (!playerId || !this.#gameSettings.salaryCapEnabled) return null;
    return this.#getPlayerSalaryForSeason(playerId, seasonLabel);
  }
  getSeasonState() {
    return {
      ...this.#seasonState,
      canAdvance: this.canAdvanceToNextSeason(),
      canAdvancePreseason: this.canAdvancePreseasonDay(),
      canStartSeason: this.canStartSeason(),
      latestArchive: this.#seasonHistory[0] || null,
    };
  }

  getActiveTeamCoachView() {
    if (!this.#gameSettings.coachesEnabled || !this.#activeTeamId) return null;
    const coach = this.getCoachByTeamId(this.#activeTeamId);
    return {
      coach,
      team: this.activeTeam,
      fit: this.#getCoachFitForTeam(this.activeTeam),
      coachOffer: coach ? this.#coachContracts.buildOffer(coach, 1, 2) : null,
      freeCoaches: this.getFreeCoaches().map((entry) => ({ coach: entry, offer: this.#coachContracts.buildOffer(entry, 1.05, 2) })),
    };
  }

  #getCoachFitForTeam(team, context = {}) {
    if (!this.#gameSettings.coachesEnabled || !team?.id) return null;
    return this.#coachFit.evaluateTeam(this.getCoachByTeamId(team.id), team, context);
  }

  #buildCoachEffectsByTeamId(phase = "regular") {
    if (!this.#gameSettings.coachesEnabled) return {};
    return Object.fromEntries(this.#teams.map((team) => {
      const fit = this.#getCoachFitForTeam(team, { isPlayoff: phase === "playoffs" });
      return [team.id, fit?.effect || null];
    }).filter(([, effect]) => effect));
  }

  #getCoachContractUntil(coach, years = 1) {
    const currentSeasonEnd = parseSeasonEnd(this.#seasonState?.seasonLabel || this.#calendar.seasonLabel);
    const currentContractEnd = Number(String(coach?.contractUntil || "").slice(0, 4)) || currentSeasonEnd;
    const endYear = Math.max(currentSeasonEnd, currentContractEnd) + Math.max(1, Number(years) || 1);
    return `${endYear}-05-31`;
  }

  #formatCoachContract(contractUntil) {
    return contractUntil ? new Date(contractUntil).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" }) : "без контракта";
  }

  #formatCoachSalary(salaryRub) {
    return `${Math.round((Number(salaryRub) || 0) / 1000000)} млн`;
  }

  #getSalaryCapConfig() {
    return { custom: true, baseRub: this.#gameSettings.salaryCapBaseRub, growthRub: this.#gameSettings.salaryCapGrowthRub };
  }

  #getDraftSalaryCapConfig() {
    return this.#getSalaryCapConfig();
  }

  #getSalaryCapRub(seasonLabel) {
    return this.#salaryCap.getCapRub(seasonLabel, this.#getSalaryCapConfig());
  }

  #processCoachOffseason(transition) {
    if (!this.#gameSettings.coachesEnabled) return;
    const seasonDate = this.#getEffectiveNegotiationDate();
    this.#coachDevelopment.applySeason(this.#coaches, this.#teams, transition?.archive?.standings || [], seasonDate)
      .forEach((event) => this.#pushCoachNotification("Развитие тренера", `${event.coach.name}: ${event.before} → ${event.after}`));
    const seasonEnd = parseSeasonEnd(transition?.seasonState?.previousSeasonLabel || this.#calendar.seasonLabel);
    this.#coaches.filter((coach) => coach.teamId && Number(String(coach.contractUntil || "").slice(0, 4)) <= seasonEnd)
      .forEach((coach) => { const teamName = this.#getTeamName(coach.teamId); coach.releaseToMarket(); this.#pushCoachNotification("Тренерский рынок", `${coach.name} покинул ${teamName}: контракт завершен.`); });
    this.#processAiCoachChanges(true);
  }

  #processAiCoachChanges(forceVacancies = false) {
    if (!this.#gameSettings.coachesEnabled) return;
    this.#aiCoaches.process({ teams: this.#teams, coaches: this.#coaches, standings: this.getStandingsTable(), activeTeamId: this.#activeTeamId, seasonLabel: this.#seasonState?.seasonLabel, day: this.#calendar.currentDay, contractService: this.#coachContracts })
      .filter((entry) => forceVacancies || entry.poor || !entry.oldCoach)
      .forEach((entry) => this.#pushCoachNotification("Тренерская перестановка", `${entry.team.name}: ${entry.oldCoach?.name || "вакансия"} → ${entry.newCoach.name}`));
  }

  #pushCoachNotification(title, message) {
    this.#pushNotification({ id: `notification-coach-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: "coach", title, message, day: this.#calendar.currentDay, createdAt: new Date().toISOString(), read: false });
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

  updateGameSettings(settings) {
    if (this.#activeTeamId) return;
    this.#gameSettings = normalizeGameSettings({ ...this.#gameSettings, ...(settings || {}) });
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

  getAllKnownPlayers() {
    return [...new Map([...this.getAllPlayers(), ...this.#externalPlayers].map((player) => [player.id, player])).values()];
  }

  getFantasyDraftPlayerPool() {
    return [...this.#teams.flatMap((team) => team.getRoster()), ...this.#freeAgents].filter(
      (player) => !this.#retiredPlayerIds.has(player.id),
    );
  }

  getFantasyDraftSalaryCapOptions() {
    const seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
    const contracts = this.#exportContractRows();
    const draftCapRub = this.#salaryCap.getCapRub(seasonLabel, this.#getDraftSalaryCapConfig());
    const salaryRows = this.getFantasyDraftPlayerPool().map((player) => {
      const salaryRub = this.#getPlayerSalaryForSeason(player.id, seasonLabel, contracts);
      return [player.id, salaryRub];
    });
    return {
      enabled: this.#gameSettings.salaryCapEnabled,
      seasonLabel,
      capRub: draftCapRub,
      salaryByPlayerId: Object.fromEntries(salaryRows),
    };
  }

  getActiveTeamContractRows() {
    return this.activeTeam ? this.#contracts.getTeamContractRows(this.activeTeam, this.#getEffectiveNegotiationDate()) : [];
  }

  getActiveTeamRestrictedRightsRows() {
    if (!this.#activeTeamId || !this.#gameSettings.restrictedFreeAgencyEnabled) return [];
    const playersById = new Map(this.getAllKnownPlayers().map((player) => [player.id, player]));
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
          sourceLabel: entry.source === "external" ? `${entry.fromLeague || "НХЛ / АХЛ"} • возвращение в КХЛ` : null,
          compensation: entry.compensation || null,
          compensationLabel: entry.compensation?.label || "Без компенсации",
        };
      })
      .filter(Boolean);
  }

  getExternalPlayerRows() {
    if (!this.#gameSettings.restrictedFreeAgencyEnabled) return [];
    const teamsById = new Map(this.#teams.map((team) => [team.id, team]));
    const seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
    return this.#externalPlayers
      .filter((player) => player.externalCareer?.rightsTeamId === this.#activeTeamId)
      .map((player) => {
        const career = player.externalCareer || {};
        const rightsTeam = teamsById.get(career.rightsTeamId) || null;
        const interest = this.#externalRightsInterest.buildProfile(player, {
          seasonLabel,
          seasonDate: this.#getEffectiveNegotiationDate(),
          rightsTeam,
        });
        const offerWindow = this.#externalRightsInterest.buildOfferWindow(player, seasonLabel);
        return {
          playerId: player.id,
          displayName: player.name,
          photoUrl: getPlayerPhotoUrl(player),
          position: player.identity?.primaryPosition || "",
          age: calculateAge(player.identity?.birthDate, this.#getEffectiveNegotiationDate()),
          ovr: player.ovr,
          league: career.league || "НХЛ / АХЛ",
          statusLabel: getExternalStatusLabel(career.status),
          contractUntil: career.contractUntil || null,
          rightsTeamName: rightsTeam?.name || "Прав в КХЛ нет",
          isActiveTeamRights: Boolean(rightsTeam && rightsTeam.id === this.#activeTeamId),
          returnInterestLabel: interest.label || getReturnInterestLabel(career.returnInterest),
          returnInterestScore: interest.score,
          returnInterestReasons: interest.reasons,
          availableToKhl: Boolean(career.availableToKhl),
          offerWindow,
        };
      })
      .sort((left, right) =>
        Number(right.isActiveTeamRights) - Number(left.isActiveTeamRights) ||
        Number(right.availableToKhl) - Number(left.availableToKhl) ||
        (right.ovr - left.ovr) ||
        left.displayName.localeCompare(right.displayName, "ru"),
      );
  }

  getExternalRightsPlayers(teamId) {
    if (!teamId || !this.#gameSettings.restrictedFreeAgencyEnabled) return [];
    const pendingPlayerIds = new Set(
      (this.#seasonState?.restrictedRightsOffers || [])
        .filter((entry) => entry?.status === "pending")
        .map((entry) => entry.playerId),
    );
    return this.#externalPlayers
      .filter((player) => player.externalCareer?.rightsTeamId === teamId)
      .filter((player) => !player.externalCareer?.availableToKhl && !pendingPlayerIds.has(player.id))
      .sort((left, right) => (right.ovr - left.ovr) || left.name.localeCompare(right.name, "ru"));
  }

  getTeamStatisticsRows(teamId = this.#activeTeamId, sortBy = "points") {
    const team = this.#teams.find((entry) => entry.id === teamId) || null;
    return team ? this.#contracts.getTeamStatisticsRows(team, this.#buildNegotiationContext(team), sortBy) : [];
  }

  getTeamTransferView(teamId = this.#activeTeamId) {
    const selectedTeam = this.#teams.find((entry) => entry.id === teamId) || this.activeTeam || this.#teams[0] || null;
    const selectedTeamId = selectedTeam?.id || teamId || "";
    const rows = this.#transferLedger
      .filter((entry) => entry.teamId === selectedTeamId && entry.seasonLabel === (this.#seasonState?.seasonLabel || this.#calendar.seasonLabel))
      .map((entry) => this.#enrichTransferEntry(entry))
      .sort((left, right) => (Number(right.day) || 0) - (Number(left.day) || 0) || right.createdAt.localeCompare(left.createdAt));
    return {
      teams: this.#teams,
      selectedTeamId,
      selectedTeam,
      seasonLabel: this.#seasonState?.seasonLabel || this.#calendar.seasonLabel,
      signings: rows.filter((entry) => entry.type === "in"),
      departures: rows.filter((entry) => entry.type === "out"),
    };
  }

  getActiveTeamStatisticsRows(sortBy = "points") {
    return this.getTeamStatisticsRows(this.#activeTeamId, sortBy);
  }

  getActiveTeamFreeAgentRows() {
    const rows = this.#contracts.getFreeAgentRows(this.getAvailableFreeAgents());
    if (this.#gameSettings.restrictedFreeAgencyEnabled) return rows;
    return rows.map((row) => ({ ...row, freeAgentStatus: "НСА" }));
  }

  getSeasonContractDecisionRows(offersByPlayerId = {}) {
    const team = this.activeTeam;
    if (!team) return [];
    const seasonLabel = this.#calendar.seasonLabel;
    const context = this.#buildNegotiationContext(team);
    const players = [
      ...team.getRoster().map((player) => ({ player, location: "main" })),
      ...(team.juniorPlayers || []).map((player) => ({ player, location: "junior" })),
    ];

    return players
      .map(({ player, location }) => {
        const contracts = this.#contracts.getContractsForPlayer(player.id);
        const currentContract = contracts.find((contract) => contract.season === seasonLabel) || null;
        if (!currentContract) return null;
        const latestContract = contracts[contracts.length - 1] || currentContract;
        const hasFutureContract = parseSeasonEnd(latestContract.season) > parseSeasonEnd(seasonLabel);
        const age = calculateAge(player.identity?.birthDate, this.#getEffectiveNegotiationDate());
        const ufaStatus = this.#gameSettings.restrictedFreeAgencyEnabled ? getUfaStatus(age, player.career?.khlGamesPlayed || 0) : "NSA";
        const preview = hasFutureContract
          ? null
          : this.#contracts.getRenewalPreview(team, player, offersByPlayerId[player.id] || null, context);
        const naDeparture = !hasFutureContract
          ? this.#prospectDepartures.evaluate(player, { seasonLabel, seasonDate: this.#getEffectiveNegotiationDate() })
          : null;
        return {
          rowType: "khl",
          rowKey: `khl:${player.id}`,
          playerId: player.id,
          displayName: player.name,
          position: player.identity?.primaryPosition || "",
          age,
          ovr: player.currentOvr ?? player.ovr,
          photoUrl: getPlayerPhotoUrl(player),
          khlGamesPlayed: player.career?.khlGamesPlayed || 0,
          ufaStatus,
          location,
          salaryRub: currentContract.salaryRub || 0,
          contractType: this.#contracts.getContractTypeLabel(currentContract.type),
          contractEndDate: formatContractEndDate(currentContract.season),
          seasonStats: {
            games: player.seasonStats?.games || 0,
            goals: player.seasonStats?.goals || 0,
            assists: player.seasonStats?.assists || 0,
            points: player.seasonStats?.points || 0,
            penaltyMinutes: player.seasonStats?.penaltyMinutes || 0,
          },
          hasFutureContract,
          preview: naDeparture ? null : preview,
          isRenewalLocked: Boolean(naDeparture),
          renewalLockReason: naDeparture ? `Игрок уезжает в ${naDeparture.league}. Права остаются у клуба.` : null,
          externalDeparture: naDeparture,
        };
      })
      .filter(Boolean)
      .sort((left, right) =>
        Number(left.hasFutureContract) - Number(right.hasFutureContract) ||
        (right.ovr - left.ovr) ||
        left.displayName.localeCompare(right.displayName, "ru"),
      );
  }

  getSeasonExternalRightsDecisionRows(offersByPlayerId = {}) {
    if (!this.activeTeam || !this.#gameSettings.restrictedFreeAgencyEnabled) return [];
    const seasonLabel = this.#calendar.seasonLabel;
    const context = this.#buildNegotiationContext(this.activeTeam);
    return this.#externalPlayers
      .filter((player) => player.externalCareer?.rightsTeamId === this.#activeTeamId)
      .filter((player) => !this.#hasPendingExternalRightsOffer(player.id))
      .map((player) => {
        const offerWindow = this.#externalRightsInterest.buildOfferWindow(player, seasonLabel);
        if (!offerWindow.canOffer) return null;
        const preview = this.#contracts.getFreeAgentPreview(this.activeTeam, player, offersByPlayerId[player.id] || null, context);
        return {
          rowType: "external",
          rowKey: `external:${player.id}`,
          playerId: player.id,
          displayName: player.name,
          position: player.identity?.primaryPosition || "",
          age: calculateAge(player.identity?.birthDate, this.#getEffectiveNegotiationDate()),
          ovr: player.currentOvr ?? player.ovr,
          photoUrl: getPlayerPhotoUrl(player),
          khlGamesPlayed: player.career?.khlGamesPlayed || 0,
          ufaStatus: "EXT",
          location: player.externalCareer?.league || "НХЛ / АХЛ",
          salaryRub: 0,
          contractType: "Права",
          contractEndDate: player.externalCareer?.contractEndDate || formatContractEndDate(player.externalCareer?.contractUntil),
          seasonStats: {},
          hasFutureContract: false,
          preview,
          offerWindow,
        };
      })
      .filter(Boolean)
      .sort((left, right) => (right.ovr - left.ovr) || left.displayName.localeCompare(right.displayName, "ru"));
  }

  getActiveTeamJuniorView() {
    if (!this.activeTeam) return null;
    const seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
    const hasMainContract = (player) => {
      const nextSeason = `${parseSeasonEnd(seasonLabel)}/${parseSeasonEnd(seasonLabel) + 1}`;
      const contract = this.#contracts.getContractForSeason(player.id, nextSeason);
      return Boolean(contract && contract.type !== ContractType.THREE_WAY);
    };
    const enrichJunior = (player) => {
      player.juniorSeasonAge = getJuniorSeasonAge(player, seasonLabel);
      const nextSeasonAge = getJuniorSeasonAge(player, `${parseSeasonEnd(seasonLabel)}/${parseSeasonEnd(seasonLabel) + 1}`);
      const mainContract = this.#contracts.getContractForSeason(player.id, `${parseSeasonEnd(seasonLabel)}/${parseSeasonEnd(seasonLabel) + 1}`);
      return {
        player,
        age: player.juniorSeasonAge,
        nextSeasonAge,
        isGraduating: nextSeasonAge > 20,
        hasMainContract: Boolean(mainContract && mainContract.type !== ContractType.THREE_WAY),
        mainContract,
        practice: getJuniorPracticeProfile(player),
        scoutedPotential: getScoutedPotential(player, seasonLabel),
      };
    };
    const juniorEntries = [...(this.activeTeam.juniorPlayers || [])]
      .sort((left, right) => (right.ovr - left.ovr) || left.name.localeCompare(right.name, "ru"))
      .map(enrichJunior);
    const eligibleMainPlayers = this.activeTeam.getRoster()
      .map((player) => {
        player.juniorSeasonAge = getJuniorSeasonAge(player, seasonLabel);
        const hasThreeWayContract = this.#contracts.hasThreeWayContract(player.id, seasonLabel);
        const reason = getJuniorIneligibilityReason({ player, seasonLabel, hasThreeWayContract });
        return {
          player,
          canSend: !reason,
          reason,
          practice: getJuniorPracticeProfile(player),
          scoutedPotential: getScoutedPotential(player, seasonLabel),
        };
      })
      .filter((entry) => entry.canSend);
    const graduationClass = juniorEntries.filter((entry) => entry.isGraduating);
    const league = this.#juniorLeague.buildSeasonView(this.#teams, seasonLabel);
    const activeLeagueRow = league.rows.find((row) => row.teamId === this.#activeTeamId) || null;
    const departureRisks = this.#juniorDepartures.buildRiskPreview({
      teams: [this.activeTeam],
      seasonLabel,
      hasMainContract,
    }).slice(0, 5);
    return {
      juniorTeam: this.activeTeam.juniorTeam,
      seasonLabel,
      players: juniorEntries,
      graduationClass,
      mainPlayers: eligibleMainPlayers,
      targetSize: 22,
      league,
      activeLeagueRow,
      topScorers: league.scorers.filter((row) => row.teamId === this.#activeTeamId).slice(0, 5),
      departureRisks,
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
    return this.activeTeam && opponent
      ? this.#trade.evaluateTrade(this.activeTeam, opponent, givePlayerIds, receivePlayerIds, {
        userRightsPlayers: this.getExternalRightsPlayers(this.#activeTeamId),
        aiRightsPlayers: this.getExternalRightsPlayers(opponent.id),
      })
      : null;
  }

  submitTradeWithTeam(teamId, givePlayerIds, receivePlayerIds) {
    const opponent = this.#teams.find((team) => team.id === teamId);
    if (!this.activeTeam || !opponent) return null;
    const capAssessment = this.#assessTradeSalaryCap(opponent, givePlayerIds, receivePlayerIds);
    if (!capAssessment.allowed) return this.#buildSalaryCapRejection(capAssessment);
    const result = this.#trade.executeTrade(this.activeTeam, opponent, givePlayerIds, receivePlayerIds, {
      userRightsPlayers: this.getExternalRightsPlayers(this.#activeTeamId),
      aiRightsPlayers: this.getExternalRightsPlayers(opponent.id),
    });
    if (result?.accepted) {
      (result.evaluation?.givePlayers || []).forEach((player) => {
        this.#recordPlayerMovement({ player, fromTeamId: this.#activeTeamId, toTeamId: opponent.id, method: "trade" });
      });
      (result.evaluation?.receivePlayers || []).forEach((player) => {
        this.#recordPlayerMovement({ player, fromTeamId: opponent.id, toTeamId: this.#activeTeamId, method: "trade" });
      });
      (result.evaluation?.giveRightsPlayers || []).forEach((player) => {
        this.#recordPlayerMovement({ player, fromTeamId: this.#activeTeamId, toTeamId: opponent.id, method: "rightsTrade" });
      });
      (result.evaluation?.receiveRightsPlayers || []).forEach((player) => {
        this.#recordPlayerMovement({ player, fromTeamId: opponent.id, toTeamId: this.#activeTeamId, method: "rightsTrade" });
      });
    }
    return result;
  }

  getActiveTeamNegotiationPreview(playerId, offer) {
    const player = this.#findActiveTeamPlayer(playerId);
    if (!player) return null;
    const context = this.#buildNegotiationContext(this.activeTeam);
    return this.#attachSalaryCapPreview(
      this.#contracts.getRenewalPreview(this.activeTeam, player, offer, context),
      this.activeTeam,
      player,
      "renewal",
      context,
    );
  }

  submitActiveTeamNegotiation(playerId, offer) {
    const player = this.#findActiveTeamPlayer(playerId);
    if (!player) return null;
    const context = this.#buildNegotiationContext(this.activeTeam);
    const capAssessment = this.#canSubmitContractOffer(this.activeTeam, player, offer, "renewal", context);
    if (!capAssessment.allowed) return this.#buildSalaryCapRejection(capAssessment, this.activeTeam);
    return this.#contracts.submitRenewalOffer(this.activeTeam, player, offer, context);
  }

  matchRestrictedRightsOffer(offerId, offer) {
    if (!this.#gameSettings.restrictedFreeAgencyEnabled) return { accepted: false, message: "Права ОСА отключены в настройках игры." };
    const entry = (this.#seasonState?.restrictedRightsOffers || []).find(
      (candidate) => candidate.id === offerId && candidate.rightsTeamId === this.#activeTeamId && candidate.status === "pending",
    );
    if (!entry || !this.activeTeam) return { accepted: false, message: "Предложение ОСА не найдено." };
    const player = this.getAllKnownPlayers().find((candidate) => candidate.id === entry.playerId);
    if (!player) return { accepted: false, message: "Игрок уже не находится в системе клуба." };

    const bestOffer = entry.offer || {};
    const submittedOffer = {
      years: Math.max(Number(bestOffer.years) || 1, Number(offer?.years) || 1),
      salaryRub: this.#roundSalaryRub(Math.max(Number(bestOffer.salaryRub) || 0, Number(offer?.salaryRub) || 0)),
    };
    const capAssessment = this.#canSubmitContractOffer(this.activeTeam, player, submittedOffer, "freeAgent", {
      ...this.#buildNegotiationContext(this.activeTeam),
      seasonLabel: entry.season || this.#seasonState?.seasonLabel,
    });
    if (!capAssessment.allowed) return this.#buildSalaryCapRejection(capAssessment, this.activeTeam);
    const contract = this.#contracts.matchRestrictedFreeAgentOffer(
      player,
      this.#activeTeamId,
      submittedOffer,
      entry.season || this.#seasonState?.seasonLabel,
    );
    const wasExternal = this.#activateExternalPlayer(player, this.activeTeam);
    this.#resolveRestrictedRightsOffer(entry.id, "matched");
    if (wasExternal) {
      this.#seasonTransition.rebuildRosters(this.#teams, this.getAllPlayers());
      this.#refreshExpectedRoles(this.activeTeam);
      this.#recordPlayerMovement({ player, fromTeamId: null, toTeamId: this.#activeTeamId, method: "externalReturn" });
    }
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
    if (!this.#gameSettings.restrictedFreeAgencyEnabled) return { accepted: false, message: "Права ОСА отключены в настройках игры." };
    const entry = (this.#seasonState?.restrictedRightsOffers || []).find(
      (candidate) => candidate.id === offerId && candidate.rightsTeamId === this.#activeTeamId && candidate.status === "pending",
    );
    if (!entry) return { accepted: false, message: "Предложение ОСА не найдено." };
    const player = this.getAllKnownPlayers().find((candidate) => candidate.id === entry.playerId);
    const newTeam = this.#teams.find((candidate) => candidate.id === entry.offerTeamId);
    if (!player || !newTeam) return { accepted: false, message: "Не удалось завершить переход ОСА." };
    const capAssessment = this.#canSubmitContractOffer(newTeam, player, entry.offer, "freeAgent", {
      ...this.#buildNegotiationContext(newTeam),
      seasonLabel: entry.season || this.#seasonState?.seasonLabel,
    });
    if (!capAssessment.allowed) return this.#buildSalaryCapRejection(capAssessment, newTeam);

    const contract = this.#contracts.signRestrictedFreeAgentOfferSheet(
      player,
      newTeam.id,
      entry.offer,
      entry.season || this.#seasonState?.seasonLabel,
    );
    player.affiliation.acquiredDay = this.#calendar.currentDay;
    this.#activateExternalPlayer(player, newTeam);
    this.#resolveRestrictedRightsOffer(entry.id, "released");
    this.#recordOfferSheetCompensation(entry, player, newTeam);
    this.#seasonTransition.rebuildRosters(this.#teams, this.getAllPlayers());
    this.#refreshExpectedRoles(newTeam);
    if (this.activeTeam) this.#refreshExpectedRoles(this.activeTeam);
    this.#recordPlayerMovement({ player, fromTeamId: this.#activeTeamId, toTeamId: newTeam.id, method: "offerSheet" });
    this.#pushNotification({
      id: `notification-osa-release-${player.id}-${Date.now()}`,
      type: "offseason-departure",
      title: "Права ОСА",
      message: `${player.name} перешел в ${newTeam.name}. Компенсация: ${entry.compensation?.label || "без компенсации"}.`,
      day: this.#calendar.currentDay,
      createdAt: new Date().toISOString(),
      playerId: player.id,
      read: false,
    });
    return { accepted: true, decision: "released", contract, compensation: entry.compensation || null };
  }

  getFreeAgentSigningPreview(playerId, offer) {
    const player = this.getAvailableFreeAgents().find((entry) => entry.id === playerId);
    if (!this.activeTeam || !player) return null;
    const context = this.#buildNegotiationContext(this.activeTeam);
    return this.#attachSalaryCapPreview(
      this.#contracts.getFreeAgentPreview(this.activeTeam, player, offer, context),
      this.activeTeam,
      player,
      "freeAgent",
      context,
    );
  }

  submitFreeAgentSigning(playerId, offer) {
    const player = this.getAvailableFreeAgents().find((entry) => entry.id === playerId);
    if (!this.activeTeam || !player) return null;
    if (this.#seasonState?.phase === "preseason" && this.#seasonState?.preseasonOpen) {
      return this.#queuePreseasonFreeAgentOffer(player, offer);
    }
    const context = this.#buildNegotiationContext(this.activeTeam);
    const capAssessment = this.#canSubmitContractOffer(this.activeTeam, player, offer, "freeAgent", context);
    if (!capAssessment.allowed) return this.#buildSalaryCapRejection(capAssessment, this.activeTeam);
    const result = this.#contracts.submitFreeAgentOffer(this.activeTeam, player, offer, context);
    if (result?.decision === "accept") {
      player.affiliation.acquiredDay = this.#calendar.currentDay;
      this.activeTeam.reservePlayers.push(player);
      this.#freeAgents = dedupeFreeAgents(this.#freeAgents.filter((entry) => entry.id !== player.id));
      this.#refreshExpectedRoles(this.activeTeam);
      this.#recordPlayerMovement({ player, fromTeamId: null, toTeamId: this.#activeTeamId, method: "freeAgent" });
    }
    return result;
  }

  queueExternalRightsOffer(playerId, offer) {
    if (!this.#gameSettings.restrictedFreeAgencyEnabled) return null;
    const player = this.#externalPlayers.find((entry) => entry.id === playerId && entry.externalCareer?.rightsTeamId === this.#activeTeamId);
    if (!this.activeTeam || !player || this.#hasPendingExternalRightsOffer(playerId)) return null;
    const season = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
    const offerWindow = this.#externalRightsInterest.buildOfferWindow(player, season);
    if (!offerWindow.canOffer) return { decision: "locked", reason: offerWindow.label };
    const preview = this.#contracts.getFreeAgentPreview(this.activeTeam, player, offer, this.#buildNegotiationContext(this.activeTeam));
    const capAssessment = this.#canSubmitContractOffer(this.activeTeam, player, preview.offer, "freeAgent", {
      ...this.#buildNegotiationContext(this.activeTeam),
      seasonLabel: season,
    });
    if (!capAssessment.allowed) return this.#buildSalaryCapRejection(capAssessment, this.activeTeam);
    const nextDecisionIndex = Math.min((this.#seasonState?.preseasonDates || []).length - 1, (Number(this.#seasonState?.preseasonIndex) || 0) + 1);
    const nextDecisionDate = getPreseasonNextDate(this.#seasonState?.preseasonDates || [], this.#seasonState?.preseasonIndex || 0);
    player.externalCareer = { ...(player.externalCareer || {}), lastKhlOfferSeason: season };
    this.#seasonState = {
      ...this.#seasonState,
      externalRightsOffers: [...(this.#seasonState?.externalRightsOffers || []), {
        id: `external-rights-offer-${player.id}-${Date.now()}`,
        playerId,
        teamId: this.#activeTeamId,
        offer: { ...preview.offer },
        decisionIndex: nextDecisionIndex,
        season,
        status: "pending",
      }],
    };
    return { decision: "queued", preview, resolvesOn: nextDecisionDate };
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
    if (!this.activeTeam || !playerId) return false;
    const seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
    const candidate = this.activeTeam.getRoster().find((entry) => entry?.id === playerId);
    const hasThreeWayContract = this.#contracts.hasThreeWayContract(playerId, seasonLabel);
    if (getJuniorIneligibilityReason({ player: candidate, seasonLabel, hasThreeWayContract })) return false;
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

  signJuniorPlayerToMain(playerId) {
    if (!this.activeTeam || !playerId) return null;
    const team = this.activeTeam;
    const juniorIndex = team.juniorPlayers.findIndex((entry) => entry.id === playerId);
    if (juniorIndex < 0) return null;
    const player = team.juniorPlayers[juniorIndex];
    const seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
    const contract = this.#contracts.signJuniorToMainContract(player, team.id, seasonLabel);
    if (!contract) return null;
    team.juniorPlayers.splice(juniorIndex, 1);
    team.reservePlayers.push(player);
    player.expectedLineIndex = null;
    this.#refreshExpectedRoles(team);
    return contract;
  }

  getJuniorPhotoRequest(playerId) {
    if (!this.activeTeam || !playerId) return null;
    const player = (this.activeTeam.juniorPlayers || []).find((entry) => entry.id === playerId);
    if (!player) return null;
    const seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
    return {
      id: player.id,
      name: player.name,
      age: getJuniorSeasonAge(player, seasonLabel),
      position: player.identity?.primaryPosition || "",
      nationality: player.identity?.nationality || "",
      teamName: this.activeTeam.juniorTeam?.name || this.activeTeam.name,
    };
  }

  getUsedPlayerPhotoUrls() {
    return this.getAllKnownPlayers().map((player) => player.identity?.photoUrl).filter(Boolean);
  }

  setJuniorPlayerPhoto(playerId, photoUrl) {
    if (!this.activeTeam || !playerId || !photoUrl) return false;
    const player = (this.activeTeam.juniorPlayers || []).find((entry) => entry.id === playerId);
    if (!player) return false;
    player.identity.photoUrl = photoUrl;
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
    if (this.#gameSettings.restrictedFreeAgencyEnabled && (this.#seasonState?.restrictedRightsOffers || []).some((entry) => entry?.status === "pending" && entry.rightsTeamId === this.#activeTeamId)) return false;
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
    this.#resolveExternalRightsOfferWindow({
      decisionIndex: Number(this.#seasonState?.preseasonIndex) || 0,
      decisionDate: preseasonDate,
    });
    const depthMovements = this.#seasonTransition.ensureMinimumRosterDepth({
      teams: this.#teams,
      activeTeamId: this.#activeTeamId,
      allPlayers: this.getAllPlayers(),
      buildContext: (team) => this.#buildNegotiationContext(team),
      canSubmitOffer: (team, player, offer, context) =>
        this.#canSubmitContractOffer(team, player, offer, "freeAgent", context).allowed,
      negotiationDate: preseasonDate,
      seasonLabel: this.#seasonState?.seasonLabel || this.#calendar.seasonLabel,
    });
    this.#recordRosterDepthMovements(depthMovements);
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
    this.#resolveExternalRightsOfferWindow({
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

  advanceToNextSeason(options = {}) {
    if (!this.canAdvanceToNextSeason()) return null;
    const transition = this.#seasonTransition.advanceToNextSeason({
      teams: this.#teams,
      calendar: this.#calendar,
      activeTeamId: this.#activeTeamId,
      standingsTable: this.getStandingsTable(),
      scorerTable: this.#stats.getSeasonStats(),
      allPlayers: this.getAllPlayers(),
      buildContext: (team) => this.#buildNegotiationContext(team),
      canSubmitOffer: (team, player, offer, context) =>
        this.#canSubmitContractOffer(team, player, offer, "freeAgent", context).allowed,
      pushNotification: (notification) => this.#pushNotification(notification),
      releaseRightsPlayerIds: options.releaseRightsPlayerIds || [],
      restrictedFreeAgencyEnabled: this.#gameSettings.restrictedFreeAgencyEnabled,
    });
    transition.seasonState.externalRightsOffers = this.#gameSettings.restrictedFreeAgencyEnabled ? this.#buildTransitionExternalRightsOffers(options.externalRightsOffers || [], transition.seasonState) : [];
    this.#processExternalPlayerReturns(transition);
    this.#processAiExternalRightsActions(transition);
    this.#addNorthAmericaDeparturesToExternalPool(transition);
    this.#seasonHistory.unshift(transition.archive);
    this.#seasonHistory = this.#seasonHistory.slice(0, 12);
    (transition.retiredPlayerIds || []).forEach((playerId) => this.#retiredPlayerIds.add(playerId));
    const externalIds = new Set(this.#externalPlayers.map((player) => player.id));
    this.#freeAgents = dedupeFreeAgents(transition.freeAgents).filter((player) => !externalIds.has(player.id));
    this.#stats.importStats([]);
    this.#standings.importSnapshot([]);
    this.#lastMatch = null;
    this.#seasonState = transition.seasonState;
    this.#transferLedger = [];
    this.#recordTransitionMovements(transition);
    this.#processCoachOffseason(transition);
    (transition.externalSignings || []).forEach((entry) => {
      this.#recordPlayerMovement({ player: entry.player, fromTeamId: null, toTeamId: entry.toTeamId, method: "externalReturn" });
    });
    const completedSeasonLabel = this.#seasonState.previousSeasonLabel || this.#seasonState.seasonLabel;
    this.#applyJuniorLeagueDevelopmentBonuses(completedSeasonLabel);
    this.#processJuniorNorthAmericaDepartures(completedSeasonLabel);
    this.#releaseIneligibleJuniorPlayers({ notify: true });
    this.#juniors.applyOffseasonDevelopment(this.#teams, this.#getEffectiveNegotiationDate(), this.#seasonState.seasonLabel);
    this.#juniors.ensureJuniorDepth({ teams: this.#teams, contracts: this.#contracts, seasonLabel: this.#seasonState.seasonLabel, generationSeed: this.#juniorGenerationSeed });
    this.#syncSeasonReferenceDate();
    this.#syncSeasonPhase();
    return transition;
  }

  exportState() {
    const allPlayers = this.getAllPlayers();
    return {
      calendar: this.#calendar.exportState(),
      players: createPlayerSnapshots(allPlayers),
      externalPlayers: createPlayerSnapshots(mergeExternalRightsPlayers(this.#externalPlayers, allPlayers)),
      stats: this.#stats.getSeasonStats(),
      activeTeamId: this.#activeTeamId,
      contracts: this.#contracts.exportContracts(),
      standings: this.#standings.getSnapshot(),
      rosters: createRosterSnapshots(this.#teams),
      gameSettings: this.#gameSettings,
      coaches: this.#coaches.map((coach) => coach.exportSnapshot()),
      notifications: this.#notifications,
      seasonHistory: this.#seasonHistory,
      seasonState: this.#seasonState,
      retiredPlayerIds: [...this.#retiredPlayerIds],
      transferLedger: this.#transferLedger,
      juniorGenerationSeed: this.#juniorGenerationSeed,
    };
  }

  importState(saved) {
    if (!saved) return;
    this.#juniorGenerationSeed = "juniorGenerationSeed" in saved ? saved.juniorGenerationSeed : null;
    this.#retiredPlayerIds = new Set(Array.isArray(saved.retiredPlayerIds) ? saved.retiredPlayerIds : []);
    this.#gameSettings = normalizeGameSettings(saved.gameSettings);
    if (Array.isArray(saved.coaches)) this.#coaches = saved.coaches.map((coach) => HeadCoach.fromSnapshot(coach));
    this.#transferLedger = normalizeTransferLedger(saved.transferLedger);
    this.#activeTeamId = saved.activeTeamId || null;
    if (saved.calendar) this.#calendar.importState(saved.calendar);
    else {
      this.#calendar.index = saved.calendarIndex || 0;
      if (saved.calendarResults) this.#calendar.importResults(saved.calendarResults);
    }
    if (saved.contracts) this.#contracts.importContracts(saved.contracts);
    const savedExternalPlayers = collectSavedExternalPlayerSnapshots(saved);
    const savedExternalPlayerIds = collectSavedExternalPlayerIds(savedExternalPlayers);
    if (savedExternalPlayers.length) {
      const missingExternalPlayers = createMissingSavedPlayers(
        savedExternalPlayers,
        this.#externalPlayers,
        this.#calendar.seasonLabel,
      );
      this.#externalPlayers = [...this.#externalPlayers, ...missingExternalPlayers];
      restorePlayerSnapshots(this.#externalPlayers, savedExternalPlayers);
    }
    if (saved.rosters) {
      this.#juniors.ensureSavedJuniorPlayers({
        teams: this.#teams,
        rosters: saved.rosters,
        contracts: this.#contracts,
        seasonLabel: this.#calendar.seasonLabel,
        generationSeed: this.#juniorGenerationSeed,
      });
    }
    let basePlayers = [...new Map([
      ...this.#teams.flatMap((team) => [...team.getRoster(), ...(team.juniorPlayers || [])]),
      ...this.#freeAgents,
    ].map((player) => [player.id, player])).values()];
    const missingSavedPlayers = createMissingSavedPlayers(saved.players, basePlayers, this.#calendar.seasonLabel);
    if (missingSavedPlayers.length) {
      this.#freeAgents = dedupeFreeAgents([...this.#freeAgents, ...missingSavedPlayers]);
      basePlayers = [...basePlayers, ...missingSavedPlayers];
    }
    const activeSavedPlayerIds = new Set((saved.players || []).map((player) => player?.id).filter(Boolean));
    this.#externalPlayers = this.#externalPlayers.filter(
      (player) => shouldRestoreExternalRightsPlayer(player, activeSavedPlayerIds, savedExternalPlayerIds, this.#retiredPlayerIds),
    );
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
    this.#ensureRosterContracts(saved.seasonState?.seasonLabel || this.#calendar.seasonLabel);
    this.#releaseIneligibleJuniorPlayers({ notify: false });
    basePlayers = [...new Map([
      ...this.#teams.flatMap((team) => [...team.getRoster(), ...(team.juniorPlayers || [])]),
      ...this.#freeAgents,
    ].map((player) => [player.id, player])).values()];

    const activePlayers = excludeExternalRightsPlayersFromActivePool(basePlayers, this.#externalPlayers, this.#retiredPlayerIds);
    this.#freeAgents = dedupeFreeAgents(activePlayers);
    this.#seasonTransition.rebuildRosters(this.#teams, activePlayers);
    if (saved.standings) this.#standings.importSnapshot(saved.standings);
    this.#calendar.ensurePlayoffs(this.getStandingsTable());
    this.#stats.importStats(saved.stats);
    this.#seasonHistory = Array.isArray(saved.seasonHistory) ? [...saved.seasonHistory] : [];
    this.#seasonState = normalizeSeasonState(saved.seasonState, this.#calendar.seasonLabel);
    this.#notifications = normalizeNotifications(saved.notifications, this.#calendar.currentDay);
    this.#juniors.ensureJuniorDepth({ teams: this.#teams, contracts: this.#contracts, seasonLabel: this.#seasonState.seasonLabel, generationSeed: this.#juniorGenerationSeed });
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
      externalRightsOffers: [],
      restrictedRightsOffers: [],
      offerSheetCompensations: [],
      northAmericaWarningSeason: null,
      preseasonIndex: 0,
    };
    this.#syncSeasonReferenceDate();
    this.#lastMatch = null;
    this.#stats.importStats([]);
    this.#standings.importSnapshot([]);
    this.#juniors.ensureJuniorDepth({ teams: this.#teams, contracts: this.#contracts, seasonLabel: this.#seasonState.seasonLabel, generationSeed: this.#juniorGenerationSeed });
    this.getAllPlayers().forEach((player) => player.seasonStats.importSnapshot());
  }

  #simulateCalendarDay(day, focusTeamId) {
    const previousDate = this.#calendar.currentDate;
    const matches = day?.matches || [];
    if (matches.length === 0) {
      this.#lastMatch = null;
      this.#restTeams(this.#teams, -10);
      this.#calendar.advanceDay();
      this.#syncSeasonReferenceDate();
      this.#runMonthlyAiRenewals(previousDate, this.#calendar.currentDate);
      this.#runNorthAmericaInterestWarnings(this.#calendar.currentDate);
      this.#syncSeasonPhase();
      return null;
    }

    const focusedMatches = [];
    const playedTeams = new Set();
    const phase = day?.phase || "regular";
    const coachEffects = this.#buildCoachEffectsByTeamId(phase);
    matches.forEach((match) => {
      this.#prepareAiTeamForMatch(match.home, phase);
      this.#prepareAiTeamForMatch(match.away, phase);
      const simulated = this.#sim.simulateMatch(match.home, match.away, { phase, coachEffectsByTeamId: coachEffects });
      this.#calendar.recordResult(day.day, match.id, simulated);
      if (day?.phase !== "playoffs") this.#standings.recordMatch(simulated);
      this.#stats.recordMatch(simulated);
      applyMatchPlayerStats(simulated);
      const homeDevelopmentEvents = this.#development.applyMatchDevelopment(simulated.home, simulated.summary?.home, {
        teamGamesPlayed: this.#standings.getTeamStats(simulated.home.id)?.gp || 0,
        coachDevelopmentMultiplier: coachEffects[simulated.home.id]?.developmentMultiplier || 1,
      });
      const awayDevelopmentEvents = this.#development.applyMatchDevelopment(simulated.away, simulated.summary?.away, {
        teamGamesPlayed: this.#standings.getTeamStats(simulated.away.id)?.gp || 0,
        coachDevelopmentMultiplier: coachEffects[simulated.away.id]?.developmentMultiplier || 1,
      });
      this.#pushDevelopmentNotifications(simulated.home, homeDevelopmentEvents, day.day);
      this.#pushDevelopmentNotifications(simulated.away, awayDevelopmentEvents, day.day);
      applyMatchMood(simulated.home, simulated.summary?.home);
      applyMatchMood(simulated.away, simulated.summary?.away);
      applyMatchFatigue(simulated.home, simulated.summary?.home, this.#calendar.currentDate);
      applyMatchFatigue(simulated.away, simulated.summary?.away, this.#calendar.currentDate);
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
    if (playedTeamList.length) this.#randomizeForm(playedTeamList);
    if (idleTeamList.length) this.#restTeams(idleTeamList, -8);
    this.#calendar.advanceDay();
    this.#calendar.ensurePlayoffs(this.getStandingsTable());
    this.#syncSeasonReferenceDate();
    this.#runMonthlyAiRenewals(previousDate, this.#calendar.currentDate);
    this.#runNorthAmericaInterestWarnings(this.#calendar.currentDate);
    this.#processAiCoachChanges();
    this.#lastMatch = focusedMatches[0] || null;
    this.#syncSeasonPhase();
    return this.#lastMatch;
  }

  #findActiveTeamPlayer(playerId) {
    if (!this.activeTeam || !playerId) return null;
    return [...this.activeTeam.getRoster(), ...(this.activeTeam.juniorPlayers || [])].find((entry) => entry.id === playerId) || null;
  }

  #restTeams(teams, delta) {
    teams.flatMap((team) => team.getRoster()).forEach((player) => {
      player.applyFatigue(delta);
      player.applyFormDelta(Math.random() * 0.02 - 0.01);
    });
  }

  #prepareAiTeamForMatch(team, phase) {
    if (!team?.id || team.id === this.#activeTeamId) return;
    const normalizedPhase = String(phase || "");
    if (!["regular", "playoffs"].includes(normalizedPhase)) return;

    if (normalizedPhase === "regular") {
      const depthMovements = this.#seasonTransition.ensureMinimumRosterDepth({
        teams: [team],
        activeTeamId: this.#activeTeamId,
        allPlayers: this.getAllPlayers(),
        buildContext: (candidateTeam) => this.#buildNegotiationContext(candidateTeam),
        negotiationDate: this.#calendar.currentDate,
        seasonLabel: this.#seasonState?.seasonLabel || this.#calendar.seasonLabel,
      });
      this.#recordRosterDepthMovements(depthMovements);
      this.#signAiRotationDepthIfNeeded(team);
    }
    if (this.#rotateAiLineupForFatigue(team)) this.#refreshExpectedRoles(team);
  }

  #signAiRotationDepthIfNeeded(team) {
    const roster = team?.getRoster?.() || [];
    if (roster.length >= AI_ROTATION_MAX_ROSTER_SIZE) return false;

    const linePlayers = team.lines.flatMap((line) => line.players).filter(Boolean);
    const tiredLinePlayers = linePlayers.filter((player) => (Number(player.fatigueScore) || 0) >= AI_DEPTH_SIGNING_FATIGUE_THRESHOLD);
    const restedReserves = (team.reservePlayers || []).filter((player) => (Number(player.fatigueScore) || 0) <= AI_RESTED_RESERVE_THRESHOLD);
    if (tiredLinePlayers.length < 4 || restedReserves.length >= 2) return false;

    const preferredGroup = this.#getPlayerRotationGroup(
      [...tiredLinePlayers].sort((left, right) => (right.fatigueScore || 0) - (left.fatigueScore || 0))[0],
    );
    const available = this.getAvailableFreeAgents();
    const sameGroupCandidates = available
      .filter((player) => this.#getPlayerRotationGroup(player) === preferredGroup)
      .filter((player) => (Number(player.ovr) || 0) <= 76);
    const fallbackCandidates = available.filter((player) => (Number(player.ovr) || 0) <= 74);
    const candidate = [...(sameGroupCandidates.length ? sameGroupCandidates : fallbackCandidates)]
      .sort((left, right) => (right.ovr - left.ovr) || left.name.localeCompare(right.name, "ru"))[0];
    if (!candidate) return false;

    const offer = { years: 1, salaryRub: getFallbackMarketSalaryRub(candidate) };
    if (!this.#canSubmitContractOffer(
      team,
      candidate,
      offer,
      "freeAgent",
      { currentDate: this.#calendar.currentDate, seasonLabel: this.#seasonState?.seasonLabel || this.#calendar.seasonLabel },
    ).allowed) return false;

    this.#contracts.finalizeFreeAgentSigning(
      team,
      candidate,
      offer,
      { currentDate: this.#calendar.currentDate, seasonLabel: this.#seasonState?.seasonLabel || this.#calendar.seasonLabel },
    );
    candidate.affiliation.acquiredDay = this.#calendar.currentDay;
    if (!team.getRoster().some((player) => player?.id === candidate.id)) {
      team.reservePlayers.push(candidate);
    }
    this.#freeAgents = dedupeFreeAgents(this.#freeAgents.filter((player) => player.id !== candidate.id));
    this.#refreshExpectedRoles(team);
    this.#recordPlayerMovement({ player: candidate, fromTeamId: null, toTeamId: team.id, method: "rosterDepth" });
    return true;
  }

  #rotateAiLineupForFatigue(team) {
    let changed = false;
    team.lines.forEach((line) => {
      line.players.forEach((player, slotIndex) => {
        const slotPosition = line.positions?.[slotIndex] || player?.identity?.primaryPosition || null;
        if (!player) {
          const reserveIndex = this.#findBestAiReserveIndex(team.reservePlayers, slotPosition, null);
          if (reserveIndex >= 0) {
            line.players[slotIndex] = team.reservePlayers.splice(reserveIndex, 1)[0];
            changed = true;
          }
          return;
        }

        if (!this.#shouldAiRestPlayer(player)) {
          const upgradeIndex = this.#findBestAiUpgradeReserveIndex(team.reservePlayers, slotPosition, player);
          if (upgradeIndex < 0) return;
          const replacement = team.reservePlayers.splice(upgradeIndex, 1)[0];
          line.players[slotIndex] = replacement;
          team.reservePlayers.push(player);
          changed = true;
          return;
        }

        const reserveIndex = this.#findBestAiReserveIndex(team.reservePlayers, slotPosition, player);
        if (reserveIndex < 0) return;
        const replacement = team.reservePlayers.splice(reserveIndex, 1)[0];
        line.players[slotIndex] = replacement;
        team.reservePlayers.push(player);
        changed = true;
      });
    });
    return changed;
  }

  #shouldAiRestPlayer(player) {
    const fatigue = Number(player?.fatigueScore) || 0;
    if (fatigue >= AI_ROTATION_FATIGUE_THRESHOLD) return true;
    return (Number(player?.ovr) || 0) - (Number(player?.currentOvr) || 0) >= 4;
  }

  #findBestAiReserveIndex(reserves, slotPosition, starter) {
    let bestIndex = -1;
    let bestScore = -Infinity;
    const starterScore = starter ? lineupScoreForPosition(starter, slotPosition) : 0;
    const starterFatigue = Number(starter?.fatigueScore) || 0;
    const tolerance = starterFatigue >= 75 ? 12 : starterFatigue >= 65 ? 8 : 5;

    (reserves || []).forEach((candidate, index) => {
      if (!candidate || (Number(candidate.fatigueScore) || 0) > 42) return;
      const score = lineupScoreForPosition(candidate, slotPosition);
      if (starter && score < starterScore - tolerance) return;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  #findBestAiUpgradeReserveIndex(reserves, slotPosition, starter) {
    if (!starter) return -1;
    let bestIndex = -1;
    let bestScore = -Infinity;
    const starterScore = lineupScoreForPosition(starter, slotPosition);

    (reserves || []).forEach((candidate, index) => {
      if (!candidate || (Number(candidate.fatigueScore) || 0) > AI_RESTED_RESERVE_THRESHOLD) return;
      const score = lineupScoreForPosition(candidate, slotPosition);
      if (score < starterScore + 3) return;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  #getPlayerRotationGroup(player) {
    return player?.identity?.primaryPosition === "ЗАЩ" ? "DEF" : "FWD";
  }

  #randomizeForm(teams) {
    teams.flatMap((team) => team.getRoster()).forEach((player) => {
      player.applyFormDelta(Math.random() * 0.02 - 0.01);
    });
  }

  #recordPlayerMovement({ player, fromTeamId = null, toTeamId = null, method = "freeAgent", note = "" }) {
    if (!player?.id || fromTeamId === toTeamId) return;
    const seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
    const createdAt = new Date().toISOString();
    const base = {
      seasonLabel,
      day: this.#calendar.currentDay,
      createdAt,
      playerId: player.id,
      playerName: player.name,
      position: player.identity?.primaryPosition || "",
      ovr: player.ovr,
      fromTeamId,
      fromTeamName: this.#getTeamName(fromTeamId),
      toTeamId,
      toTeamName: this.#getTeamName(toTeamId),
      method,
      note,
    };
    const entries = [];
    if (fromTeamId) {
      entries.push({
        ...base,
        id: `transfer-out-${seasonLabel}-${fromTeamId}-${player.id}-${this.#calendar.currentDay}-${createdAt}`,
        teamId: fromTeamId,
        type: "out",
      });
    }
    if (toTeamId) {
      entries.push({
        ...base,
        id: `transfer-in-${seasonLabel}-${toTeamId}-${player.id}-${this.#calendar.currentDay}-${createdAt}`,
        teamId: toTeamId,
        type: "in",
      });
    }
    this.#transferLedger = [...entries, ...this.#transferLedger].slice(0, 1000);
  }

  #recordTransitionMovements(transition) {
    (transition?.departures || []).forEach((entry) => {
      this.#recordPlayerMovement({
        player: entry.player,
        fromTeamId: entry.fromTeamId,
        toTeamId: null,
        method: entry.reason === "retirement" ? "retirement" : "contractExpired",
      });
    });
  }

  #addNorthAmericaDeparturesToExternalPool(transition) {
    const leavingPlayers = (transition?.departures || [])
      .filter((entry) => entry.reason === "northAmerica" && entry.player?.externalCareer)
      .map((entry) => entry.player);
    if (!leavingPlayers.length) return;
    const byId = new Map(this.#externalPlayers.map((player) => [player.id, player]));
    leavingPlayers.forEach((player) => byId.set(player.id, player));
    this.#externalPlayers = [...byId.values()];
    if (!this.#gameSettings.restrictedFreeAgencyEnabled) return;
    leavingPlayers
      .filter((player) => player.externalCareer?.rightsTeamId === this.#activeTeamId)
      .forEach((player) => this.#pushNotification({
        id: `notification-na-departure-${player.id}-${Date.now()}`,
        type: "offseason-departure",
        title: "Отъезд в НХЛ / АХЛ",
        message: `${player.name} уехал пробовать себя в ${player.externalCareer.league}. Права КХЛ остаются у клуба.`,
        day: this.#calendar.currentDay,
        createdAt: new Date().toISOString(),
        playerId: player.id,
        read: false,
      }));
  }

  #applyJuniorLeagueDevelopmentBonuses(seasonLabel) {
    const scorerRows = this.#juniorLeague.buildSeasonView(this.#teams, seasonLabel).scorers;
    const bonusByPlayerId = new Map(scorerRows.map((row) => [row.playerId, row.developmentBonus]));
    this.#teams.flatMap((team) => team.juniorPlayers || []).forEach((player) => {
      player.juniorLeagueDevelopmentBonus = bonusByPlayerId.get(player.id) || 0;
    });
  }

  #processJuniorNorthAmericaDepartures(seasonLabel) {
    if (!this.#gameSettings.restrictedFreeAgencyEnabled) return;
    const events = this.#juniorDepartures.evaluateOffseason({
      teams: this.#teams,
      seasonLabel,
      hasMainContract: (player) => {
        const nextSeason = `${parseSeasonEnd(seasonLabel)}/${parseSeasonEnd(seasonLabel) + 1}`;
        const contract = this.#contracts.getContractForSeason(player.id, nextSeason);
        return Boolean(contract && contract.type !== ContractType.THREE_WAY);
      },
    });
    if (!events.length) return;
    const externalById = new Map(this.#externalPlayers.map((player) => [player.id, player]));
    events.forEach((event) => this.#moveJuniorToExternalRights(event, externalById));
    this.#externalPlayers = [...externalById.values()];
  }

  #moveJuniorToExternalRights(event, externalById) {
    const { player, team, league, contractUntil } = event;
    team.juniorPlayers.splice(0, team.juniorPlayers.length, ...team.juniorPlayers.filter((entry) => entry.id !== player.id));
    player.externalCareer = { league, status: league === "NHL" ? "nhl_depth" : "ahl_leader", contractUntil, rightsTeamId: team.id, seasonsOutsideKhl: 0, returnInterest: league === "NHL" ? 22 : 42, availableToKhl: false, lastEvaluatedSeason: null };
    player.affiliation.teamId = null;
    player.affiliation.contractId = null;
    player.affiliation.acquiredDay = null;
    player.expectedLineIndex = null;
    externalById.set(player.id, player);
    this.#recordPlayerMovement({ player, fromTeamId: team.id, toTeamId: null, method: "juniorNorthAmerica", note: league });
    if (team.id === this.#activeTeamId) this.#pushNotification(this.#buildJuniorDepartureNotification(event));
  }

  #buildJuniorDepartureNotification(event) {
    return { id: `notification-junior-na-${event.player.id}-${Date.now()}`, type: "offseason-departure", title: "Юниор уехал в НХЛ / АХЛ", message: `${event.player.name} выбрал ${event.league}. Права КХЛ остаются у ${event.team.name}.`, day: this.#calendar.currentDay, createdAt: new Date().toISOString(), playerId: event.player.id, read: false };
  }

  #processExternalPlayerReturns(transition) {
    const nextSeasonLabel = transition?.seasonState?.seasonLabel;
    if (!nextSeasonLabel || !this.#externalPlayers.length) return;
    const nextSeasonStartYear = Number(String(nextSeasonLabel).split("/")[0]) || this.#calendar.seasonStartYear + 1;
    const seasonDate = new Date(Date.UTC(nextSeasonStartYear, 4, 31));
    this.#externalDevelopment.applyAnnualDevelopment(this.#externalPlayers, { seasonDate, seasonLabel: nextSeasonLabel })
      .filter((event) => this.#externalPlayers.find((player) => player.id === event.playerId)?.externalCareer?.rightsTeamId === this.#activeTeamId)
      .forEach((event) => this.#pushDevelopmentNotifications(this.activeTeam, [{ ...event, teamId: this.#activeTeamId }], this.#calendar.currentDay));
    const result = this.#externalPlayerService.evaluateOffseason({
      players: this.#externalPlayers,
      seasonDate,
      seasonLabel: nextSeasonLabel,
    });
    this.#externalPlayers = result.players;
    transition.externalSignings = [];
    const userExternalOfferPlayerIds = new Set((transition.seasonState?.externalRightsOffers || [])
      .filter((entry) => entry?.teamId === this.#activeTeamId && entry.status === "pending")
      .map((entry) => entry.playerId));

    (result.returnCandidates || []).forEach((candidate) => {
      const { player, ufaStatus, rightsTeamId, fromLeague } = candidate;
      const rightsTeam = this.#teams.find((team) => team.id === rightsTeamId) || null;
      if (this.#gameSettings.restrictedFreeAgencyEnabled && rightsTeam?.id === this.#activeTeamId && !userExternalOfferPlayerIds.has(player.id)) {
        player.externalCareer = { ...(player.externalCareer || {}), rightsTeamId: rightsTeam.id, availableToKhl: true };
        player.affiliation.teamId = null;
        player.affiliation.contractId = null;
        return;
      }

      if (!this.#gameSettings.restrictedFreeAgencyEnabled || ufaStatus === "NSA" || !rightsTeam) {
        player.affiliation.teamId = null;
        player.affiliation.contractId = null;
        player.affiliation.acquiredDay = null;
        this.#removeExternalPlayer(player, "khl_market", nextSeasonLabel);
        transition.freeAgents = dedupeFreeAgents([...(transition.freeAgents || []), player]);
        this.#pushNotification({
          id: `notification-external-fa-${player.id}-${Date.now()}`,
          type: "free-agent-market",
          title: "Возвращение из НХЛ / АХЛ",
          message: `${player.name} освободился из ${fromLeague} и вышел на рынок свободных агентов`,
          day: this.#calendar.currentDay,
          createdAt: new Date().toISOString(),
          playerId: player.id,
          read: false,
        });
        return;
      }

      if (rightsTeam.id === this.#activeTeamId) {
        const offerSheet = this.#seasonTransition.buildRestrictedRightsOfferSheet({
          teams: this.#teams,
          activeTeamId: rightsTeam.id,
          player,
          nextSeasonLabel,
          allPlayers: this.getAllKnownPlayers(),
          buildContext: (team) => ({
            ...this.#buildNegotiationContext(team),
            currentDate: seasonDate.toISOString().slice(0, 10),
            seasonLabel: nextSeasonLabel,
          }),
          minimumOvr: 0,
        });
        if (offerSheet) {
          transition.seasonState.restrictedRightsOffers.push({
            ...offerSheet,
            source: "external",
            fromLeague,
          });
          this.#pushNotification({
            id: `notification-external-osa-${player.id}-${Date.now()}`,
            type: "offseason-retention",
            title: "Права ОСА",
            message: `${player.name} готов вернуться из ${fromLeague}. ${offerSheet.offerTeamName} сделал предложение, которое нужно повторить или отпустить`,
            day: this.#calendar.currentDay,
            createdAt: new Date().toISOString(),
            playerId: player.id,
            read: false,
          });
          return;
        }
      }

      const contract = this.#contracts.retainRestrictedFreeAgent(player, rightsTeam.id, nextSeasonLabel);
      player.affiliation.contractId = contract?.id || null;
      player.affiliation.acquiredDay = this.#calendar.currentDay;
      this.#activateExternalPlayer(player, rightsTeam, nextSeasonLabel);
      transition.externalSignings.push({ player, toTeamId: rightsTeam.id });
      if (rightsTeam.id === this.#activeTeamId) {
        this.#pushNotification({
          id: `notification-external-osa-retain-${player.id}-${Date.now()}`,
          type: "offseason-retention",
          title: "Возвращение из НХЛ / АХЛ",
          message: `${player.name} вернулся в клуб по правам ОСА`,
          day: this.#calendar.currentDay,
          createdAt: new Date().toISOString(),
          playerId: player.id,
          read: false,
        });
      }
    });

    this.#seasonTransition.rebuildRosters(this.#teams, [
      ...new Map([...(transition.freeAgents || []), ...this.getAllPlayers()].map((player) => [player.id, player])).values(),
    ]);
  }

  #processAiExternalRightsActions(transition) {
    if (!this.#gameSettings.restrictedFreeAgencyEnabled) return;
    const seasonLabel = transition?.seasonState?.seasonLabel;
    if (!seasonLabel) return;
    const seasonDate = `${parseSeasonEnd(seasonLabel)}-05-31`;
    const actions = this.#aiExternalRights.process({
      players: this.#externalPlayers,
      teams: this.#teams,
      activeTeamId: this.#activeTeamId,
      seasonLabel,
      seasonDate,
      contracts: this.#contracts,
      decisionService: this.#externalRightsOffers,
      buildContext: (team) => ({ ...this.#buildNegotiationContext(team), currentDate: seasonDate, seasonLabel }),
      canSubmitOffer: (team, player, offer, context) =>
        this.#canSubmitContractOffer(team, player, offer, "freeAgent", context).allowed,
    });
    actions.forEach((action) => this.#applyAiExternalRightsAction(action, transition, seasonLabel));
    this.#seasonTransition.rebuildRosters(this.#teams, this.getAllPlayers());
  }

  #applyAiExternalRightsAction(action, transition, seasonLabel) {
    if (action.type === "signed") {
      this.#activateExternalPlayer(action.player, action.team, seasonLabel);
      transition.externalSignings.push({ player: action.player, toTeamId: action.team.id });
      return;
    }
    if (action.type === "rightsTrade") {
      this.#recordPlayerMovement({ player: action.player, fromTeamId: action.fromTeam.id, toTeamId: action.toTeam.id, method: "rightsTrade" });
      return;
    }
    if (action.type === "released") {
      this.#recordPlayerMovement({ player: action.player, fromTeamId: action.fromTeam.id, toTeamId: null, method: "rightsReleased" });
    }
  }

  #removeExternalPlayer(player, status, seasonLabel = this.#seasonState?.seasonLabel) {
    if (!player?.id) return false;
    const wasExternal = this.#externalPlayers.some((candidate) => candidate.id === player.id);
    this.#externalPlayers = this.#externalPlayers.filter((candidate) => candidate.id !== player.id);
    if (player.externalCareer) {
      player.externalCareer = {
        ...player.externalCareer,
        status,
        availableToKhl: false,
        returnedToKhlSeason: seasonLabel || null,
      };
    }
    return wasExternal;
  }

  #activateExternalPlayer(player, team, seasonLabel = this.#seasonState?.seasonLabel) {
    const wasExternal = this.#removeExternalPlayer(player, "returned_khl", seasonLabel);
    if (wasExternal && team && !team.getRoster().some((candidate) => candidate?.id === player.id)) {
      team.reservePlayers.push(player);
    }
    return wasExternal;
  }

  #recordRosterDepthMovements(result) {
    (result?.departures || []).forEach((entry) => {
      this.#recordPlayerMovement({
        player: entry.player,
        fromTeamId: entry.fromTeamId,
        toTeamId: null,
        method: "contractExpired",
      });
    });
    (result?.signings || []).forEach((entry) => {
      this.#recordPlayerMovement({
        player: entry.player,
        fromTeamId: null,
        toTeamId: entry.toTeamId,
        method: "rosterDepth",
      });
    });
  }

  #enrichTransferEntry(entry) {
    const current = this.#getCurrentPlayerDestination(entry.playerId);
    return {
      ...entry,
      sourceLabel: entry.fromTeamName || "Свободный агент",
      destinationLabel: entry.type === "out" ? current : (entry.toTeamName || "Свободный агент"),
    };
  }

  #getCurrentPlayerDestination(playerId) {
    if (this.#retiredPlayerIds.has(playerId)) return "Завершил карьеру";
    const player = this.getAllKnownPlayers().find((entry) => entry.id === playerId);
    const teamName = this.#getTeamName(player?.affiliation?.teamId);
    if (teamName) return teamName;
    if (this.#externalPlayers.some((entry) => entry.id === playerId)) {
      const rightsTeamName = this.#getTeamName(player?.externalCareer?.rightsTeamId);
      return rightsTeamName ? `Права: ${rightsTeamName}` : player?.externalCareer?.league || "НХЛ / АХЛ";
    }
    return "Свободный агент";
  }

  #getTeamName(teamId) {
    if (!teamId) return "";
    return this.#teams.find((team) => team.id === teamId)?.name || "";
  }

  #canSubmitContractOffer(team, player, offer, mode, context = null) {
    if (!this.#gameSettings.salaryCapEnabled) return { allowed: true, failures: [] };
    if (!team?.id || !player?.id || !offer) return { allowed: false, failures: [] };
    const startSeason = mode === "renewal"
      ? this.#getRenewalStartSeason(player)
      : this.#contracts.getSigningStartSeason(context);
    return this.#salaryCap.assessOffer({
      contracts: this.#exportContractRows(),
      teamId: team.id,
      playerId: player.id,
      startSeason,
      offer,
      capConfig: this.#getSalaryCapConfig(),
    });
  }

  #assessTradeSalaryCap(opponent, givePlayerIds, receivePlayerIds) {
    if (!this.#gameSettings.salaryCapEnabled) return { allowed: true, failures: [] };
    return this.#salaryCap.assessTrade({
      contracts: this.#exportContractRows(),
      userTeamId: this.#activeTeamId,
      aiTeamId: opponent?.id,
      givePlayerIds,
      receivePlayerIds,
      seasonLabel: this.#seasonState?.seasonLabel || this.#calendar.seasonLabel,
      capConfig: this.#getSalaryCapConfig(),
    });
  }

  #getRenewalStartSeason(player) {
    const contracts = this.#contracts.getContractsForPlayer(player.id);
    const lastContract = contracts[contracts.length - 1];
    return lastContract?.season ? formatNextSeason(lastContract.season) : this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
  }

  #releasePlayerToFreeAgency(playerId, teamId, method) {
    const player = this.getAllPlayers().find((entry) => entry.id === playerId);
    if (!player || player.affiliation?.teamId !== teamId) return false;
    player.affiliation.teamId = null;
    player.affiliation.contractId = null;
    player.affiliation.acquiredDay = null;
    player.expectedLineIndex = null;
    this.#contracts.releasePlayers([player.id]);
    this.#freeAgents = dedupeFreeAgents([...this.#freeAgents, player]);
    this.#recordPlayerMovement({ player, fromTeamId: teamId, toTeamId: null, method });
    return true;
  }

  #processAiSalaryCapCompliance() {
    const seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
    const capRub = this.#getSalaryCapRub(seasonLabel);
    this.#teams.filter((team) => team.id !== this.#activeTeamId).forEach((team) => {
      this.#salaryCapCompliance.pickCuts(team, this.#exportContractRows(), seasonLabel, capRub)
        .forEach((playerId) => this.#releasePlayerToFreeAgency(playerId, team.id, "aiSalaryCapRelease"));
    });
  }

  #fillRostersToTargetSize() {
    const seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
    const movements = this.#seasonTransition.ensureMinimumRosterDepth({
      teams: this.#teams,
      activeTeamId: null,
      allPlayers: this.getAllPlayers(),
      buildContext: (team) => this.#buildNegotiationContext(team),
      canSubmitOffer: (team, player, offer, context) =>
        this.#canSubmitContractOffer(team, player, offer, "freeAgent", context).allowed,
      negotiationDate: this.#getEffectiveNegotiationDate(),
      seasonLabel,
    });
    this.#recordRosterDepthMovements(movements);
  }

  #exportContractRows() {
    const payload = this.#contracts.exportContracts();
    if (Array.isArray(payload)) return payload;
    const releasedIds = new Set(payload?.releasedPlayerIds || []);
    return (payload?.contracts || []).filter((contract) => !releasedIds.has(contract.playerId));
  }

  #getPlayerSalaryForSeason(playerId, seasonLabel, contracts = this.#exportContractRows()) {
    const exact = (contracts || []).find((contract) => contract.playerId === playerId && contract.season === seasonLabel);
    if (exact) return Number(exact.salaryRub) || 0;
    const latest = (contracts || []).filter((contract) => contract.playerId === playerId).sort((left, right) => parseSeasonEnd(right.season) - parseSeasonEnd(left.season))[0];
    return Number(latest?.salaryRub) || getFallbackMarketSalaryRub(this.getAllKnownPlayers().find((player) => player.id === playerId));
  }

  #attachSalaryCapPreview(preview, team, player, mode, context = null) {
    if (!preview || !this.#gameSettings.salaryCapEnabled) return preview;
    const startSeason = mode === "renewal" ? this.#getRenewalStartSeason(player) : this.#contracts.getSigningStartSeason(context);
    const contracts = this.#exportContractRows();
    const payrollRub = contracts
      .filter((contract) => contract.teamId === team.id && contract.season === startSeason && contract.playerId !== player.id)
      .reduce((sum, contract) => sum + (Number(contract.salaryRub) || 0), 0);
    const capRub = this.#getSalaryCapRub(startSeason);
    return { ...preview, salaryCap: { enabled: true, seasonLabel: startSeason, capRub, payrollRub, remainingRub: Math.max(0, capRub - payrollRub), offerFits: payrollRub + (Number(preview.offer?.salaryRub) || 0) <= capRub } };
  }

  #buildSalaryCapRejection(assessment, team = null) {
    const failure = assessment?.failures?.[0] || {};
    const teamName = team?.name || this.#getTeamName(failure.teamId) || "Клуб";
    const cap = formatSalaryMillions(failure.capRub);
    const projected = formatSalaryMillions(failure.projectedPayrollRub);
    return {
      accepted: false,
      decision: "salaryCap",
      message: failure.season
        ? `${teamName} превышает потолок зарплат на сезон ${failure.season}: ${projected} млн из ${cap} млн.`
        : "Контракт не помещается под потолок зарплат.",
      assessment,
    };
  }

  #buildNegotiationContext(team) {
    const rank = this.#standings.getRank(team.id, this.#teams);
    const teamsCount = this.#teams.length;
    const teamStats = this.#standings.getTeamStats(team.id);
    const teamGamesPlayed = teamStats?.gp || 0;
    const currentDate = this.#getEffectiveNegotiationDate();
    const seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
    const northAmericaInterestByPlayerId = new Map((team.getRoster?.() || []).map((player) => [
      player.id,
      this.#prospectDepartures.assess(player, { seasonLabel, seasonDate: currentDate }),
    ]).filter(([, risk]) => risk?.shouldSignal || risk?.score >= 40));
    return {
      teamRank: rank,
      teamsCount,
      teamGamesPlayed,
      currentDate,
      seasonLabel,
      isInTop8: rank !== null && rank <= 8,
      teamRoster: team.getRoster(),
      allPlayers: this.getAllPlayers(),
      northAmericaInterestByPlayerId,
    };
  }

  #queuePreseasonFreeAgentOffer(player, offer) {
    const preview = this.#contracts.getFreeAgentPreview(this.activeTeam, player, offer, this.#buildNegotiationContext(this.activeTeam));
    const capAssessment = this.#canSubmitContractOffer(this.activeTeam, player, preview.offer, "freeAgent", {
      ...this.#buildNegotiationContext(this.activeTeam),
      seasonLabel: this.#seasonState?.seasonLabel || this.#calendar.seasonLabel,
    });
    if (!capAssessment.allowed) return this.#buildSalaryCapRejection(capAssessment, this.activeTeam);
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

  #buildTransitionExternalRightsOffers(offers, seasonState) {
    const decisionIndex = Math.min((seasonState?.preseasonDates || []).length - 1, 1);
    return (offers || [])
      .filter((entry) => entry?.playerId && entry?.offer)
      .map((entry) => {
        const season = seasonState?.seasonLabel || this.#calendar.seasonLabel;
        const player = this.#externalPlayers.find((candidate) => candidate.id === entry.playerId);
        if (player?.externalCareer) player.externalCareer.lastKhlOfferSeason = season;
        return {
          id: `external-rights-offer-${entry.playerId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          playerId: entry.playerId,
          teamId: this.#activeTeamId,
          offer: { ...entry.offer },
          decisionIndex,
          season,
          status: "pending",
        };
      });
  }

  #hasPendingExternalRightsOffer(playerId) {
    return (this.#seasonState?.externalRightsOffers || [])
      .some((entry) => entry?.playerId === playerId && entry.status === "pending");
  }

  #resolveExternalRightsOfferWindow({ decisionIndex, decisionDate }) {
    const offers = (this.#seasonState?.externalRightsOffers || []).filter((entry) => Number(entry?.decisionIndex) === Number(decisionIndex) && entry.status === "pending");
    if (!offers.length) return;
    offers.forEach((entry) => this.#resolveExternalRightsOffer(entry, decisionDate));
    this.#seasonState = {
      ...this.#seasonState,
      externalRightsOffers: (this.#seasonState?.externalRightsOffers || []).map((entry) =>
        Number(entry?.decisionIndex) === Number(decisionIndex) && entry.status === "pending" ? { ...entry, status: "resolved" } : entry,
      ),
    };
  }

  #resolveExternalRightsOffer(entry, decisionDate) {
    const player = this.#externalPlayers.find((candidate) => candidate.id === entry.playerId);
    const team = this.#teams.find((candidate) => candidate.id === entry.teamId);
    if (!player || !team) return;
    const preview = this.#contracts.getFreeAgentPreview(team, player, entry.offer, { ...this.#buildNegotiationContext(team), currentDate: decisionDate });
    const decision = this.#externalRightsOffers.buildDecision({ player, offer: entry.offer, preview, teamId: team.id, decisionDate, seasonLabel: entry.season });
    if (decision.accepted) {
      const capAssessment = this.#canSubmitContractOffer(team, player, entry.offer, "freeAgent", { currentDate: decisionDate, seasonLabel: entry.season });
      if (!capAssessment.allowed) {
        this.#pushNotification({ id: `notification-external-offer-cap-${player.id}-${Date.now()}`, type: "free-agent-market", title: "Потолок зарплат", message: `${player.name} готов вернуться, но контракт не помещается под потолок ${team.name}.`, day: this.#calendar.currentDay, createdAt: new Date().toISOString(), playerId: player.id, read: false });
        return;
      }
      this.#contracts.finalizeFreeAgentSigning(team, player, entry.offer, { currentDate: decisionDate, seasonLabel: entry.season });
      player.affiliation.acquiredDay = this.#calendar.currentDay;
      this.#activateExternalPlayer(player, team, entry.season);
      this.#recordPlayerMovement({ player, fromTeamId: null, toTeamId: team.id, method: "externalReturn" });
      this.#pushNotification({ id: `notification-external-offer-accept-${player.id}-${Date.now()}`, type: "user-signing", title: "Ответ из НХЛ / АХЛ", message: `${player.name} принял предложение и возвращается в КХЛ`, day: this.#calendar.currentDay, createdAt: new Date().toISOString(), playerId: player.id, read: false });
      return;
    }
    player.externalCareer = { ...(player.externalCareer || {}), returnInterest: Math.max(0, (Number(player.externalCareer?.returnInterest) || 0) - 8) };
    this.#pushNotification({ id: `notification-external-offer-reject-${player.id}-${Date.now()}`, type: "free-agent-market", title: "Ответ из НХЛ / АХЛ", message: `${player.name} решил остаться в ${player.externalCareer?.league || "НХЛ / АХЛ"}`, day: this.#calendar.currentDay, createdAt: new Date().toISOString(), playerId: player.id, read: false });
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
      const team = this.#teams.find((candidate) => candidate.id === entry.teamId);
      const player = this.getAvailableFreeAgents().find((candidate) => candidate.id === entry.playerId);
      if (!this.#canSubmitContractOffer(team, player, entry.offer, "freeAgent", { currentDate: decisionDate, seasonLabel: this.#seasonState?.seasonLabel || this.#calendar.seasonLabel }).allowed) return;
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
    const capAssessment = this.#canSubmitContractOffer(team, player, winningOffer.offer, "freeAgent", {
      currentDate: decisionDate,
      seasonLabel: this.#seasonState?.seasonLabel || this.#calendar.seasonLabel,
    });
    if (!capAssessment.allowed) return;

    const newContracts = this.#contracts.finalizeFreeAgentSigning(team, player, winningOffer.offer, {
      currentDate: decisionDate,
      seasonLabel: this.#seasonState?.seasonLabel || this.#calendar.seasonLabel,
    });
    player.affiliation.acquiredDay = this.#calendar.currentDay;
    if (!team.getRoster().some((entry) => entry?.id === player.id)) {
      team.reservePlayers.push(player);
    }
    this.#freeAgents = dedupeFreeAgents(this.#freeAgents.filter((entry) => entry.id !== player.id));
    this.#refreshExpectedRoles(team);
    this.#recordPlayerMovement({ player, fromTeamId: null, toTeamId: team.id, method: "freeAgent" });

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

  #runNorthAmericaInterestWarnings(currentDate) {
    if (!this.#activeTeamId || !["regular", "playoffs"].includes(this.#seasonState?.phase)) return;
    const seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
    if (this.#seasonState?.northAmericaWarningSeason === seasonLabel) return;
    const warningDate = getNorthAmericaWarningDate(seasonLabel);
    const current = toDate(currentDate);
    if (!current || current < warningDate) return;
    const candidates = this.#buildNorthAmericaInterestCandidates(seasonLabel, currentDate);
    candidates.slice(0, 4).forEach((entry) => this.#pushNorthAmericaInterestNotification(entry, seasonLabel));
    this.#seasonState = { ...this.#seasonState, northAmericaWarningSeason: seasonLabel };
  }

  #buildNorthAmericaInterestCandidates(seasonLabel, currentDate) {
    const seasonEnd = parseSeasonEnd(seasonLabel);
    return [...(this.activeTeam?.getRoster() || []), ...(this.activeTeam?.juniorPlayers || [])]
      .map((player) => {
        const contracts = this.#contracts.getContractsForPlayer(player.id);
        const currentContract = contracts.find((contract) => contract.season === seasonLabel);
        if (!currentContract) return null;
        const latest = contracts.reduce((best, contract) => (
          parseSeasonEnd(contract.season) > parseSeasonEnd(best?.season) ? contract : best
        ), currentContract);
        const targetSeasonLabel = parseSeasonEnd(latest.season) > seasonEnd ? latest.season : seasonLabel;
        const seasonDate = targetSeasonLabel === seasonLabel ? currentDate : `${parseSeasonEnd(targetSeasonLabel)}-05-31`;
        const risk = this.#prospectDepartures.assess(player, { seasonLabel: targetSeasonLabel, seasonDate });
        const minimumScore = targetSeasonLabel === seasonLabel ? 35 : 50;
        if (!risk?.shouldSignal || risk.score < minimumScore) return null;
        return { player, risk, targetSeasonLabel, hasFutureContract: targetSeasonLabel !== seasonLabel };
      })
      .filter(Boolean)
      .sort((left, right) => right.risk.score - left.risk.score || right.player.ovr - left.player.ovr);
  }

  #pushNorthAmericaInterestNotification({ player, risk, targetSeasonLabel, hasFutureContract }, seasonLabel) {
    const id = `notification-na-watch-${seasonLabel}-${player.id}`;
    if (this.#notifications.some((notification) => notification.id === id)) return;
    if (hasFutureContract) {
      player.northAmericaIntent = { seasonLabel, targetSeasonLabel, league: risk.league, riskScore: risk.score, createdAtDay: this.#calendar.currentDay };
    }
    const ending = hasFutureContract ? `после окончания контракта ${formatContractEndDate(targetSeasonLabel)}` : "уже после этого сезона";
    this.#pushNotification({
      id,
      type: "offseason-departure",
      title: "Интерес НХЛ / АХЛ",
      message: `${player.name}: представители ${risk.league} следят за игроком, он может рассмотреть отъезд ${ending}. Риск: ${risk.score}/100.`,
      day: this.#calendar.currentDay,
      createdAt: new Date().toISOString(),
      playerId: player.id,
      read: false,
    });
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

  #releaseIneligibleJuniorPlayers({ notify = false } = {}) {
    const seasonLabel = this.#seasonState?.seasonLabel || this.#calendar.seasonLabel;
    const { released, promoted } = this.#juniors.releaseOveragePlayers({
      teams: this.#teams,
      seasonLabel,
      hasMainContract: (player, team) => {
        const contract = this.#contracts.getContractForSeason(player.id, seasonLabel);
        return contract?.teamId === team.id && contract.type !== ContractType.THREE_WAY;
      },
    });
    if (!released.length && !promoted.length) return;
    if (released.length) {
      this.#contracts.releasePlayers(released.map(({ player }) => player.id));
      this.#freeAgents = dedupeFreeAgents([...this.#freeAgents, ...released.map(({ player }) => player)]);
      released.forEach(({ player, team }) => {
        this.#recordPlayerMovement({ player, fromTeamId: team.id, toTeamId: null, method: "juniorRelease" });
      });
    }
    this.#seasonTransition.rebuildRosters(this.#teams, this.getAllPlayers());
    if (!notify || !released.length) return;
    released
      .filter(({ team }) => team.id === this.#activeTeamId)
      .forEach(({ player }) => {
        this.#pushNotification({
          id: `notification-junior-release-${player.id}-${Date.now()}`,
          type: "offseason-departure",
          title: "Выпуск молодежки",
          message: `${player.name} старше 20 лет на старте сезона и вышел на рынок свободных агентов`,
          day: this.#calendar.currentDay,
          createdAt: new Date().toISOString(),
          playerId: player.id,
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

  #ensureRosterContracts(seasonLabel) {
    (this.#teams || []).forEach((team) => {
      team.getRoster().forEach((player) => {
        if (!player?.id || player.affiliation?.teamId !== team.id) return;
        this.#contracts.ensureCurrentRosterContract(player, team.id, seasonLabel);
      });
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

  #recordOfferSheetCompensation(entry, player, newTeam) {
    this.#seasonState = {
      ...this.#seasonState,
      offerSheetCompensations: [...(this.#seasonState?.offerSheetCompensations || []), {
        id: `offer-sheet-comp-${entry.id}`,
        season: entry.season || this.#seasonState?.seasonLabel,
        playerId: player.id,
        playerName: player.name,
        fromTeamId: this.#activeTeamId,
        toTeamId: newTeam.id,
        toTeamName: newTeam.name,
        compensation: entry.compensation || { label: "Без компенсации", picks: [], cashRub: 0 },
        createdAt: new Date().toISOString(),
      }],
    };
  }

  #roundSalaryRub(value) {
    const salary = Math.max(500000, Number(value) || 0);
    const step = salary <= 10000000 ? 500000 : 1000000;
    return Math.round(salary / step) * step;
  }
}
