import { clamp } from "../contracts/SeasonUtils.js";

export class PlayerRoleUsageEvaluator {
  getExpectedLineIndex(player) {
    const ovr = Number(player?.ovr) || 70;
    if (ovr >= 85) return 1;
    if (ovr >= 81) return 2;
    if (ovr >= 76) return 3;
    return 4;
  }

  calculateRolePressure(player, { age = 27, games = 0, avgIceTime = 0, teamGamesPlayed = 0 } = {}) {
    const lineIndex = Number(player?.expectedLineIndex) || null;
    const teamGames = Math.max(games, Number(teamGamesPlayed) || 0);
    if (teamGames < 10 || games < 5) return { development: 0, potential: 0, difficultyMultiplier: 1 };

    const ovr = Number(player?.ovr) || 70;
    const roleGap = lineIndex ? Math.max(0, lineIndex - this.getExpectedLineIndex(player)) : ovr >= 76 ? 2 : 1;
    const participationRate = games / Math.max(1, teamGames);
    if (roleGap <= 0 && participationRate >= 0.58) return { development: 0, potential: 0, difficultyMultiplier: 1 };

    let development = roleGap * this.#getRoleGapPenalty(ovr);
    if (lineIndex === 4 && ovr >= 80) development += 0.04;
    else if (lineIndex === 4 && ovr >= 75) development += 0.022;
    if (lineIndex === 3 && ovr >= 82) development += 0.02;
    if (avgIceTime < this.#getExpectedIceTime(ovr)) development += (this.#getExpectedIceTime(ovr) - avgIceTime) * 0.004;
    if (participationRate < 0.55 && ovr >= 76) development += 0.018;

    let potential = 0;
    if (age <= 24 && roleGap > 0) potential -= roleGap * (age <= 21 ? 0.022 : 0.014);
    if (age <= 24 && lineIndex === 4 && ovr >= 78) potential -= 0.024;
    if (ovr >= 80 && lineIndex === 4) potential -= 0.012;

    return {
      development: -clamp(development, 0, ovr >= 80 ? 0.13 : 0.09),
      potential: clamp(potential, -0.075, 0),
      difficultyMultiplier: clamp(1 + development * 4.2, 1, ovr >= 80 ? 1.65 : 1.38),
    };
  }

  #getRoleGapPenalty(ovr) { return ovr >= 85 ? 0.04 : ovr >= 81 ? 0.032 : ovr >= 76 ? 0.022 : 0.01; }

  #getExpectedIceTime(ovr) { return ovr >= 85 ? 17 : ovr >= 81 ? 15 : ovr >= 76 ? 12 : 8; }
}
