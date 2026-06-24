const playoffLine = (teams) => Math.max(8, Math.floor((teams || []).length / 2));

export class AiCoachService {
  process({ teams, coaches, standings, activeTeamId, buildOffer }) {
    if (!Array.isArray(coaches) || typeof buildOffer !== "function") return [];
    const offeredCoachIds = new Set();
    const getFreeCoaches = () => coaches
      .filter((coach) => !coach.teamId && !offeredCoachIds.has(coach.id))
      .sort((left, right) => right.overall - left.overall);

    return (teams || []).filter((team) => team.id !== activeTeamId).flatMap((team) => {
      const row = (standings || []).find((entry) => entry.teamId === team.id);
      const coach = coaches.find((entry) => entry.teamId === team.id);
      const rank = (standings || []).findIndex((entry) => entry.teamId === team.id) + 1;
      const scoreRate = row ? row.pts / Math.max(1, row.gp * 2) : 1;
      const poor = row && row.gp >= 8 && rank > playoffLine(teams) && scoreRate < 0.53;
      const severe = row && row.gp >= 14 && rank > playoffLine(teams) + 1 && scoreRate < 0.46;
      const vacancy = !coach;
      if (!vacancy && (!poor || (row.gp % 3 !== 0 && !severe))) return [];

      const picked = getFreeCoaches()
        .map((candidate) => ({ candidate, offer: buildOffer(candidate, team, 2) }))
        .sort((left, right) => right.offer.interest - left.offer.interest)
        .find((entry) => vacancy || entry.candidate.overall >= coach.overall - (severe ? 2 : 0));
      if (!picked) return [];
      offeredCoachIds.add(picked.candidate.id);
      return [{ team, oldCoach: coach, newCoach: picked.candidate, offer: picked.offer, poor, vacancy }];
    });
  }
}
