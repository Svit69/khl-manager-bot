const removeTrailingCity = (name, city) => {
  const source = String(name || "").trim();
  const suffix = String(city || "").trim();
  if (!source || !suffix) return source;
  return source.toLowerCase().endsWith(` ${suffix.toLowerCase()}`)
    ? source.slice(0, -suffix.length).trim()
    : source;
};

export class CalendarScheduleTeamPresenter {
  getOpponent(match, activeTeamId) {
    if (!match || !activeTeamId) return null;
    return match.home?.id === activeTeamId ? match.away : match.home;
  }

  getOpponentName(team) {
    return removeTrailingCity(team?.name, team?.city).toUpperCase();
  }

  getOpponentCity(team) {
    return String(team?.city || "").toUpperCase();
  }

  isHomeMatch(match, activeTeamId) {
    return Boolean(activeTeamId && match?.home?.id === activeTeamId);
  }
}
