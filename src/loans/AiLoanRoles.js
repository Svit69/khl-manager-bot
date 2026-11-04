import { PlayerPosition as P } from '../models/PlayerPosition.js';
import { isCorePlayer } from '../trade/AiIncomingTradeRules.js';

export const aiLoanPosition = (player) => player?.identity?.primaryPosition;
const floors = { [P.CTR]: 4, [P.LW]: 4, [P.RW]: 4, [P.DEF]: 7, [P.G]: 2 };
const starters = { [P.CTR]: 4, [P.LW]: 4, [P.RW]: 4, [P.DEF]: 6, [P.G]: 2 };
const group = (player) => [P.DEF, P.G].includes(aiLoanPosition(player)) ? aiLoanPosition(player) : 'FWD';
export const aiLoanRank = (team, player) => 1 + team.getRoster().filter((other) =>
  other.id !== player.id && aiLoanPosition(other) === aiLoanPosition(player) &&
  (other.ovr >= player.ovr)).length;

export const aiLoanAge = (player, date) => {
  const birth = new Date(player?.identity?.birthDate);
  const now = new Date(date);
  if (!Number.isFinite(birth.getTime()) || !Number.isFinite(now.getTime())) return NaN;
  const beforeBirthday = now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  return now.getUTCFullYear() - birth.getUTCFullYear() - Number(beforeBirthday);
};

export const isAiLoanSurplus = (owner, player, date) => {
  const age = aiLoanAge(player, date);
  const position = aiLoanPosition(player);
  if (!(age >= 0 && age <= 24) || !Number.isFinite(player.ovr) || !floors[position]) return false;
  if (isCorePlayer(owner, player) || aiLoanRank(owner, player) <= starters[position]) return false;
  const remaining = owner.getRoster().filter((entry) => entry.id !== player.id);
  const groupFloor = position === P.G ? 2 : position === P.DEF ? 8 : 13;
  return remaining.filter((entry) => aiLoanPosition(entry) === position).length >= floors[position] &&
    remaining.filter((entry) => group(entry) === group(player)).length >= groupFloor;
};

export const aiLoanRoleImprovement = (owner, borrower, player) => {
  const donorRank = aiLoanRank(owner, player);
  const receiverRank = aiLoanRank(borrower, player);
  const limit = aiLoanPosition(player) === P.G ? 2 : aiLoanPosition(player) === P.DEF ? 6 : 3;
  return receiverRank <= limit && donorRank - receiverRank >= 2 ? { donorRank, receiverRank } : null;
};
