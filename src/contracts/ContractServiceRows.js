import { calculateAge } from "./SeasonUtils.js";
import { getLatestContract, getMoodLabel, getMoodTone, getSeasonLabelFromDate } from "./ContractServiceShared.js";
import { getPlayerPhotoUrl } from "../utils/PlayerPhoto.js";

const compareTeamStatsRows = (left, right, sortBy) => {
  if (sortBy === "goals") {
    return (right.goals - left.goals) ||
      (right.points - left.points) ||
      (right.assists - left.assists);
  }

  if (sortBy === "iceTime") {
    const leftAverageIceTime = left.games ? left.totalIceTime / left.games : 0;
    const rightAverageIceTime = right.games ? right.totalIceTime / right.games : 0;
    return (rightAverageIceTime - leftAverageIceTime) ||
      (right.points - left.points) ||
      (right.goals - left.goals);
  }

  if (sortBy === "penaltyMinutes") {
    return (right.penaltyMinutes - left.penaltyMinutes) ||
      (right.games - left.games) ||
      (right.points - left.points);
  }

  if (sortBy === "plusMinus") {
    return (right.plusMinus - left.plusMinus) ||
      (right.points - left.points) ||
      (right.goals - left.goals);
  }

  return (right.points - left.points) ||
    (right.goals - left.goals) ||
    (right.assists - left.assists);
};

export const buildTeamContractRows = ({
  team,
  currentDate,
  parseSeasonEnd,
  formatContractEndDate,
  resolvePlayerContracts,
  isRenewalLocked,
  getRenewalLockReason,
}) =>
  team
    .getRoster()
    .map((player) => {
      const currentSeasonLabel = getSeasonLabelFromDate(currentDate);
      const playerId = player.id || null;
      if (!playerId) {
        return {
          playerId: null,
          displayName: player.name,
          photoUrl: getPlayerPhotoUrl(player),
          age: calculateAge(player.identity.birthDate, currentDate),
          ovr: player.currentOvr ?? player.ovr,
          position: player.identity?.primaryPosition || "",
          khlGamesPlayed: player.career?.khlGamesPlayed || 0,
          seasonStats: {
            games: player.seasonStats.games,
            goals: player.seasonStats.goals,
            assists: player.seasonStats.assists,
          },
          contractEndDate: null,
          contracts: [],
          currentSeasonLabel,
        };
      }

      const contracts = resolvePlayerContracts(playerId, player.affiliation.contractId);
      const lastContract = getLatestContract(contracts, (contract) => parseSeasonEnd(contract.season));
      const renewalLocked = isRenewalLocked(playerId, currentDate);

      return {
        playerId,
        displayName: player.name,
        photoUrl: getPlayerPhotoUrl(player),
        age: calculateAge(player.identity.birthDate, currentDate),
        ovr: player.currentOvr ?? player.ovr,
        position: player.identity?.primaryPosition || "",
        khlGamesPlayed: player.career?.khlGamesPlayed || 0,
        seasonStats: {
          games: player.seasonStats.games,
          goals: player.seasonStats.goals,
          assists: player.seasonStats.assists,
        },
        contractEndDate: formatContractEndDate(lastContract?.season),
        contracts,
        currentSeasonLabel,
        isRenewalLocked: renewalLocked,
        renewalLockReason: renewalLocked ? getRenewalLockReason(playerId, currentDate) : null,
      };
    })
    .sort((left, right) => left.displayName.localeCompare(right.displayName, "ru"));

export const buildTeamStatisticsRows = ({ team, sortBy = "points" }) => {
  const rows = team.getRoster().map((player) => ({
    playerId: player.id,
    displayName: player.name,
    photoUrl: getPlayerPhotoUrl(player),
    position: player.identity?.primaryPosition || "",
    ovr: player.currentOvr ?? player.ovr,
    games: player.seasonStats?.games || 0,
    points: player.seasonStats?.points || 0,
    goals: player.seasonStats?.goals || 0,
    assists: player.seasonStats?.assists || 0,
    plusMinus: player.seasonStats?.plusMinus || 0,
    penaltyMinutes: player.seasonStats?.penaltyMinutes || 0,
    totalIceTime: player.seasonStats?.totalIceTime || 0,
    mood: {
      score: player.moodScore,
      state: player.moodState,
      label: getMoodLabel(player.moodState),
      tone: getMoodTone(player.moodState),
    },
  }));

  return rows.sort((left, right) =>
    compareTeamStatsRows(left, right, sortBy) ||
    (right.ovr - left.ovr) ||
    left.displayName.localeCompare(right.displayName, "ru"),
  );
};

export const buildFreeAgentRows = (players, currentDate = null) =>
  (players || [])
    .map((player) => ({
      playerId: player.id,
      displayName: player.name,
      photoUrl: getPlayerPhotoUrl(player),
      age: calculateAge(player.identity.birthDate, currentDate),
      ovr: player.ovr,
      position: player.identity?.primaryPosition || "",
      khlGamesPlayed: player.career?.khlGamesPlayed || 0,
      seasonStats: {
        games: player.seasonStats.games,
        goals: player.seasonStats.goals,
        assists: player.seasonStats.assists,
      },
      contractEndDate: null,
      contracts: [],
    }))
    .sort((left, right) => right.ovr - left.ovr || left.displayName.localeCompare(right.displayName, "ru"));
