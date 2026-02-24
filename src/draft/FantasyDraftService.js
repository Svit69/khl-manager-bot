import { calculateAge } from "../contracts/SeasonUtils.js";
import { generateUuid } from "../utils/uuid.js";

const POSITION_ALL = "ALL";
const DEFAULT_SORT = "ovr";
const DRAFT_POSITION_TARGETS = Object.freeze({ CTR: 4, LW: 4, RW: 4, DEF: 6, G: 2 });
const TEAM_DRAFT_ARCHETYPES = Object.freeze(["balanced", "win-now", "youth"]);

const FLOW_STAGE = Object.freeze({
  CREATED: "Создать/начать драфт",
  ORDER: "Определен порядок",
  PICKS: "Раунды выбора игроков",
  FILLED: "Ростеры заполнены",
  LINES: "Автосбор звеньев",
  SEASON: "Старт сезона"
});

const compareByOvr = (a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name, "ru");
const compareByPosition = (a, b) => {
  const posA = a.identity?.primaryPosition || "";
  const posB = b.identity?.primaryPosition || "";
  return posA.localeCompare(posB, "ru") || compareByOvr(a, b);
};
const compareByAge = (a, b) => calculateAge(a.identity?.birthDate) - calculateAge(b.identity?.birthDate) || compareByOvr(a, b);

export class FantasyDraftService {
  #draftId;
  #teams;
  #rounds;
  #userTeamId;
  #availablePlayers;
  #pickedByTeamId = new Map();
  #pickLog = [];
  #pickIndex = 0;
  #draftOrder;
  #teamArchetypeById = new Map();

