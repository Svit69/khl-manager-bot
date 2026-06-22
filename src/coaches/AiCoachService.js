const coachEndDate = (seasonLabel, years = 2) => `${(Number(String(seasonLabel).split("/")[0]) || 2025) + years}-05-31`;
const playoffLine = (teams) => Math.max(8, Math.floor((teams || []).length / 2));

export class AiCoachService {
  process({ teams, coaches, standings, activeTeamId, seasonLabel, day, contractService }) {
    if (!contractService || !Array.isArray(coaches)) return [];
    const free = () => coaches.filter((coach) => !coach.teamId).sort((a, b) => b.overall - a.overall);
    return (teams || []).filter((team) => team.id !== activeTeamId).flatMap((team) => {
      const row = (standings || []).find((entry) => entry.teamId === team.id);
      const coach = coaches.find((entry) => entry.teamId === team.id);
      const rank = (standings || []).findIndex((entry) => entry.teamId === team.id) + 1;
      const poor = row && row.gp >= 14 && rank > playoffLine(teams) && row.pts / Math.max(1, row.gp * 2) < 0.47;
      const vacancy = !coach;
      if (!vacancy && (!poor || row.gp % 7 !== 0)) return [];
      const replacement = free().find((candidate) => !coach || candidate.overall >= coach.overall + 2);
      if (!replacement) return [];
      if (coach) coach.releaseToMarket({ seasonLabel, teamId: team.id, games: row?.gp || 0 });
      const offer = contractService.buildOffer(replacement, 1.08, 2);
      replacement.assignToTeam(team.id, coachEndDate(seasonLabel, offer.years), offer.salaryRub);
      return [{ team, oldCoach: coach, newCoach: replacement, poor, day }];
    });
  }
}
