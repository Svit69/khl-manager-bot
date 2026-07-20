import { clamp } from "./SeasonUtils.js";
import { getFallbackMarketSalaryRub } from "./FallbackMarketSalary.js";
import { getPositionMarketGroup, roundSalaryRub } from "./ContractServiceShared.js";

const getMarketGroupLabel = (group) => {
  if (group === "DEF") return "\u0417\u0430\u0449\u0438\u0442\u043d\u0438\u043a\u0438";
  if (group === "G") return "\u0412\u0440\u0430\u0442\u0430\u0440\u0438";
  return "\u041d\u0430\u043f\u0430\u0434\u0430\u044e\u0449\u0438\u0435";
};

const getPointsPerGame = (player) => {
  const games = Math.max(1, Number(player?.seasonStats?.games) || 0);
  const points =
    Number(player?.seasonStats?.points) ||
    (Number(player?.seasonStats?.goals) || 0) + (Number(player?.seasonStats?.assists) || 0);
  return points / games;
};

const getShotsPerGame = (player) => {
  const games = Math.max(1, Number(player?.seasonStats?.games) || 0);
  return (Number(player?.seasonStats?.shots) || 0) / games;
};

const getIceMinutesPerGame = (player) => {
  const games = Math.max(1, Number(player?.seasonStats?.games) || 0);
  return ((Number(player?.seasonStats?.totalIceTime) || 0) / 60) / games;
};

const getSavePercentage = (player) =>
  Number(player?.seasonStats?.savePercentage) || 0;

const getGoalsAgainstAverage = (player) => {
  const games = Math.max(1, Number(player?.seasonStats?.games) || 0);
  return (Number(player?.seasonStats?.goalsAgainst) || 0) / games;
};

const getQualityStartRate = (player) => {
  const games = Math.max(1, Number(player?.seasonStats?.games) || 0);
  return (Number(player?.seasonStats?.qualityStarts) || 0) / games;
};

const getGoalieMarketModifier = ({ player, peers, context, progressFactor }) => {
  const teamGamesPlayed = Math.max(1, Number(context?.teamGamesPlayed) || Number(player?.seasonStats?.games) || 1);
  const startShare = (Number(player?.seasonStats?.games) || 0) / teamGamesPlayed;
  const comparablePeers = peers.filter((candidate) => (candidate?.seasonStats?.games || 0) >= 5);
  const average = (values) => (values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0);
  const peerSavePercentage = average(comparablePeers.map(getSavePercentage)) || 0.9;
  const peerGoalsAgainstAverage = average(comparablePeers.map(getGoalsAgainstAverage)) || 2.8;
  let premium = 0;
  premium += clamp((getSavePercentage(player) - peerSavePercentage) * 1.7, -0.08, 0.12);
  premium += clamp((peerGoalsAgainstAverage - getGoalsAgainstAverage(player)) * 0.025, -0.04, 0.05);
  premium += clamp((getQualityStartRate(player) - 0.42) * 0.12, -0.03, 0.04);
  premium += clamp((startShare - 0.45) * 0.08, -0.02, 0.04);
  return 1 + clamp(premium * progressFactor, -0.12, 0.18);
};

const getSeasonMarketModifier = ({ player, peers, context }) => {
  const gamesPlayed = Number(player?.seasonStats?.games) || 0;
  const teamGamesPlayed = Number(context?.teamGamesPlayed) || 0;
  if (gamesPlayed < 5 || teamGamesPlayed < 5 || !peers.length) {
    return 1;
  }

  const progressFactor = clamp(teamGamesPlayed / 40, 0.15, 1);
  const comparablePeers = peers.filter((candidate) => (candidate?.seasonStats?.games || 0) >= 5);
  if (!comparablePeers.length) {
    return 1;
  }

  if (getPositionMarketGroup(player.identity?.primaryPosition) === "G") {
    return getGoalieMarketModifier({ player, peers, context, progressFactor });
  }

  const average = (values) => (values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0);
  const ppgGap = getPointsPerGame(player) - average(comparablePeers.map((candidate) => getPointsPerGame(candidate)));
  const shotsGap = getShotsPerGame(player) - average(comparablePeers.map((candidate) => getShotsPerGame(candidate)));
  const iceGap = getIceMinutesPerGame(player) - average(comparablePeers.map((candidate) => getIceMinutesPerGame(candidate)));

  let premium = 0;
  premium += clamp(ppgGap * 0.2, -0.08, 0.12);
  premium += clamp(shotsGap * 0.03, -0.03, 0.04);
  premium += clamp(iceGap * 0.01, -0.02, 0.03);

  return 1 + clamp(premium * progressFactor, -0.1, 0.15);
};

