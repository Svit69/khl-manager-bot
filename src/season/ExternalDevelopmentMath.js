export const LEAGUE_DEVELOPMENT_BONUS = Object.freeze({
  NHL: 0.2,
  AHL: 0.14,
  CHL: 0.18,
  NCAA: 0.16,
  USHL: 0.13,
});

export const stableUnit = (source) => {
  let hash = 2166136261;
  String(source || "").split("").forEach((char) => {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return (hash >>> 0) / 4294967295;
};

export const getLeagueDevelopmentBonus = (league) =>
  LEAGUE_DEVELOPMENT_BONUS[String(league || "").toUpperCase()] ?? 0.1;

export const getAgeDevelopmentScore = (age) => {
  if (age <= 20) return 0.42;
  if (age <= 23) return 0.31;
  if (age <= 26) return 0.16;
  if (age >= 32) return -0.24;
  if (age >= 29) return -0.09;
  return 0.03;
};

export const getDevelopmentStepCount = (score, gap) => {
  const magnitude = Math.abs(score);
  if (magnitude < 0.12) return 0;
  if (score > 0 && gap >= 5 && magnitude >= 0.5) return 5;
  if (magnitude >= 0.32) return 4;
  return 3;
};

export const pickAttributeKey = (keys, playerId, seasonLabel, step) =>
  keys[Math.floor(stableUnit(`${playerId}:${seasonLabel}:external-attr:${step}`) * keys.length)] || keys[0];
