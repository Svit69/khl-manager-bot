const FORWARD_POSITIONS = new Set(["ЛНП", "ЦТР", "ПНП"]);
const isForwardPosition = (position) => FORWARD_POSITIONS.has(position);

export const adjustedOvrForPosition = (player, slotPosition) => {
  const baseOvr = player.currentOvr ?? player.ovr;
  if (!slotPosition) return baseOvr;
  const primary = player.identity.primaryPosition;
  const secondary = player.identity.secondaryPositions || [];
  if (slotPosition === primary) return baseOvr;
  if (secondary.includes(slotPosition)) return Math.max(0, baseOvr - 2);
  const isCrossGroup = (primary === "ЗАЩ" && isForwardPosition(slotPosition)) ||
    (isForwardPosition(primary) && slotPosition === "ЗАЩ");
  return Math.round(baseOvr * (isCrossGroup ? 0.72 : 0.82));
};

export const lineupScoreForPosition = (player, slotPosition) => adjustedOvrForPosition(player, slotPosition) * player.form;
