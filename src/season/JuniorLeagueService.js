import { buildJuniorScorerRow, calculateJuniorTeamPower, hashJuniorLeagueText } from "./JuniorLeagueMath.js";

export class JuniorLeagueService {
  buildSeasonView(teams = [], seasonLabel = "") {
    const rows = teams.filter((team) => team?.juniorTeam).map((team) => this.#buildTeamRow(team, teams, seasonLabel));
    rows.sort((a, b) => (b.points - a.points) || (b.goalDiff - a.goalDiff) || a.teamName.localeCompare(b.teamName, "ru"));
    rows.forEach((row, index) => { row.rank = index + 1; row.playoffStatus = index < 16 ? "Playoff Zone" : "Chasing"; });
    return { rows, scorers: this.#buildScorers(teams, seasonLabel), seasonLabel };
  }

  #buildTeamRow(team, teams, seasonLabel) {
    const power = calculateJuniorTeamPower(team, seasonLabel);
    const gp = Math.max(40, (teams.filter((entry) => entry?.juniorTeam).length - 1) * 2);
    const noise = (hashJuniorLeagueText(`${team.id}:${seasonLabel}:juniors`) % 13) - 6;
    const wins = Math.max(6, Math.min(gp - 4, Math.round(gp * (0.31 + (power - 58) * 0.012) + noise)));
    const otl = Math.max(1, Math.min(9, hashJuniorLeagueText(`${team.id}:${seasonLabel}:otl`) % 8));
    const losses = Math.max(0, gp - wins - otl);
    const gf = Math.round(gp * (2.45 + (power - 60) * 0.035) + noise * 2);
    const ga = Math.round(gp * (2.7 - (power - 60) * 0.026) - noise);
    return { teamId: team.id, teamName: team.name, juniorName: team.juniorTeam?.name || team.name, gp, wins, losses, otl, points: wins * 2 + otl, gf, ga, goalDiff: gf - ga, power: Math.round(power) };
  }

  #buildScorers(teams, seasonLabel) {
    return teams.flatMap((team) => (team?.juniorPlayers || []).map((player) => buildJuniorScorerRow(team, player, seasonLabel)))
      .sort((a, b) => (b.points - a.points) || (b.goals - a.goals) || a.name.localeCompare(b.name, "ru"));
  }
}
