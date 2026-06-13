import { calculateAge, clamp, parseSeasonEnd } from "../contracts/SeasonUtils.js";

const stableUnit = (source) => {
  let hash = 2166136261;
  String(source || "").split("").forEach((char) => {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return (hash >>> 0) / 4294967295;
};

const buildDepartureContract = (seasonLabel, league, potential) => {
  const years = league === "NHL" ? (potential >= 86 ? 3 : 2) : (potential >= 82 ? 2 : 1);
  const endYear = parseSeasonEnd(seasonLabel) + years;
  return { contractUntil: `${endYear - 1}/${endYear}`, contractEndDate: `${endYear}-05-31` };
};

export class KhlNorthAmericaInterestService {
  assess(player, { seasonLabel, seasonDate } = {}) {
    const age = calculateAge(player?.identity?.birthDate, seasonDate);
    const ovr = Number(player?.ovr) || 0;
    const potential = Number(player?.potential?.potential) || ovr;
    const gap = potential - ovr;
    const activeIntent = player?.northAmericaIntent?.targetSeasonLabel === seasonLabel ? 18 : 0;
    if (age >= 25 || potential < 80 || gap < 2 || ovr < 70) return null;
    const score = clamp(
      (potential - 78) * 9 + gap * 7 + (24 - age) * 4.5 + (ovr - 72) * 1.8 + activeIntent,
      0,
      97,
    );
    const league = potential >= 84 || ovr >= 80 ? "NHL" : "AHL";
    const roll = stableUnit(`${player.id}:${seasonLabel}:na-path`) * 100;
    const signalRoll = stableUnit(`${player.id}:${seasonLabel}:na-watch`) * 100;
    return {
      league,
      score: Math.round(score),
      age,
      ovr,
      potential,
      status: league === "NHL" ? "nhl_depth" : "ahl_bubble",
      shouldDepart: roll < score,
      shouldSignal: signalRoll < clamp(score + 15, 0, 96),
      ...buildDepartureContract(seasonLabel, league, potential),
    };
  }
}
