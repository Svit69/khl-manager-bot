const FORWARD_POSITIONS = new Set(["\u041b\u041d\u041f", "\u0426\u0422\u0420", "\u041f\u041d\u041f"]);

export const ATTRIBUTE_STEP_THRESHOLD = 2.1;
export const POTENTIAL_STEP_THRESHOLD = 1.2;

export const isForwardPosition = (position) => FORWARD_POSITIONS.has(position);

export const getAverageIceTime = (seasonStats) => {
  const games = Math.max(1, Number(seasonStats?.games) || 0);
  return ((Number(seasonStats?.totalIceTime) || 0) / 60) / games;
};

export const getPointsPerGame = (seasonStats) => {
  const games = Math.max(1, Number(seasonStats?.games) || 0);
  return (Number(seasonStats?.points) || 0) / games;
};

export const getShotsPerGame = (seasonStats) => {
  const games = Math.max(1, Number(seasonStats?.games) || 0);
  return (Number(seasonStats?.shots) || 0) / games;
};
