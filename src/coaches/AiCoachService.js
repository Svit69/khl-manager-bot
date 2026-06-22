const AI_MARKET_LOCK_DAYS = 5;
const coachEndDate = (seasonLabel, years = 2) => `${(Number(String(seasonLabel).split("/")[0]) || 2025) + years}-05-31`;
const playoffLine = (teams) => Math.max(8, Math.floor((teams || []).length / 2));
const canAiSignCoach = (coach, day) => !coach.teamId && (Number(coach.aiMarketLockedUntilDay) || 0) <= (Number(day) || 0);

export class AiCoachService {
  process({ teams, coaches, standings, activeTeamId, seasonLabel, day, contractService }) {
    if (!contractService || !Array.isArray(coaches)) return [];
    const free = () => coaches.filter((coach) => canAiSignCoach(coach, day)).sort((a, b) => b.overall - a.overall);
    return (teams || []).filter((team) => team.id !== activeTeamId).flatMap((team) => {
      const row = (standings || []).find((entry) => entry.teamId === team.id);
      const coach = coaches.find((entry) => entry.teamId === team.id);
      const rank = (standings || []).findIndex((entry) => entry.teamId === team.id) + 1;
      const scoreRate = row ? row.pts / Math.max(1, row.gp * 2) : 1;
      const poor = row && row.gp >= 10 && rank > playoffLine(teams) && scoreRate < 0.5;
      const severe = row && row.gp >= 18 && rank > playoffLine(teams) + 2 && scoreRate < 0.43;
      const vacancy = !coach;
      if (!vacancy && (!poor || (row.gp % 4 !== 0 && !severe))) return [];
      const replacement = free().find((candidate) => !coach || candidate.overall >= coach.overall + (severe ? 0 : 1));
      if (!replacement) return [];
      if (coach) {
        coach.releaseToMarket({ seasonLabel, teamId: team.id, games: row?.gp || 0 });
        coach.aiMarketLockedUntilDay = (Number(day) || 0) + AI_MARKET_LOCK_DAYS;
      }
      const offer = contractService.buildOffer(replacement, vacancy ? 1.04 : 1.1, 2);
      replacement.assignToTeam(team.id, coachEndDate(seasonLabel, offer.years), offer.salaryRub);
      replacement.aiMarketLockedUntilDay = 0;
      return [{ team, oldCoach: coach, newCoach: replacement, poor, day }];
    });
  }
}
