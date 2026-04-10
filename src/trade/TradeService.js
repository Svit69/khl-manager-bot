import { buildCompetitiveLines } from "../data/lineupBuilder.js";
import { calculateTradeValueForTeam } from "./TradeValue.js";

const buildByIdMap = (players) => new Map((players || []).map((player) => [player.id, player]));

const sum = (items) => (items || []).reduce((acc, value) => acc + (Number(value) || 0), 0);

const createDecision = (aiDelta) => {
  if (aiDelta >= 1.5) return { accepted: true, label: "ИИ принимает обмен" };
  if (aiDelta >= 0) return { accepted: true, label: "ИИ принимает (близко к равному)" };
  if (aiDelta > -2) return { accepted: false, label: "ИИ отклоняет: неравноценный баланс" };
  return { accepted: false, label: "ИИ отклоняет: слишком невыгодно для состава" };
};
const getAcceptanceHint = (aiDelta) => {
  if (aiDelta >= 4) return "Высокий шанс принятия";
  if (aiDelta >= 1.5) return "Хороший шанс принятия";
  if (aiDelta >= 0) return "Погранично, но возможно";
  if (aiDelta >= -2) return `Добавьте ценность примерно +${Math.ceil(Math.abs(aiDelta) + 1)} для ИИ`;
  return `Слишком большой разрыв: нужно +${Math.ceil(Math.abs(aiDelta) + 2)} для ИИ`;
};

const toIndicator = (userDelta) => {
  if (userDelta >= 4) return { icon: "🟢", text: "Выгодно", tone: "good" };
  if (userDelta >= -3) return { icon: "🟡", text: "Близко к равному", tone: "neutral" };
  return { icon: "🔴", text: "Невыгодно", tone: "bad" };
};

const rebuildTeamRoster = (team, roster) => {
  const lineup = buildCompetitiveLines(roster);
  team.lines.splice(0, team.lines.length, ...lineup.lines);
  team.reservePlayers.splice(0, team.reservePlayers.length, ...lineup.reservePlayers);
};

export class TradeService {
  #getPlayerContracts;
  #reassignPlayerContracts;
  #getCurrentDay;

  constructor({ getPlayerContracts, reassignPlayerContracts = null, getCurrentDay = null } = {}) {
    this.#getPlayerContracts = getPlayerContracts;
    this.#reassignPlayerContracts = reassignPlayerContracts;
    this.#getCurrentDay = getCurrentDay;
  }

  evaluateTrade(userTeam, aiTeam, givePlayerIds, receivePlayerIds) {
    if (!userTeam || !aiTeam || userTeam.id === aiTeam.id) return null;

    const userRoster = userTeam.getRoster();
    const aiRoster = aiTeam.getRoster();
    const userById = buildByIdMap(userRoster);
    const aiById = buildByIdMap(aiRoster);

    const givePlayers = [...new Set(givePlayerIds || [])].map((id) => userById.get(id)).filter(Boolean);
    const receivePlayers = [...new Set(receivePlayerIds || [])].map((id) => aiById.get(id)).filter(Boolean);

    const giveValues = givePlayers.map((player) => ({
      player,
      userValue: calculateTradeValueForTeam(userTeam, player, this.#getPlayerContracts(player.id)),
      aiValue: calculateTradeValueForTeam(aiTeam, player, this.#getPlayerContracts(player.id))
    }));
    const receiveValues = receivePlayers.map((player) => ({
      player,
      userValue: calculateTradeValueForTeam(userTeam, player, this.#getPlayerContracts(player.id)),
      aiValue: calculateTradeValueForTeam(aiTeam, player, this.#getPlayerContracts(player.id))
    }));

    const userOutgoing = sum(giveValues.map((entry) => entry.userValue));
    const userIncoming = sum(receiveValues.map((entry) => entry.userValue));
    const aiIncoming = sum(giveValues.map((entry) => entry.aiValue));
    const aiOutgoing = sum(receiveValues.map((entry) => entry.aiValue));
    const userDelta = Math.round((userIncoming - userOutgoing) * 10) / 10;
    const aiDelta = Math.round((aiIncoming - aiOutgoing) * 10) / 10;
    const indicator = toIndicator(userDelta);
    const decision = createDecision(aiDelta);

    const isValid = givePlayers.length > 0 && receivePlayers.length > 0;
    return {
      userTeam,
      aiTeam,
      givePlayers,
      receivePlayers,
      giveValues,
      receiveValues,
      userOutgoing,
      userIncoming,
      userDelta,
      aiDelta,
      indicator,
      decision,
      acceptanceHint: getAcceptanceHint(aiDelta),
      isValid
    };
  }

  executeTrade(userTeam, aiTeam, givePlayerIds, receivePlayerIds) {
    const evaluation = this.evaluateTrade(userTeam, aiTeam, givePlayerIds, receivePlayerIds);
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
      ...evaluation.receivePlayers
    ];
    const nextAiRoster = [
      ...aiTeam.getRoster().filter((player) => !receiveSet.has(player.id)),
      ...evaluation.givePlayers
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
    rebuildTeamRoster(userTeam, nextUserRoster);
    rebuildTeamRoster(aiTeam, nextAiRoster);

    return {
      accepted: true,
      message: "Обмен принят.",
      evaluation
    };
  }
}
