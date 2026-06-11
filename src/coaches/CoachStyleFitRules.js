import { calculateAge, clamp } from "../contracts/SeasonUtils.js";

const avg = (items) => items.length ? items.reduce((sum, value) => sum + value, 0) / items.length : 0;
const attr = (player, key) => Number(player?.effectiveAttributesJson?.[key] ?? player?.attributes?.attributesJson?.[key] ?? 60);
const pos = (player) => player?.identity?.primaryPosition;
const ageOf = (player) => calculateAge(player?.identity?.birthDate);

const balancedScore = (values) => {
  const spread = Math.max(...values) - Math.min(...values);
  return clamp(avg(values) - spread * 0.55, 45, 98);
};

export const getCoachFitLabel = (score) =>
  score >= 82 ? "Идеально" : score >= 72 ? "Хорошо" : score >= 62 ? "Нейтрально" : "Конфликт";

export const getPlayerCoachStyleFit = (coach, player) => {
  const values = ["shot", "speed", "physical", "defense", "skill"].map((key) => attr(player, key));
  const age = ageOf(player);
  const potentialGap = Math.max(0, (Number(player?.potential?.potential) || player?.ovr || 0) - (player?.ovr || 0));
  const isDefender = pos(player) === "ЗАЩ";
  const formulas = {
    "Атакующий": () => attr(player, "shot") * 0.32 + attr(player, "skill") * 0.3 + attr(player, "speed") * 0.24 + attr(player, "defense") * 0.14,
    "Оборонительный": () => attr(player, "defense") * 0.42 + attr(player, "physical") * 0.2 + attr(player, "speed") * 0.14 + (player.ovr || 65) * 0.24 + (isDefender ? 4 : 0),
    "Силовой": () => attr(player, "physical") * 0.38 + attr(player, "defense") * 0.22 + attr(player, "shot") * 0.16 + (player.ovr || 65) * 0.24,
    "Молодежный": () => (player.ovr || 65) * 0.45 + potentialGap * 1.4 + (age <= 23 ? 8 : age <= 26 ? 4 : -3) + attr(player, "speed") * 0.18 + attr(player, "skill") * 0.18,
    "Системный": () => balancedScore(values) * 0.58 + attr(player, "defense") * 0.2 + (player.ovr || 65) * 0.22,
    "Звездный": () => (player.ovr || 65) * 0.62 + (Number(player?.career?.reputation) || player.ovr || 65) * 0.22 + attr(player, "skill") * 0.16,
    "Гибридный": () => avg(values) * 0.62 + (player.ovr || 65) * 0.38,
  };
  return clamp(Math.round((formulas[coach?.style] || formulas["Гибридный"])()), 40, 99);
};

export const getPlayerCoachPosition = pos;
