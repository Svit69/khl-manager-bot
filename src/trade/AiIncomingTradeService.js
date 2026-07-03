import { AI_TRADE_POSITION_TARGETS, countPosition, getPlayerPosition, getPositionAverageOvr, hashText, isCorePlayer, sortPlayersByValue, toTradePlayerId } from "./AiIncomingTradeRules.js";
export class AiIncomingTradeService {
  buildOffer({ teams, activeTeam, seasonLabel, day, valueOf, evaluateTrade, isCapAllowed }) {
    if (!activeTeam || typeof evaluateTrade !== "function" || typeof valueOf !== "function") return null;
    for (const entry of this.#buildCandidates(teams, activeTeam, valueOf, seasonLabel, day)) {
      const receivePlayerIds = this.#buildAiPackage(entry.aiTeam, entry.userPlayer, evaluateTrade);
      if (!receivePlayerIds.length) continue;
      const givePlayerIds = [toTradePlayerId(entry.userPlayer)];
      const evaluation = evaluateTrade(entry.aiTeam.id, givePlayerIds, receivePlayerIds);
      if (!evaluation?.decision?.accepted || evaluation.userDelta < 2 || evaluation.userDelta > 22) continue;
      if (isCapAllowed && !isCapAllowed(entry.aiTeam.id, givePlayerIds, receivePlayerIds)) continue;
      return this.#createOffer(entry.aiTeam, entry.userPlayer, receivePlayerIds, evaluation, seasonLabel, day);
    }
    return null;
  }
  #buildCandidates(teams, activeTeam, valueOf, seasonLabel, day) {
    const userRoster = activeTeam.getRoster().filter((player) => (player.ovr || 0) >= 66 && !isCorePlayer(activeTeam, player));
    return (teams || []).filter((team) => team.id !== activeTeam.id).flatMap((team) =>
      Object.entries(AI_TRADE_POSITION_TARGETS).flatMap(([pos, target]) =>
        this.#buildPositionCandidates(team, pos, target, userRoster, valueOf, seasonLabel, day)))
      .sort((left, right) => left.seed - right.seed);
  }
  #buildPositionCandidates(team, position, targetCount, userRoster, valueOf, seasonLabel, day) {
    const rankedPlayers = sortPlayersByValue(userRoster.filter((player) => getPlayerPosition(player) === position), team, valueOf);
    const strongestOption = rankedPlayers[0]?.player;
    const hasRosterNeed = countPosition(team, position) < targetCount;
    const hasUpgradeNeed = strongestOption && (strongestOption.ovr || 0) >= getPositionAverageOvr(team, position) + 3;
    if (!hasRosterNeed && !hasUpgradeNeed) return [];
    return rankedPlayers.slice(0, 4).map(({ player }) => ({
      aiTeam: team,
      userPlayer: player,
      seed: hashText(`${seasonLabel}:${day}:${team.id}:${player.id}`),
    }));
  }
  #buildAiPackage(aiTeam, userPlayer, evaluateTrade) {
    const aiAssets = aiTeam.getRoster().filter((player) => !isCorePlayer(aiTeam, player) && player.id !== userPlayer.id && (player.ovr || 0) >= 62);
    const ranked = aiAssets.sort((left, right) => (right.ovr - left.ovr) || left.name.localeCompare(right.name, "ru")).slice(0, 10);
    const singles = ranked.map((player) => [toTradePlayerId(player)]);
    const pairs = ranked.flatMap((left, index) => ranked.slice(index + 1, index + 5).map((right) => [toTradePlayerId(left), toTradePlayerId(right)]));
    return [...singles, ...pairs].map((ids) => ({ ids, evaluation: evaluateTrade(aiTeam.id, [toTradePlayerId(userPlayer)], ids) }))
      .filter((item) => item.evaluation?.decision?.accepted && item.evaluation.userDelta >= 2 && item.evaluation.userDelta <= 22)
      .sort((left, right) => Math.abs(left.evaluation.userDelta - 7) - Math.abs(right.evaluation.userDelta - 7))[0]?.ids || [];
  }
  #createOffer(aiTeam, userPlayer, receivePlayerIds, evaluation, seasonLabel, day) {
    return { id: `ai-trade-${seasonLabel}-${day}-${aiTeam.id}-${userPlayer.id}`, status: "pending", teamId: aiTeam.id, givePlayerIds: [toTradePlayerId(userPlayer)], receivePlayerIds, day, expiresDay: day + 10, userDelta: evaluation.userDelta };
  }
}
