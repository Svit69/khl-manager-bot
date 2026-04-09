import { calculateAge } from "../SeasonUtils.js";

const FORWARD_POSITIONS = new Set(["ЛНП", "ЦТР", "ПНП"]);

export const POSITION_SCARCITY_TARGETS = { FWD: 9, DEF: 6, G: 2 };

export const STRATEGY_NEGOTIATION_CHANCE = {
  contender: 0.9,
  competitive: 0.78,
  balanced: 0.62,
  rebuild: 0.38,
};

export const STRATEGY_MONTHLY_SLOTS = {
  contender: 4,
  competitive: 3,
  balanced: 2,
  rebuild: 1,
};

export const OFFSEASON_RENEWAL_SLOTS_BY_STRATEGY = {
  contender: 8,
  competitive: 7,
  balanced: 6,
  rebuild: 4,
};

export const OFFSEASON_SIGNINGS_BY_STRATEGY = {
  contender: 6,
  competitive: 6,
  balanced: 5,
  rebuild: 4,
};

export const average = (values) =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;

export const roundSalaryRub = (value) =>
  Math.max(500000, Math.round((Number(value) || 0) / 500000) * 500000);

export const getPositionGroup = (position) => {
  if (position === "ЗАЩ") return "DEF";
  if (position === "ВРТ") return "G";
  if (FORWARD_POSITIONS.has(position)) return "FWD";
  return "FWD";
};

export const getCurrentSeasonEndYear = (currentDate) => {
  const date = new Date(currentDate);
  if (Number.isNaN(date.getTime())) return 2026;
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();
  return month >= 8 ? year + 1 : year;
};

export const getAverageIceMinutes = (player) => {
  const games = Math.max(1, Number(player?.seasonStats?.games) || 0);
  return ((Number(player?.seasonStats?.totalIceTime) || 0) / 60) / games;
};

export const getPointsPerGame = (player) => {
  const games = Math.max(1, Number(player?.seasonStats?.games) || 0);
  const points =
    Number(player?.seasonStats?.points) ||
    (Number(player?.seasonStats?.goals) || 0) + (Number(player?.seasonStats?.assists) || 0);
  return points / games;
};

export const getLineInfo = (team, player) => {
  const lines = team?.lines || [];
  for (let index = 0; index < lines.length; index++) {
    const slotIndex = (lines[index]?.players || []).findIndex((candidate) => candidate?.id === player?.id);
    if (slotIndex !== -1) {
      return {
        lineIndex: index + 1,
        slotIndex,
        slotPosition: lines[index]?.positions?.[slotIndex] || player?.identity?.primaryPosition || null,
      };
    }
  }
  return { lineIndex: null, slotIndex: null, slotPosition: null };
};

export const createAgeCalculator = (currentDate) => (player) =>
  calculateAge(player?.identity?.birthDate, currentDate);
