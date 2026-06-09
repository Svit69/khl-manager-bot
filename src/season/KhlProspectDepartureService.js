import { calculateAge, parseSeasonEnd } from "../contracts/SeasonUtils.js";

const stableUnit = (source) => {
  let hash = 2166136261;
  String(source || "").split("").forEach((char) => {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return (hash >>> 0) / 4294967295;
};

export class KhlProspectDepartureService {
  evaluate(player, { seasonLabel, seasonDate } = {}) {
    const age = calculateAge(player?.identity?.birthDate, seasonDate);
    const ovr = Number(player?.ovr) || 0;
    const potential = Number(player?.potential?.potential) || ovr;
    const gap = potential - ovr;
    if (age >= 25 || potential < 80 || gap < 2 || ovr < 70) return null;
    const chance = Math.max(0, Math.min(88, (potential - 78) * 8 + gap * 6 + (24 - age) * 4 + (ovr - 72) * 1.5));
    if (stableUnit(`${player.id}:${seasonLabel}:na-path`) * 100 >= chance) return null;
    const league = potential >= 84 || ovr >= 80 ? "NHL" : "AHL";
    const years = league === "NHL" ? (potential >= 86 ? 3 : 2) : (potential >= 82 ? 2 : 1);
    const endYear = parseSeasonEnd(seasonLabel) + years;
    return {
      league,
      status: league === "NHL" ? "nhl_depth" : "ahl_bubble",
      contractUntil: `${endYear - 1}/${endYear}`,
      contractEndDate: `${endYear}-05-31`,
    };
  }
}
