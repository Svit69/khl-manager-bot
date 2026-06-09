import { calculateAge } from "../contracts/SeasonUtils.js";

const ATTRIBUTE_KEYS = ["shot", "speed", "physical", "defense", "skill"];
const stableUnit = (source) => {
  let hash = 2166136261;
  String(source || "").split("").forEach((char) => {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return (hash >>> 0) / 4294967295;
};

export class ExternalPlayerDevelopmentService {
  applyAnnualDevelopment(players, { seasonDate, seasonLabel } = {}) {
    return (players || []).flatMap((player) => this.#developPlayer(player, seasonDate, seasonLabel));
  }
  #developPlayer(player, seasonDate, seasonLabel) {
    if (!player || player.identity?.isGoalie) return [];
    const age = calculateAge(player.identity?.birthDate, seasonDate);
    const potential = Number(player.potential?.potential) || player.ovr;
    const gap = potential - (Number(player.ovr) || 0);
    const leagueBonus = player.externalCareer?.league === "NHL" ? 0.12 : 0.04;
    const ageScore = age <= 20 ? 0.32 : age <= 23 ? 0.22 : age <= 26 ? 0.08 : age >= 31 ? -0.18 : -0.04;
    const score = ageScore + Math.max(-0.1, gap * 0.035) + leagueBonus + (stableUnit(`${player.id}:${seasonLabel}:dev`) - 0.5) * 0.18;
    if (score < 0.22 && score > -0.16) return [];
    const direction = score >= 0.22 ? 1 : -1;
    const key = ATTRIBUTE_KEYS[Math.floor(stableUnit(`${player.id}:${seasonLabel}:attr`) * ATTRIBUTE_KEYS.length)] || "skill";
    const oldOvr = player.ovr;
    player.attributes.applyAttributeDelta(key, direction);
    return oldOvr === player.ovr ? [] : [{ playerId: player.id, playerName: player.name, oldOvr, newOvr: player.ovr, type: direction > 0 ? "upgrade" : "downgrade" }];
  }
}