  constructor(teams, players, userTeamId, rounds = 20) {
    this.#draftId = generateUuid();
    this.#teams = [...teams];
    this.#rounds = rounds;
    this.#userTeamId = userTeamId;
    this.#availablePlayers = [...players];
    this.#teams.forEach((team, index) => {
      this.#pickedByTeamId.set(team.id, []);
      this.#teamArchetypeById.set(team.id, TEAM_DRAFT_ARCHETYPES[index % TEAM_DRAFT_ARCHETYPES.length]);
    });
    this.#draftOrder = this.#buildDraftOrder();
  }

  static fromSnapshot(teams, players, snapshot) {
    if (!snapshot) return null;
    const service = new FantasyDraftService(teams, players, snapshot.userTeamId, snapshot.rounds);
    const playersById = new Map(players.map((player) => [player.id, player]));
    const readPlayers = (ids) => (ids || []).map((id) => playersById.get(id)).filter(Boolean);

    service.#draftId = snapshot.draftId || service.#draftId;
    service.#pickIndex = Math.max(0, Number(snapshot.pickIndex) || 0);
    service.#availablePlayers = readPlayers(snapshot.availablePlayerIds);
    service.#pickLog = [...(snapshot.pickLog || [])];
    service.#pickedByTeamId.clear();
    service.#teams.forEach((team) => {
      const pickedIds = snapshot.pickedPlayerIdsByTeamId?.[team.id] || [];
      service.#pickedByTeamId.set(team.id, readPlayers(pickedIds));
    });
    return service;
  }

  get draftId() { return this.#draftId; }

  toSnapshot() {
    const pickedPlayerIdsByTeamId = {};
    this.#teams.forEach((team) => {
      pickedPlayerIdsByTeamId[team.id] = (this.#pickedByTeamId.get(team.id) || []).map((player) => player.id);
    });
    return {
      draftId: this.#draftId,
      rounds: this.#rounds,
      userTeamId: this.#userTeamId,
      pickIndex: this.#pickIndex,
      availablePlayerIds: this.#availablePlayers.map((player) => player.id),
      pickedPlayerIdsByTeamId,
      pickLog: [...this.#pickLog]
    };
  }

  get isComplete() {
    return this.#pickIndex >= this.#rounds * this.#teams.length || this.#availablePlayers.length === 0;
  }

  getCurrentTeam() {
    if (this.isComplete) return null;
    const order = this.#draftOrder[this.#pickIndex];
    return this.#teams.find((team) => team.id === order.teamId) || null;
  }

  isUserTurn() {
    return this.getCurrentTeam()?.id === this.#userTeamId;
  }

  hasAvailablePlayer(playerId) {
    return this.#availablePlayers.some((player) => player.id === playerId);
  }

  getUserRosterByPosition() {
    return this.getTeamRosterByPosition(this.#userTeamId);
  }

  getTeamRosterByPosition(teamId) {
    return this.#groupPlayersByPosition([...(this.#pickedByTeamId.get(teamId) || [])]);
  }

  getView(sortBy = DEFAULT_SORT, filterPosition = POSITION_ALL) {
    const filtered = this.#availablePlayers.filter((player) =>
      filterPosition === POSITION_ALL || (player.identity?.primaryPosition || "") === filterPosition
    );
    const sorted = [...filtered].sort(
      sortBy === "position" ? compareByPosition : (sortBy === "age" ? compareByAge : compareByOvr)
    );
    const currentTeam = this.getCurrentTeam();
    return {
      draftId: this.#draftId,
      currentTeamId: currentTeam?.id || null,
      currentTeamName: currentTeam?.name || "",
      currentRound: Math.floor(this.#pickIndex / this.#teams.length) + 1,
      currentPickInRound: (this.#pickIndex % this.#teams.length) + 1,
      pickNumber: this.#pickIndex + 1,
      totalPicks: this.#rounds * this.#teams.length,
      isComplete: this.isComplete,
      isUserTurn: this.isUserTurn(),
      sortBy,
      filterPosition,
      availablePlayers: sorted,
      userRosterByPosition: this.getUserRosterByPosition(),
      teams: this.#teams.map((team) => ({
        id: team.id,
        name: team.name,
        pickedCount: (this.#pickedByTeamId.get(team.id) || []).length
      })),
      pickLog: [...this.#pickLog],
      flow: [
        { step: FLOW_STAGE.CREATED, isDone: true, isCurrent: false },
        { step: FLOW_STAGE.ORDER, isDone: true, isCurrent: false },
        { step: FLOW_STAGE.PICKS, isDone: this.isComplete, isCurrent: !this.isComplete },
        { step: FLOW_STAGE.FILLED, isDone: this.isComplete, isCurrent: false },
        { step: FLOW_STAGE.LINES, isDone: false, isCurrent: false },
        { step: FLOW_STAGE.SEASON, isDone: false, isCurrent: false }
      ],
      upcomingOrder: this.#draftOrder.slice(this.#pickIndex, Math.min(this.#pickIndex + 8, this.#draftOrder.length))
    };
  }

  pickPlayer(playerId) {
    if (this.isComplete) return null;
    const team = this.getCurrentTeam();
    if (!team) return null;
    const playerIndex = this.#availablePlayers.findIndex((player) => player.id === playerId);
    if (playerIndex === -1) return null;

    const player = this.#availablePlayers.splice(playerIndex, 1)[0];
    this.#pickedByTeamId.get(team.id).push(player);
    this.#pickLog.push({
      pickNumber: this.#pickIndex + 1,
      round: Math.floor(this.#pickIndex / this.#teams.length) + 1,
      teamId: team.id,
      teamName: team.name,
      playerName: player.name
    });
    this.#pickIndex++;
    return { team, player };
  }

  autoPickUntilUserTurn() {
    while (!this.isComplete && !this.isUserTurn()) {
      const currentTeam = this.getCurrentTeam();
      const best = currentTeam ? this.#selectBestAiPick(currentTeam) : [...this.#availablePlayers].sort(compareByOvr)[0];
      if (!best) break;
      this.pickPlayer(best.id);
    }
  }

  getAssignments() {
    const result = {};
    this.#teams.forEach((team) => { result[team.id] = [...(this.#pickedByTeamId.get(team.id) || [])]; });
    return result;
  }

  #groupPlayersByPosition(players) {
    const byPosition = { CTR: [], LW: [], RW: [], DEF: [], G: [] };
    players.forEach((player) => {
      const position = player.identity?.primaryPosition || "";
      if (position === "ЦТР") byPosition.CTR.push(player);
      else if (position === "ЛНП") byPosition.LW.push(player);
      else if (position === "ПНП") byPosition.RW.push(player);
      else if (position === "ЗАЩ") byPosition.DEF.push(player);
      else if (position === "ВРТ") byPosition.G.push(player);
    });
    return byPosition;
  }

  #selectBestAiPick(team) {
    const round = Math.floor(this.#pickIndex / this.#teams.length) + 1;
    const phase = this.#getDraftPhase(round);
    const teamRosterByPosition = this.getTeamRosterByPosition(team.id);
    const pickedCount = (this.#pickedByTeamId.get(team.id) || []).length;
    const remainingTeamPicks = Math.max(0, this.#rounds - pickedCount);
    const deficits = this.#getPositionDeficits(teamRosterByPosition);
    const totalDeficit = Object.values(deficits).reduce((sum, value) => sum + value, 0);
    const archetype = this.#teamArchetypeById.get(team.id) || "balanced";

    let bestPlayer = null;
    let bestScore = -Infinity;
    for (const player of this.#availablePlayers) {
      const score = this.#scoreAiPick(player, {
        round,
        phase,
        teamRosterByPosition,
        remainingTeamPicks,
        deficits,
        totalDeficit,
        archetype
      });
      if (score > bestScore) {
        bestScore = score;
        bestPlayer = player;
      }
    }
    return bestPlayer;
  }

  #getDraftPhase(round) {
    if (round <= 8) return "early";
    if (round <= 15) return "mid";
    return "late";
  }

  #getPositionDeficits(teamRosterByPosition) {
    return {
      CTR: Math.max(0, DRAFT_POSITION_TARGETS.CTR - (teamRosterByPosition.CTR?.length || 0)),
      LW: Math.max(0, DRAFT_POSITION_TARGETS.LW - (teamRosterByPosition.LW?.length || 0)),
      RW: Math.max(0, DRAFT_POSITION_TARGETS.RW - (teamRosterByPosition.RW?.length || 0)),
      DEF: Math.max(0, DRAFT_POSITION_TARGETS.DEF - (teamRosterByPosition.DEF?.length || 0)),
      G: Math.max(0, DRAFT_POSITION_TARGETS.G - (teamRosterByPosition.G?.length || 0))
    };
  }

  #scoreAiPick(player, context) {
    const positionKey = this.#mapPlayerPositionKey(player.identity?.primaryPosition);
    const currentCount = positionKey ? (context.teamRosterByPosition[positionKey]?.length || 0) : 0;
    const targetCount = positionKey ? (DRAFT_POSITION_TARGETS[positionKey] || 0) : 0;
    const deficit = positionKey ? (context.deficits[positionKey] || 0) : 0;
    const ovr = Number(player.ovr) || 0;
    const age = calculateAge(player.identity?.birthDate);
    const potential = Number(player.potential?.potential) || ovr;

    const picksPressure = context.remainingTeamPicks > 0 ? Math.min(1, context.totalDeficit / context.remainingTeamPicks) : 1;
    const needUrgency = context.remainingTeamPicks > 0 ? Math.min(1, deficit / context.remainingTeamPicks) : 0;
    const needRatio = targetCount > 0 ? deficit / targetCount : 0;
    const overfillPenalty = (targetCount > 0 && currentCount >= targetCount) ? (currentCount - targetCount + 1) : 0;
    const strategyBonus = this.#scoreAgePotentialByArchetype({ age, potential, ovr, archetype: context.archetype, phase: context.phase });
    const tinyRandom = rand(-1.1, 1.1);

    let score = 0;
    if (context.phase === "early") {
      score += ovr * 1.48;
      score += needRatio * 10;
      score += needUrgency * 8;
      if (currentCount === 0 && deficit > 0) score += 4;
      score += strategyBonus * 0.28;
      if (context.totalDeficit > 0 && overfillPenalty > 0) score -= 6 * overfillPenalty;
      if (context.round >= 3 && context.totalDeficit >= context.remainingTeamPicks && deficit === 0) score -= 8;
    } else if (context.phase === "mid") {
      score += ovr * 1.02;
      score += needRatio * 22;
      score += needUrgency * 20;
      score += picksPressure * 8 * (deficit > 0 ? 1 : -0.6);
      score += strategyBonus * 0.52;
      if (context.totalDeficit > 0 && deficit === 0) score -= 10 + 8 * picksPressure;
      if (overfillPenalty > 0) score -= 14 * overfillPenalty;
    } else {
      score += (ovr - 68) * 0.9;
      score += needRatio * 18;
      score += needUrgency * 26;
      score += picksPressure * 14 * (deficit > 0 ? 1 : -0.8);
      score += strategyBonus * 0.72;
      if (context.totalDeficit > 0 && deficit === 0) score -= 12 + 14 * picksPressure;
      if (overfillPenalty > 0) score -= 16 * overfillPenalty;
    }

    if (positionKey === "G") {
      if (context.phase === "early" && currentCount >= 1) score -= 8;
      if (context.phase !== "early" && deficit > 0 && picksPressure > 0.6) score += 8;
    }

    // Small noise prevents deterministic drafts but is too small to overturn clear BPA gaps.
    return score + tinyRandom;
  }

  #scoreAgePotentialByArchetype({ age, potential, ovr, archetype, phase }) {
    const youthValue = Math.max(0, 25 - age);
    const primeValue = Math.max(0, 8 - Math.abs(28 - age));
    const potentialGap = Math.max(-4, Math.min(12, potential - ovr));

    if (archetype === "youth") {
      if (phase === "early") return youthValue * 0.95 + potentialGap * 0.95 + ovr * 0.08;
      if (phase === "mid") return youthValue * 1.25 + potentialGap * 1.25 + ovr * 0.06;
      return youthValue * 1.55 + potentialGap * 1.45 + ovr * 0.03;
    }

    if (archetype === "win-now") {
      const agePenalty = age > 33 ? (age - 33) * 1.5 : 0;
      if (phase === "early") return primeValue * 1.2 + ovr * 0.18 - agePenalty;
      if (phase === "mid") return primeValue * 1.4 + ovr * 0.12 + potentialGap * 0.28 - agePenalty;
      return primeValue * 0.9 + ovr * 0.08 + potentialGap * 0.22 - agePenalty;
    }

    if (phase === "early") return primeValue * 0.95 + potentialGap * 0.65 + ovr * 0.08;
    if (phase === "mid") return primeValue * 1.0 + potentialGap * 0.85 + Math.max(0, 28 - age) * 0.25;
    return primeValue * 0.65 + potentialGap * 1.0 + Math.max(0, 27 - age) * 0.45;
  }

  #mapPlayerPositionKey(position) {
    if (position === "ЦТР") return "CTR";
    if (position === "ЛНП") return "LW";
    if (position === "ПНП") return "RW";
    if (position === "ЗАЩ") return "DEF";
    if (position === "ВРТ") return "G";
    return null;
  }

  #buildDraftOrder() {
    const order = [];
    for (let round = 1; round <= this.#rounds; round++) {
      const forward = (round % 2) === 1;
      const teamIds = forward ? this.#teams.map((team) => team.id) : [...this.#teams.map((team) => team.id)].reverse();
      teamIds.forEach((teamId, index) => {
        order.push({ draftId: this.#draftId, round, pick: index + 1, teamId });
      });
    }
    return order;
  }
}
