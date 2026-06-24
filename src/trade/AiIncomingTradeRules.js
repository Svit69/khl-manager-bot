import { PlayerPosition } from "../models/PlayerPosition.js";

export const AI_TRADE_POSITION_TARGETS = Object.freeze({
  [PlayerPosition.CTR]: 4,
  [PlayerPosition.LW]: 4,
  [PlayerPosition.RW]: 4,
  [PlayerPosition.DEF]: 7,
  [PlayerPosition.G]: 2,
});

export const hashText = (value) =>
  [...String(value || "")].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);

export const getPlayerPosition = (player) => player?.identity?.primaryPosition || "";
export const toTradePlayerId = (player) => `player:${player.id}`;
export const countPosition = (team, position) => (team?.getRoster?.() || []).filter((player) => getPlayerPosition(player) === position).length;
export const getPositionAverageOvr = (team, position) => {
  const players = (team?.getRoster?.() || []).filter((player) => getPlayerPosition(player) === position);
  return players.length ? players.reduce((sum, player) => sum + (Number(player.ovr) || 0), 0) / players.length : 0;
};
export const isCorePlayer = (team, player) => (team?.lines || []).slice(0, 2).some((line) => (line.players || []).some((entry) => entry?.id === player.id));
export const sortPlayersByValue = (players, team, valueOf) =>
  [...players].map((player) => ({ player, value: valueOf(team, player) })).sort((left, right) => right.value - left.value);
