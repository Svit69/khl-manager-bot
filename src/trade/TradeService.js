import { buildCompetitiveLines } from "../data/lineupBuilder.js";
import { PlayerPosition } from "../models/PlayerPosition.js";
import { explainExternalRightsTradeValue } from "./ExternalRightsTradeValue.js";
import { explainTradeValueForTeam } from "./TradeValue.js";

const PACKAGE_CORRELATION_WEIGHTS = Object.freeze([1, 0.5, 0.28, 0.14]);
const LOW_QUALITY_PACKAGE_WEIGHTS = Object.freeze([0.75, 0.18, 0.08, 0.04]);
const MID_QUALITY_PACKAGE_WEIGHTS = Object.freeze([0.9, 0.28, 0.14, 0.06]);

const buildByIdMap = (players) => new Map((players || []).map((player) => [player.id, player]));
const normalizeAssetSelection = (ids) => (ids || []).map((id) => {
  const [type, value] = String(id).includes(":") ? String(id).split(":") : ["legacy", id];
  return { type, id: value };
});
const sum = (items) => (items || []).reduce((acc, value) => acc + (Number(value) || 0), 0);
const round = (value) => Math.round((Number(value) || 0) * 10) / 10;

const createDecision = (aiDelta, requiredPremium = 0) => {
  const threshold = Number(requiredPremium) || 0;
  if (aiDelta >= threshold + 1.5) return { accepted: true, label: "ИИ принимает обмен" };
  if (aiDelta >= threshold) return { accepted: true, label: "ИИ принимает, но сделка близка к равной" };
  if (aiDelta > threshold - 2) return { accepted: false, label: "ИИ отклоняет: не хватает премии за риск" };
  return { accepted: false, label: "ИИ отклоняет: составу невыгодно" };
};

const getAcceptanceHint = (aiDelta, requiredPremium = 0) => {
  const missing = round((Number(requiredPremium) || 0) - aiDelta);
  if (missing <= -4) return "Высокий шанс принятия";
  if (missing <= -1.5) return "Хороший шанс принятия";
  if (missing <= 0) return "Погранично, но возможно";
  if (missing <= 2) return `Нужно добавить ценность примерно +${Math.ceil(missing)} для ИИ`;
  return `Слишком большой разрыв: нужно примерно +${Math.ceil(missing + 1)} для ИИ`;
};

const toIndicator = (userDelta) => {
  if (userDelta >= 4) return { text: "Выгодно", tone: "good" };
  if (userDelta >= -3) return { text: "Близко к равному", tone: "neutral" };
  return { text: "Невыгодно", tone: "bad" };
};

const rebuildTeamRoster = (team, roster) => {
  const lineup = buildCompetitiveLines(roster);
  team.lines.splice(0, team.lines.length, ...lineup.lines);
  team.reservePlayers.splice(0, team.reservePlayers.length, ...lineup.reservePlayers);
};

const scoreRoster = (roster) =>
  buildCompetitiveLines(roster).lines.reduce((total, line) => total + line.getStrength(), 0);

const createRosterProjection = (team, nextRoster) => {
  const before = scoreRoster(team.getRoster());
  const after = scoreRoster(nextRoster);
  return {
    before: round(before),
    after: round(after),
    delta: round(after - before),
  };
};

const createPackageEvaluation = (items, valueKey, anchorOvr = null) => {
  const sorted = [...(items || [])].sort((left, right) => (right[valueKey] || 0) - (left[valueKey] || 0));
  const simple = round(sum(sorted.map((entry) => entry[valueKey])));
  const top = Number(sorted[0]?.[valueKey]) || 0;
  const second = Number(sorted[1]?.[valueKey]) || 0;
  const gapPenalty = sorted.length >= 3 && top - second >= 10 ? 0.86 : 1;
  const topOvr = Number(sorted[0]?.player?.ovr) || 0;
  const qualityGap = anchorOvr ? Math.max(0, Number(anchorOvr) - topOvr) : 0;
  const weights = qualityGap >= 8
    ? LOW_QUALITY_PACKAGE_WEIGHTS
    : qualityGap >= 5
      ? MID_QUALITY_PACKAGE_WEIGHTS
      : PACKAGE_CORRELATION_WEIGHTS;
  const effective = round(sorted.reduce((total, entry, index) => {
    const entryValue = Number(entry[valueKey]) || 0;
    if (entryValue < 0) return total + entryValue;
    const baseWeight = weights[index] ?? 0.08;
    const weight = index === 0 ? 1 : baseWeight * gapPenalty;
    const topWeight = index === 0 && qualityGap >= 8 ? weights[0] : weight;
    return total + entryValue * topWeight;
  }, 0));
  return {
    simple,
    effective,
    correlationPenalty: round(simple - effective),
  };
};

