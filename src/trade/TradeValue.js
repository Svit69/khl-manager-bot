import { calculateAge } from "../contracts/SeasonUtils.js";
import { PlayerPosition } from "../models/PlayerPosition.js";

const ROLE_SCORE_BY_LINE = Object.freeze({
  1: 8,
  2: 5,
  3: 2,
  4: 0,
  5: -4
});

const POSITION_TARGETS = Object.freeze({
  [PlayerPosition.CTR]: 4,
  [PlayerPosition.LW]: 4,
  [PlayerPosition.RW]: 4,
  [PlayerPosition.DEF]: 7,
  [PlayerPosition.G]: 2
});

const getAgeScore = (age) => {
  if (age <= 21) return 14;
  if (age <= 24) return 10;
  if (age <= 27) return 6;
  if (age <= 30) return 2;
  if (age <= 33) return -4;
  return -10;
};

const estimateMarketSalary = (ovr) => Math.max(800000, Math.round((ovr - 50) * 1800000));

const getContractScore = (ovr, contracts) => {
  const latest = [...(contracts || [])]
    .sort((a, b) => String(a.season || "").localeCompare(String(b.season || "")))
    .slice(-1)[0];
  if (!latest?.salaryRub) return 0;
  const market = estimateMarketSalary(ovr);
  const ratio = market / Math.max(1, latest.salaryRub);
  if (ratio >= 1.25) return 10;
  if (ratio >= 1.05) return 6;
  if (ratio >= 0.9) return 2;
  if (ratio >= 0.75) return -4;
  return -10;
};

const getNeedAdjustment = (team, position) => {
  const roster = team.getRoster();
  const count = roster.filter((player) => player.identity?.primaryPosition === position).length;
  const target = POSITION_TARGETS[position] || 0;
  if (!target) return 0;
  const delta = count - target;
  if (delta <= -2) return 0.18;
  if (delta === -1) return 0.1;
  if (delta >= 4) return -0.2;
  if (delta >= 2) return -0.12;
  return 0;
};

const getRoleScore = (team, player) => {
  for (let i = 0; i < (team.lines || []).length; i++) {
    if ((team.lines[i]?.players || []).some((item) => item.id === player.id)) {
      return ROLE_SCORE_BY_LINE[i + 1] ?? -2;
    }
  }
  return -3;
};

const getRecentAcquisitionPenalty = (player) => {
  const acquiredDay = player.affiliation?.acquiredDay;
  if (acquiredDay === null || acquiredDay === undefined) return 0;
  const games = player.seasonStats?.games || 0;
  if (games <= 1) return -26;
  if (games <= 3) return -18;
  if (games <= 6) return -10;
  return -4;
};

export const calculateTradeValueForTeam = (team, player, contracts) => {
  const age = calculateAge(player.identity?.birthDate);
  const ovr = Number(player.ovr) || 0;
  const potential = Number(player.potential?.potential) || ovr;
  const progress = Math.max(-10, Math.min(15, potential - ovr));
  const points = (player.seasonStats?.goals || 0) + (player.seasonStats?.assists || 0);
  const games = Math.max(1, player.seasonStats?.games || 0);
  const ppg = points / games;

  const raw =
    (ovr * 0.7) +
    (potential * 0.35) +
    getAgeScore(age) +
    getContractScore(ovr, contracts) +
    getRoleScore(team, player) +
    getRecentAcquisitionPenalty(player) +
    (progress * 0.9) +
    (ppg * 4);
  const needAdjusted = raw * (1 + getNeedAdjustment(team, player.identity?.primaryPosition));
  return Math.max(20, Math.min(120, Math.round(needAdjusted * 10) / 10));
};
