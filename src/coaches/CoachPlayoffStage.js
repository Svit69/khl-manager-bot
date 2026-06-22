const getTeamId = (entry) => entry?.team?.id || entry?.teamId || null;

export const getTeamPlayoffStage = (playoffs, teamId) => {
  if (!playoffs?.active || !teamId) return 0;
  const roundBase = Number(playoffs.participantCount) >= 16 ? 1 : 2;
  const stage = (playoffs.rounds || []).reduce((best, round, roundIndex) => {
    const appeared = (round.series || []).some((series) =>
      getTeamId(series.higherSeed) === teamId || getTeamId(series.lowerSeed) === teamId);
    return appeared ? Math.max(best, Math.min(4, roundBase + roundIndex)) : best;
  }, 0);
  return playoffs.champion?.id === teamId || playoffs.champion?.teamId === teamId ? 5 : stage;
};