const createTradeValueEntry = (team, player, contracts, context, assetType = "player") => {
  const explained = explainTradeValueForTeam(team, player, contracts, context);
  const rights = assetType === "rights" ? explainExternalRightsTradeValue(team, player, explained.value, context) : null;
  const value = round(rights?.value ?? explained.value);
  const reasons = assetType === "rights" ? rights.reasons : explained.reasons;
  return { value, reasons };
};

const getApproxAge = (player) => {
  const birthDate = new Date(player?.identity?.birthDate);
  if (Number.isNaN(birthDate.getTime())) return 99;
  return new Date().getUTCFullYear() - birthDate.getUTCFullYear();
};

const getCorePlayerIds = (team) => {
  const roster = team?.getRoster?.() || [];
  const forwards = roster
    .filter((player) => player.identity?.primaryPosition !== PlayerPosition.DEF && player.identity?.primaryPosition !== PlayerPosition.G)
    .sort((left, right) => (right.ovr - left.ovr) || left.name.localeCompare(right.name, "ru"))
    .slice(0, 3);
  const defenders = roster
    .filter((player) => player.identity?.primaryPosition === PlayerPosition.DEF)
    .sort((left, right) => (right.ovr - left.ovr) || left.name.localeCompare(right.name, "ru"))
    .slice(0, 2);
  const bestYoung = roster
    .filter((player) => (Number(player.ovr) || 0) >= 72)
    .sort((left, right) => getApproxAge(left) - getApproxAge(right) || right.ovr - left.ovr)
    .slice(0, 1);
  return new Set([...forwards, ...defenders, ...bestYoung].map((player) => player.id));
};

const createBestPlayerPremium = (aiTeam, giveValues, receiveValues) => {
  const all = [
    ...giveValues.map((entry) => ({ ...entry, side: "user" })),
    ...receiveValues.map((entry) => ({ ...entry, side: "ai" })),
  ]
    .filter((entry) => entry.assetType !== "rights")
    .sort((left, right) => (right.player.ovr - left.player.ovr) || (right.aiValue || 0) - (left.aiValue || 0));
  const best = all[0] || null;
  if (!best || best.side !== "ai") return { premium: 0, reasons: [] };

  const bestIncoming = giveValues.reduce((max, entry) => Math.max(max, Number(entry.aiValue) || 0), 0);
  const bestIncomingOvr = giveValues.reduce((max, entry) => Math.max(max, Number(entry.player?.ovr) || 0), 0);
  const valueGap = Math.max(0, (Number(best.aiValue) || 0) - bestIncoming);
  const ovrGap = Math.max(0, (Number(best.player?.ovr) || 0) - bestIncomingOvr);
  const coreIds = getCorePlayerIds(aiTeam);
  let premium = 2 + valueGap * 0.22 + ovrGap * 2.4;
  const reasons = [];
  if (coreIds.has(best.player.id)) {
    premium += 5;
    reasons.push("игрок относится к ядру состава ИИ");
  }
  const cappedPremium = round(Math.min(36, premium));
  reasons.unshift(`ИИ отдает лучшего игрока сделки: нужна премия +${Math.ceil(cappedPremium)}`);
  return { premium: cappedPremium, reasons };
};

export class TradeService {
  #getPlayerContracts;
  #reassignPlayerContracts;
  #getCurrentDay;
  #getSeasonLabel;

  constructor({ getPlayerContracts, reassignPlayerContracts = null, getCurrentDay = null, getSeasonLabel = null } = {}) {
    this.#getPlayerContracts = getPlayerContracts;
    this.#reassignPlayerContracts = reassignPlayerContracts;
    this.#getCurrentDay = getCurrentDay;
    this.#getSeasonLabel = getSeasonLabel;
  }

