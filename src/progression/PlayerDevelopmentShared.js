const FORWARD_POSITIONS = new Set(["\u041b\u041d\u041f", "\u0426\u0422\u0420", "\u041f\u041d\u041f"]);

export const ATTRIBUTE_STEP_THRESHOLD = 2.1;
export const POTENTIAL_STEP_THRESHOLD = 1.2;

export const isForwardPosition = (position) => FORWARD_POSITIONS.has(position);

export const getAttributeStepThreshold = (player, direction = 1) => {
  const ovr = Number(player?.ovr) || 70;
  const potential = Number(player?.potential?.potential) || ovr;
  const potentialGap = potential - ovr;

  if (direction < 0) {
    let threshold = ATTRIBUTE_STEP_THRESHOLD;
    if (ovr >= 88) threshold = 1.75;
    else if (ovr >= 84) threshold = 1.9;
    else if (ovr >= 80) threshold = 2.05;
    else if (ovr <= 70) threshold = 2.35;
    if (potentialGap <= -2) threshold -= 0.15;
    return Math.max(1.55, threshold);
  }

  let threshold = ATTRIBUTE_STEP_THRESHOLD;
  if (ovr < 68) threshold = 1.35;
  else if (ovr < 72) threshold = 1.55;
  else if (ovr < 76) threshold = 1.85;
  else if (ovr < 80) threshold = 2.25;
  else if (ovr < 84) threshold = 2.85;
  else if (ovr < 88) threshold = 3.65;
  else threshold = 4.7;

  if (potentialGap >= 8) threshold *= 0.78;
  else if (potentialGap >= 4) threshold *= 0.88;
  else if (potentialGap <= 0) threshold *= 1.28;
  else if (potentialGap <= 2) threshold *= 1.12;

  return Math.max(1.2, threshold);
};

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
