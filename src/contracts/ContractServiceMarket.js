import { clamp } from "./SeasonUtils.js";
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

export const estimateMarketSalary = ({ player, context, lastContract, getReferenceSalary }) => {
  const allPlayers = Array.isArray(context?.allPlayers) ? context.allPlayers : [];
  const minOvr = (player.ovr || 0) - 1;
  const maxOvr = (player.ovr || 0) + 1;
  const marketGroup = getPositionMarketGroup(player.identity?.primaryPosition);

  const peers = allPlayers.filter(
    (candidate) =>
      candidate?.id !== player.id &&
      Math.abs((candidate?.ovr || 0) - (player.ovr || 0)) <= 1 &&
      getPositionMarketGroup(candidate?.identity?.primaryPosition) === marketGroup,
  );

  const peerSalaries = peers
    .map((candidate) => getReferenceSalary(candidate.id))
    .filter((salary) => Number.isFinite(salary) && salary > 0);

  const marketModifier = getSeasonMarketModifier({ player, peers, context });
  const rangeLabel = `${getMarketGroupLabel(marketGroup)} - OVR ${minOvr}-${maxOvr}`;

  if (peerSalaries.length) {
    const averageSalary = peerSalaries.reduce((total, value) => total + value, 0) / peerSalaries.length;
    return {
      salaryRub: roundSalaryRub(Math.max(1000000, averageSalary * marketModifier)),
      sampleSize: peerSalaries.length,
      rangeLabel,
    };
  }

  const fallbackBase = lastContract?.salaryRub || Math.max(1000000, Math.round((player.ovr || 0) * 1000000));
  return {
    salaryRub: roundSalaryRub(fallbackBase * marketModifier),
    sampleSize: 0,
    rangeLabel,
  };
};
