const pickWeightedAttribute = (weightMap) => {
  const entries = Object.entries(weightMap).filter(([, weight]) => Number(weight) > 0);
  const totalWeight = entries.reduce((total, [, weight]) => total + weight, 0);
  if (!entries.length || totalWeight <= 0) return null;
  let roll = Math.random() * totalWeight;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
};

const getGoalieAttributeWeights = ({ direction, savePercentage, qualityStartRate, age, peakAge }) => {
  if (direction > 0) {
    return {
      reaction: 1.2 + Math.max(0, savePercentage - 0.9) * 8,
      positioning: 1.08 + qualityStartRate * 0.5,
      puckControl: 0.9 + qualityStartRate * 0.36,
      athleticism: age <= 25 ? 1.04 : 0.72,
      mental: age >= 24 ? 0.96 : 0.68,
    };
  }

  const yearsPastPeak = Math.max(0, age - peakAge);
  return {
    athleticism: 1.22 + yearsPastPeak * 0.16,
    reaction: 1.08 + yearsPastPeak * 0.11,
    puckControl: 0.9 + Math.max(0, 0.895 - savePercentage) * 5,
    positioning: 0.82 + Math.max(0, yearsPastPeak - 2) * 0.06,
    mental: 0.58,
  };
};

export const applyGoalieAttributeStep = (player, direction, context = {}) => {
  const seasonStats = player?.seasonStats || {};
  const games = Math.max(1, Number(seasonStats.games) || 0);
  const savePercentage = Number(seasonStats.savePercentage) || 0;
  const qualityStartRate = (Number(seasonStats.qualityStarts) || 0) / games;
  const peakAge = Number(player?.potential?.peakAge) || 28;
  const attributeKey = pickWeightedAttribute(getGoalieAttributeWeights({
    direction,
    savePercentage,
    qualityStartRate,
    age: Number(context.age) || peakAge,
    peakAge,
  }));
  if (!attributeKey) return null;
  player.attributes.applyAttributeDelta(attributeKey, direction);
  return attributeKey;
};