  evaluateTrade(userTeam, aiTeam, givePlayerIds, receivePlayerIds, { userRightsPlayers = [], aiRightsPlayers = [] } = {}) {
    if (!userTeam || !aiTeam || userTeam.id === aiTeam.id) return null;

    const userRoster = userTeam.getRoster();
    const aiRoster = aiTeam.getRoster();
    const userById = buildByIdMap(userRoster);
    const aiById = buildByIdMap(aiRoster);
    const userRightsById = buildByIdMap(userRightsPlayers);
    const aiRightsById = buildByIdMap(aiRightsPlayers);

    const giveSelection = normalizeAssetSelection([...new Set(givePlayerIds || [])]);
    const receiveSelection = normalizeAssetSelection([...new Set(receivePlayerIds || [])]);
    const givePlayers = giveSelection.filter((entry) => entry.type !== "rights").map((entry) => userById.get(entry.id)).filter(Boolean);
    const receivePlayers = receiveSelection.filter((entry) => entry.type !== "rights").map((entry) => aiById.get(entry.id)).filter(Boolean);
    const giveRightsPlayers = giveSelection.filter((entry) => entry.type === "rights").map((entry) => userRightsById.get(entry.id)).filter(Boolean);
    const receiveRightsPlayers = receiveSelection.filter((entry) => entry.type === "rights").map((entry) => aiRightsById.get(entry.id)).filter(Boolean);
    const context = {
      currentDay: typeof this.#getCurrentDay === "function" ? this.#getCurrentDay() : null,
      seasonLabel: typeof this.#getSeasonLabel === "function" ? this.#getSeasonLabel() : null,
    };

    const giveValues = givePlayers.map((player) => {
      const user = createTradeValueEntry(userTeam, player, this.#getPlayerContracts(player.id), context);
      const ai = createTradeValueEntry(aiTeam, player, this.#getPlayerContracts(player.id), context);
      return { player, assetType: "player", userValue: user.value, aiValue: ai.value, userReasons: user.reasons, aiReasons: ai.reasons };
    });
    const receiveValues = receivePlayers.map((player) => {
      const user = createTradeValueEntry(userTeam, player, this.#getPlayerContracts(player.id), context);
      const ai = createTradeValueEntry(aiTeam, player, this.#getPlayerContracts(player.id), context);
      return { player, assetType: "player", userValue: user.value, aiValue: ai.value, userReasons: user.reasons, aiReasons: ai.reasons };
    });
    giveRightsPlayers.forEach((player) => {
      const user = createTradeValueEntry(userTeam, player, [], context, "rights");
      const ai = createTradeValueEntry(aiTeam, player, [], context, "rights");
      giveValues.push({ player, assetType: "rights", userValue: user.value, aiValue: ai.value, userReasons: user.reasons, aiReasons: ai.reasons });
    });
    receiveRightsPlayers.forEach((player) => {
      const user = createTradeValueEntry(userTeam, player, [], context, "rights");
      const ai = createTradeValueEntry(aiTeam, player, [], context, "rights");
      receiveValues.push({ player, assetType: "rights", userValue: user.value, aiValue: ai.value, userReasons: user.reasons, aiReasons: ai.reasons });
    });

    const userOutgoingBestOvr = giveValues.reduce((max, entry) => Math.max(max, Number(entry.player?.ovr) || 0), 0);
    const aiOutgoingBestOvr = receiveValues.reduce((max, entry) => Math.max(max, Number(entry.player?.ovr) || 0), 0);
    const userIncomingPackage = createPackageEvaluation(receiveValues, "userValue", userOutgoingBestOvr);
    const userOutgoingPackage = createPackageEvaluation(giveValues, "userValue");
    const aiIncomingPackage = createPackageEvaluation(giveValues, "aiValue", aiOutgoingBestOvr);
    const aiOutgoingPackage = createPackageEvaluation(receiveValues, "aiValue");
    const userOutgoing = userOutgoingPackage.effective;
    const userIncoming = userIncomingPackage.effective;
    const aiIncoming = aiIncomingPackage.effective;
    const aiOutgoing = aiOutgoingPackage.effective;

    const giveSet = new Set(givePlayers.map((player) => player.id));
    const receiveSet = new Set(receivePlayers.map((player) => player.id));
    const nextUserRoster = [
      ...userRoster.filter((player) => !giveSet.has(player.id)),
      ...receivePlayers,
    ];
    const nextAiRoster = [
      ...aiRoster.filter((player) => !receiveSet.has(player.id)),
      ...givePlayers,
    ];
    const userRosterProjection = createRosterProjection(userTeam, nextUserRoster);
    const aiRosterProjection = createRosterProjection(aiTeam, nextAiRoster);
    const userRosterImpact = round(userRosterProjection.delta * 20);
    const aiRosterImpact = round(aiRosterProjection.delta * 20);
    const premium = createBestPlayerPremium(aiTeam, giveValues, receiveValues);

    const userDelta = round(userIncoming - userOutgoing + userRosterImpact);
    const aiDelta = round(aiIncoming - aiOutgoing + aiRosterImpact);
    const indicator = toIndicator(userDelta);
    const decision = createDecision(aiDelta, premium.premium);
    const reasons = [
      aiIncomingPackage.correlationPenalty >= 5 ? `пакет входящих для ИИ снижен на ${aiIncomingPackage.correlationPenalty}: несколько игроков не равноценны одному лидеру` : null,
      aiRosterProjection.delta < -1 ? `прогноз состава ИИ после обмена: ${aiRosterProjection.delta}` : null,
      aiRosterProjection.delta > 1 ? `прогноз состава ИИ после обмена: +${aiRosterProjection.delta}` : null,
      ...premium.reasons,
      ...giveValues.flatMap((entry) => entry.aiReasons.map((reason) => `${entry.player.name}: ${reason}`)),
      ...receiveValues.flatMap((entry) => entry.aiReasons.map((reason) => `${entry.player.name}: ${reason}`)),
    ].filter(Boolean).slice(0, 7);

    const isValid = giveValues.length > 0 && receiveValues.length > 0;
    return {
      userTeam,
      aiTeam,
      givePlayers,
      receivePlayers,
      giveRightsPlayers,
      receiveRightsPlayers,
      giveValues,
      receiveValues,
      userOutgoing,
      userIncoming,
      userSimpleOutgoing: userOutgoingPackage.simple,
      userSimpleIncoming: userIncomingPackage.simple,
      userDelta,
      aiDelta,
      aiIncoming,
      aiOutgoing,
      aiSimpleIncoming: aiIncomingPackage.simple,
      aiSimpleOutgoing: aiOutgoingPackage.simple,
      aiRequiredPremium: premium.premium,
      userRosterProjection,
      aiRosterProjection,
      indicator,
      decision,
      acceptanceHint: getAcceptanceHint(aiDelta, premium.premium),
      reasons,
      isValid,
    };
  }

  executeTrade(userTeam, aiTeam, givePlayerIds, receivePlayerIds, rightsOptions = {}) {
    const evaluation = this.evaluateTrade(userTeam, aiTeam, givePlayerIds, receivePlayerIds, rightsOptions);
    if (!evaluation || !evaluation.isValid) {
      return { accepted: false, message: "Добавьте хотя бы одного игрока с каждой стороны." };
    }
    if (!evaluation.decision.accepted) {
      return { accepted: false, message: evaluation.decision.label, evaluation };
    }

    const giveSet = new Set(evaluation.givePlayers.map((player) => player.id));
    const receiveSet = new Set(evaluation.receivePlayers.map((player) => player.id));
    const nextUserRoster = [
      ...userTeam.getRoster().filter((player) => !giveSet.has(player.id)),
      ...evaluation.receivePlayers,
    ];
    const nextAiRoster = [
      ...aiTeam.getRoster().filter((player) => !receiveSet.has(player.id)),
      ...evaluation.givePlayers,
    ];

    const acquiredDay = typeof this.#getCurrentDay === "function" ? this.#getCurrentDay() : null;
    evaluation.givePlayers.forEach((player) => {
      player.affiliation.teamId = aiTeam.id;
      player.affiliation.acquiredDay = acquiredDay;
      this.#reassignPlayerContracts?.(player.id, aiTeam.id);
    });
    evaluation.receivePlayers.forEach((player) => {
      player.affiliation.teamId = userTeam.id;
      player.affiliation.acquiredDay = acquiredDay;
      this.#reassignPlayerContracts?.(player.id, userTeam.id);
    });
    evaluation.giveRightsPlayers.forEach((player) => {
      player.externalCareer.rightsTeamId = aiTeam.id;
    });
    evaluation.receiveRightsPlayers.forEach((player) => {
      player.externalCareer.rightsTeamId = userTeam.id;
    });
    rebuildTeamRoster(userTeam, nextUserRoster);
    rebuildTeamRoster(aiTeam, nextAiRoster);

    return {
      accepted: true,
      message: "Обмен принят.",
      evaluation,
    };
  }
}
