import { calculateAge, clamp, parseSeasonEnd } from "../contracts/SeasonUtils.js";

const STATUS_FACTOR = Object.freeze({
  nhl_regular: 0.48,
  nhl_depth: 0.62,
  ahl_leader: 0.74,
  ahl_bubble: 0.82,
  released: 0.92,
});

export const explainExternalRightsTradeValue = (team, player, baseValue, context = null) => {
  const career = player?.externalCareer || {};
  const reasons = [];
  const seasonEnd = parseSeasonEnd(context?.seasonLabel);
  const contractEnd = parseSeasonEnd(career.contractUntil);
  const yearsUntilAvailable = Math.max(0, contractEnd - seasonEnd);
  const ovr = Number(player?.ovr) || 0;
  const potential = Number(player?.potential?.potential) || ovr;
  const age = calculateAge(player?.identity?.birthDate, context?.currentDate);
  let factor = STATUS_FACTOR[career.status] || 0.62;
  factor += clamp((Number(career.returnInterest) || 0) / 250, 0, 0.34);
  factor += potential >= 84 ? 0.12 : potential >= 80 ? 0.06 : 0;
  factor += yearsUntilAvailable === 0 ? 0.14 : yearsUntilAvailable >= 3 ? -0.18 : -0.06 * yearsUntilAvailable;
  factor += age <= 23 ? 0.08 : age >= 30 ? -0.08 : 0;
  const value = Math.max(8, Math.round(baseValue * clamp(factor, 0.25, 1.05) * 10) / 10);
  if (yearsUntilAvailable) reasons.push(`контракт за океаном еще ${yearsUntilAvailable} сез.`);
  else reasons.push("может вернуться в ближайшее окно");
  if (potential >= 84) reasons.push("высокий потенциал повышает цену прав");
  if ((Number(career.returnInterest) || 0) < 30) reasons.push("низкий интерес к КХЛ снижает ликвидность");
  if (career.status) reasons.push(`статус: ${career.league || "НХЛ / АХЛ"}`);
  return { value, reasons: reasons.slice(0, 4) };
};
