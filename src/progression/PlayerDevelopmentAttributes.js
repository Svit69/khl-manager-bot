import { isForwardPosition } from "./PlayerDevelopmentShared.js";

export const applyAttributeStep = (player, direction, pointsPerGame, shotsPerGame, age) => {
  const weights = getAttributeWeights(player, direction, pointsPerGame, shotsPerGame, age);
  const attributeKey = pickWeightedAttribute(weights);
  if (!attributeKey) return null;
  player.attributes.applyAttributeDelta(attributeKey, direction);
  return attributeKey;
};

const getAttributeWeights = (player, direction, pointsPerGame, shotsPerGame, age) => {
  const isForward = isForwardPosition(player.identity?.primaryPosition);
  if (direction > 0) {
    return isForward
      ? {
          shot: 1.2 + shotsPerGame * 0.18,
          skill: 1.15 + pointsPerGame * 0.3,
          speed: 0.85,
          physical: 0.6,
          defense: 0.45,
        }
      : {
          defense: 1.25 + pointsPerGame * 0.12,
          physical: 0.95,
          skill: 0.82 + pointsPerGame * 0.15,
          speed: 0.78,
          shot: 0.55 + shotsPerGame * 0.08,
        };
  }

  const peakAge = Number(player.potential?.peakAge) || 27;
  const yearsPastPeak = Math.max(0, age - peakAge);
  return isForward
    ? {
        speed: 1.2 + yearsPastPeak * 0.12,
        physical: 0.78 + Math.max(0, yearsPastPeak - 1) * 0.06,
        shot: 0.92 + Math.max(0, 2.2 - shotsPerGame) * 0.05,
        skill: 0.86 + Math.max(0, yearsPastPeak - 2) * 0.03,
        defense: 0.48,
      }
    : {
        speed: 1.08 + yearsPastPeak * 0.1,
        physical: 0.96 + Math.max(0, yearsPastPeak - 1) * 0.05,
        defense: 0.94 + Math.max(0, yearsPastPeak - 2) * 0.04,
        skill: 0.82 + Math.max(0, yearsPastPeak - 3) * 0.03,
        shot: 0.5,
      };
};

const pickWeightedAttribute = (weightMap) => {
  const entries = Object.entries(weightMap).filter(([, weight]) => Number(weight) > 0);
  if (!entries.length) return null;

  const totalWeight = entries.reduce((total, [, weight]) => total + weight, 0);
  let roll = Math.random() * totalWeight;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
};