const getRatingMarketFloorFactor = (ovr) => {
  if (ovr >= 84) return 1.12;
  if (ovr >= 80) return 1.08;
  if (ovr >= 75) return 1.04;
  return 1;
};

export const estimateMarketSalary = ({ player, context, lastContract, getReferenceSalary }) => {
  const allPlayers = Array.isArray(context?.allPlayers) ? context.allPlayers : [];
  const playerOvr = Number(player.ovr) || 0;
  const minOvr = playerOvr - 1;
  const maxOvr = playerOvr + 1;
  const marketGroup = getPositionMarketGroup(player.identity?.primaryPosition);

  const sameGroupPlayers = allPlayers.filter(
    (candidate) =>
      candidate?.id !== player.id &&
      getPositionMarketGroup(candidate?.identity?.primaryPosition) === marketGroup,
  );
  const peers = sameGroupPlayers.filter((candidate) => Math.abs((candidate?.ovr || 0) - playerOvr) <= 1);

  const peerSalaries = peers
    .map((candidate) => getReferenceSalary(candidate.id))
    .filter((salary) => Number.isFinite(salary) && salary > 0);

  const marketModifier = getSeasonMarketModifier({ player, peers, context });
  const ratingFloor = getFallbackMarketSalaryRub(player) * getRatingMarketFloorFactor(playerOvr);
  const rangeLabel = `${getMarketGroupLabel(marketGroup)} - OVR ${minOvr}-${maxOvr}`;

  if (peerSalaries.length) {
    const averageSalary = peerSalaries.reduce((total, value) => total + value, 0) / peerSalaries.length;
    return {
      salaryRub: roundSalaryRub(Math.max(ratingFloor, averageSalary * marketModifier)),
      sampleSize: peerSalaries.length,
      rangeLabel,
    };
  }

  const fallbackSalary = getFallbackMarketSalaryRub(player);
  const expandedPeers = sameGroupPlayers.filter((candidate) => Math.abs((candidate?.ovr || 0) - playerOvr) <= 3);
  const expandedPeerSalaries = expandedPeers
    .map((candidate) => {
      const salary = getReferenceSalary(candidate.id);
      if (!Number.isFinite(salary) || salary <= 0) return null;
      const candidateFallback = getFallbackMarketSalaryRub(candidate);
      return salary * (fallbackSalary / Math.max(1, candidateFallback));
    })
    .filter((salary) => Number.isFinite(salary) && salary > 0);

  if (expandedPeerSalaries.length) {
    const averageSalary = expandedPeerSalaries.reduce((total, value) => total + value, 0) / expandedPeerSalaries.length;
    return {
      salaryRub: roundSalaryRub(Math.max(ratingFloor, averageSalary * marketModifier)),
      sampleSize: expandedPeerSalaries.length,
      rangeLabel: `${getMarketGroupLabel(marketGroup)} - OVR ${playerOvr - 3}-${playerOvr + 3}`,
    };
  }

  const fallbackBase = Math.max(ratingFloor, Number(lastContract?.salaryRub) || fallbackSalary);
  return {
    salaryRub: roundSalaryRub(fallbackBase * marketModifier),
    sampleSize: 0,
    rangeLabel,
  };
};
