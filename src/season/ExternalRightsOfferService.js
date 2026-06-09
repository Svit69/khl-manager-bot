import { calculateAge } from "../contracts/SeasonUtils.js";

const stableUnit = (source) => {
  let hash = 2166136261;
  String(source || "").split("").forEach((char) => {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return (hash >>> 0) / 4294967295;
};

export class ExternalRightsOfferService {
  buildDecision({ player, offer, preview, teamId, decisionDate, seasonLabel }) {
    const career = player?.externalCareer || {};
    const salaryRatio = (Number(offer?.salaryRub) || 0) / Math.max(500000, Number(preview?.teamAdjustedDemand || preview?.marketSalary) || 500000);
    const age = calculateAge(player?.identity?.birthDate, decisionDate);
    const returnPull = Number(career.returnPreference) || 0;
    const ambition = Number(career.nhlAmbition) || 0;
    const leaguePenalty = career.league === "NHL" ? 26 : 8;
    const chance = Math.max(3, Math.min(92, 30 + (salaryRatio - 1) * 55 + returnPull * 0.35 - ambition * 0.28 - leaguePenalty + Math.max(0, age - 27) * 2));
    const accepted = stableUnit(`${player.id}:${teamId}:${seasonLabel}:external-offer`) * 100 < chance;
    return { accepted, chance: Math.round(chance) };
  }
}
