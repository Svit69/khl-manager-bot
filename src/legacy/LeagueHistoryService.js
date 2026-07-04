const teamMeta = (team) => ({
  teamId: team?.id || team?.teamId || null,
  name: team?.name || "—",
  shortName: team?.shortName || team?.name || "—",
  logoUrl: team?.logoUrl || "",
});

export class LeagueHistoryService {
  buildView({ seasonHistory = [], teams = [] }) {
    const teamsById = new Map((teams || []).map((team) => [team.id, teamMeta(team)]));
    const champions = (seasonHistory || []).map((archive) => {
      const winner = archive?.champion || null;
      const regularWinner = (archive?.standings || [])[0] || null;
      const topScorer = archive?.scorers?.[0] || null;
      const champion = teamsById.get(winner?.teamId) || teamMeta(winner);
      const regular = teamsById.get(regularWinner?.teamId) || teamMeta(regularWinner);
      const scorerTeam = teamsById.get(topScorer?.teamId) || null;
      return {
        seasonLabel: archive?.seasonLabel || "—",
        champion,
        championName: champion.name,
        championTeamId: champion.teamId,
        regularWinner: regular,
        regularWinnerName: regular.name,
        topScorer: topScorer ? {
          name: topScorer.name || "—",
          photoUrl: topScorer.photoUrl || "./player-photo/default.png",
          points: Number(topScorer.points) || 0,
          team: scorerTeam,
        } : null,
        topScorerName: topScorer?.name || "—",
        topScorerPoints: Number(topScorer?.points) || 0,
      };
    });
    return { champions, trophyTable: this.#buildTrophyTable(champions, teams) };
  }

  #buildTrophyTable(champions, teams) {
    return (teams || []).map((team) => {
      const cups = champions.filter((row) => row.championTeamId === team.id).length;
      const regularWins = champions.filter((row) => row.regularWinner?.teamId === team.id).length;
      return { teamId: team.id, teamName: team.name, cups, regularWins, legacyPoints: cups * 5 + regularWins * 2 };
    }).filter((row) => row.legacyPoints > 0).sort((a, b) => b.legacyPoints - a.legacyPoints || a.teamName.localeCompare(b.teamName, "ru"));
  }
}
