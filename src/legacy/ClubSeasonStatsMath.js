export const CLUB_STAT_METRICS = ["games", "goals", "assists", "points", "plusMinus", "penaltyMinutes", "totalIceTime", "shotsAgainst", "saves", "goalsAgainst", "shutouts", "qualityStarts"];

export const snapshotPlayerSeasonStats = (player) =>
  Object.fromEntries(CLUB_STAT_METRICS.map((key) => [key, Number(player?.seasonStats?.[key]) || 0]));

export const subtractClubStats = (stats = {}, baseline = {}) =>
  Object.fromEntries(CLUB_STAT_METRICS.map((key) => [
    key,
    key === "plusMinus"
      ? (Number(stats[key]) || 0) - (Number(baseline[key]) || 0)
      : Math.max(0, (Number(stats[key]) || 0) - (Number(baseline[key]) || 0)),
  ]));

export const hasClubStats = (row) => CLUB_STAT_METRICS.some((key) => Number(row?.[key]) || 0);
