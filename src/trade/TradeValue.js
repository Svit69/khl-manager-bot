import { calculateAge } from "../contracts/SeasonUtils.js";
import { PlayerPosition } from "../models/PlayerPosition.js";
import { scoreTradeContractValue } from "./TradeContractValue.js";

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

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getAgeScore = (age) => {
  if (age <= 21) return 14;
  if (age <= 24) return 10;
  if (age <= 27) return 6;
  if (age <= 30) return 2;
  if (age <= 33) return -4;
  return -10;
};

const getNeedAdjustment = (team, position, reasons = []) => {
  const roster = team?.getRoster?.() || [];
  const count = roster.filter((player) => player.identity?.primaryPosition === position).length;
  const target = POSITION_TARGETS[position] || 0;
  if (!target) return 0;
  const delta = count - target;
  if (delta <= -2) {
    reasons.push("закрывает явный дефицит позиции");
    return 0.18;
  }
  if (delta === -1) {
    reasons.push("закрывает небольшую потребность позиции");
    return 0.1;
  }
  if (delta >= 4) {
    reasons.push("позиция переполнена в составе");
    return -0.2;
  }
  if (delta >= 2) {
    reasons.push("на этой позиции уже есть глубина");
    return -0.12;
  }
  return 0;
};

const getRoleScore = (team, player) => {
  if (!team || !player) return -3;
  for (let i = 0; i < (team.lines || []).length; i++) {
    if ((team.lines[i]?.players || []).some((item) => item?.id === player.id)) {
      return ROLE_SCORE_BY_LINE[i + 1] ?? -2;
    }
  }
  return -3;
};

const getRecentAcquisitionPenalty = (player, currentDay = null, reasons = []) => {
  const acquiredDay = player.affiliation?.acquiredDay;
  if (acquiredDay === null || acquiredDay === undefined) return 0;
  const games = player.seasonStats?.games || 0;
  const daysSince = currentDay === null || currentDay === undefined
    ? null
    : Math.max(0, Number(currentDay) - Number(acquiredDay));
  let penalty = -4;
  if (games <= 1) penalty = -34;
  else if (games <= 3) penalty = -24;
  else if (games <= 6) penalty = -14;
  if (daysSince !== null) {
    if (daysSince <= 7) penalty = Math.min(penalty, -32);
    else if (daysSince <= 20) penalty = Math.min(penalty, -20);
    else if (daysSince <= 45) penalty = Math.min(penalty, -10);
  }
  if (penalty <= -20) reasons.push("игрок недавно подписан или приобретен, ликвидность сильно снижена");
  else reasons.push("недавнее приобретение немного снижает ценность");
  return penalty;
};

const getProductionScore = (player, age, reasons = []) => {
  const position = player.identity?.primaryPosition;
  const points = (player.seasonStats?.goals || 0) + (player.seasonStats?.assists || 0);
  const games = Number(player.seasonStats?.games) || 0;
  if (!games) return 0;
  const ppg = points / Math.max(1, games);
  const sample = clamp(games / 18, 0.35, 1);
  const isDefense = position === PlayerPosition.DEF;
  let score = clamp(ppg * (isDefense ? 9 : 7) * sample, 0, 8);

  if (games >= 8 && age <= 24) {
    const strongYoungSeason = isDefense ? ppg >= 0.28 : ppg >= 0.45;
    const veryStrongYoungSeason = isDefense ? ppg >= 0.4 : ppg >= 0.65;
    if (veryStrongYoungSeason) {
      score += 10;
      reasons.push("молодой игрок уже дает сильную статистику в сезоне");
    } else if (strongYoungSeason) {
      score += 6;
      reasons.push("молодой игрок подтверждает ценность статистикой");
    }
  }

  if (games >= 12 && ppg <= 0.08 && !isDefense) {
    score -= 3;
    reasons.push("слабая результативность при заметной выборке матчей");
  }

  return score;
};

export const explainTradeValueForTeam = (team, player, contracts, context = null) => {
  const reasons = [];
  const age = calculateAge(player.identity?.birthDate, context?.currentDate);
  const ovr = Number(player.ovr) || 0;
  const potential = Number(player.potential?.potential) || ovr;
  const progress = Math.max(-10, Math.min(15, potential - ovr));
  const roleScore = getRoleScore(team, player);
  if (roleScore >= 5) reasons.push("важная роль в текущем составе");

  const raw =
    (ovr * 0.82) +
    (potential * 0.15) +
    getAgeScore(age) +
    scoreTradeContractValue(player, contracts, context, reasons) +
    roleScore +
    getRecentAcquisitionPenalty(player, context?.currentDay, reasons) +
    (progress * 0.35) +
    getProductionScore(player, age, reasons);
  const needAdjusted = raw * (1 + getNeedAdjustment(team, player.identity?.primaryPosition, reasons));
  const value = Math.max(-45, Math.min(120, Math.round(needAdjusted * 10) / 10));
  return { value, reasons: [...new Set(reasons)].slice(0, 4) };
};

export const calculateTradeValueForTeam = (team, player, contracts, context = null) =>
  explainTradeValueForTeam(team, player, contracts, context).value;
