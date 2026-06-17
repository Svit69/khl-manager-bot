export class LeagueHistoryService {
  buildView({ seasonHistory = [], teams = [] }) {
    const teamNames = new Map((teams || []).map((team) => [team.id, team.name]));
    const champions = (seasonHistory || []).map((archive) => {
      const winner = archive?.champion || null;
      const regularWinner = (archive?.standings || [])[0] || null;
      return {
        seasonLabel: archive?.seasonLabel || "—",
        championName: winner?.name || "Не определен",
        championTeamId: winner?.teamId || null,
        regularWinnerName: regularWinner?.name || teamNames.get(regularWinner?.teamId) || "—",
        topScorerName: archive?.scorers?.[0]?.name || "—",
        topScorerPoints: archive?.scorers?.[0]?.points || 0,
      };
    });
    return { champions, trophyTable: this.#buildTrophyTable(champions, teams) };
  }

  #buildTrophyTable(champions, teams) {
    return (teams || []).map((team) => {
      const cups = champions.filter((row) => row.championTeamId === team.id).length;
      const regularWins = champions.filter((row) => row.regularWinnerName === team.name).length;
      return { teamId: team.id, teamName: team.name, cups, regularWins, legacyPoints: cups * 5 + regularWins * 2 };
    }).filter((row) => row.legacyPoints > 0).sort((a, b) => b.legacyPoints - a.legacyPoints || a.teamName.localeCompare(b.teamName, "ru"));
  }
}
