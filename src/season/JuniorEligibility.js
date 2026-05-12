import { calculateAge, parseSeasonStart } from "../contracts/SeasonUtils.js";

export const getJuniorSeasonStartDate = (seasonLabel) => {
  const startYear = parseSeasonStart(seasonLabel) || new Date().getUTCFullYear();
  return new Date(Date.UTC(startYear, 8, 1));
};

export const getJuniorSeasonAge = (player, seasonLabel) =>
  calculateAge(player?.identity?.birthDate, getJuniorSeasonStartDate(seasonLabel));

export const isJuniorAgeEligible = (player, seasonLabel) => getJuniorSeasonAge(player, seasonLabel) <= 20;

export const getJuniorIneligibilityReason = ({ player, seasonLabel, hasThreeWayContract }) => {
  if (!isJuniorAgeEligible(player, seasonLabel)) return "Старше 20 на старте сезона";
  if (!hasThreeWayContract) return "Нужен 3-сторонний контракт";
  return null;
};
