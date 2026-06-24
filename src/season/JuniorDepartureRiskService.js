import { parseSeasonEnd } from "../contracts/SeasonUtils.js";
import { getJuniorSeasonAge } from "./JuniorEligibility.js";
import { getJuniorPracticeProfile } from "./JuniorScouting.js";

const hashText = (value) => {
  let hash = 2166136261;
  String(value || "").split("").forEach((char) => {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return hash >>> 0;
};

const getRiskScore = (player, seasonLabel, hasMainContract) => {
  if (hasMainContract) return 0;
  const age = getJuniorSeasonAge(player, seasonLabel);
  if (age <= 17) return 0;
  const ovr = Number(player.ovr) || 0;
  const potential = Number(player.potential?.potential) || ovr;
  const practice = getJuniorPracticeProfile(player);
  const ambition = Math.max(0, potential - 78) * 3.2 + Math.max(0, ovr - 70) * 1.8;
  const agePressure = age >= 20 ? 14 : age >= 19 ? 8 : 3;
  const roleConcern = practice.khlGames <= 3 ? 9 : practice.khlGames <= 10 ? 3 : -10;
  return Math.max(0, Math.min(100, Math.round(ambition + agePressure + roleConcern)));
};

export class JuniorDepartureRiskService {
  buildRiskPreview({ teams = [], seasonLabel = "", hasMainContract = () => false }) {
    return teams.flatMap((team) => (team?.juniorPlayers || []).map((player) => this.#buildPreview(team, player, seasonLabel, hasMainContract)))
      .filter((entry) => entry.score >= 35)
      .sort((a, b) => (b.score - a.score) || (b.player.ovr - a.player.ovr));
  }

  evaluateOffseason({ teams = [], seasonLabel = "", hasMainContract = () => false }) {
    return this.buildRiskPreview({ teams, seasonLabel, hasMainContract })
      .filter((entry) => (hashText(`${entry.player.id}:${seasonLabel}:leave`) % 100) < Math.max(2, entry.score - 48));
  }

  #buildPreview(team, player, seasonLabel, hasMainContract) {
    const score = getRiskScore(player, seasonLabel, hasMainContract(player, team));
    const league = (Number(player.ovr) || 0) >= 70 || (Number(player.potential?.potential) || 0) >= 82 ? "NHL" : "AHL";
    const contractUntil = `${parseSeasonEnd(seasonLabel)}/${parseSeasonEnd(seasonLabel) + 1}`;
    const levelClass = score >= 70 ? "high" : score >= 50 ? "medium" : "low";
    const level = score >= 70 ? "Высокий" : score >= 50 ? "Средний" : "Низкий";
    return { player, team, score, league, level, levelClass, contractUntil, reason: score >= 60 ? "интерес Северной Америки" : "роль в системе" };
  }
}
