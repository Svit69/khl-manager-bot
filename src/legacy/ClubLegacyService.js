import { CLUB_HISTORY } from "../data/clubHistory.js";

const points = (row) => (Number(row?.points) || 0);
const scorerKey = (row) => row?.playerId || row?.name;
const legacyNumber = (value) => 2 + [...String(value || "")].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 96;

export class ClubLegacyService {
  buildView({ team, seasonHistory = [], currentRows = [] }) {
    const rows = [...currentRows, ...this.#archiveRows(team, seasonHistory)];
    const leaders = this.#mergeLeaders(rows);
    const bestSeason = rows.sort((a, b) => points(b) - points(a))[0] || null;
    return {
      clubInfo: CLUB_HISTORY[team?.shortName] || null,
      allTimeLeaders: leaders.slice(0, 8),
      records: this.#buildRecords(rows, bestSeason),
      retiredNumbers: this.#buildRetiredNumbers(leaders),
    };
  }

  #archiveRows(team, seasonHistory) {
    return (seasonHistory || []).flatMap((archive) => (archive?.scorers || [])
      .filter((row) => row.teamId === team?.id)
      .map((row) => ({ ...row, seasonLabel: archive.seasonLabel, archived: true })));
  }

  #mergeLeaders(rows) {
    const byKey = new Map();
    rows.forEach((row) => {
      const key = scorerKey(row);
      if (!key) return;
      const current = byKey.get(key) || { playerId: row.playerId, name: row.name, goals: 0, assists: 0, points: 0, seasons: new Set() };
      current.goals += Number(row.goals) || 0;
      current.assists += Number(row.assists) || 0;
      current.points += points(row);
      if (row.seasonLabel) current.seasons.add(row.seasonLabel);
      byKey.set(key, current);
    });
    return [...byKey.values()].map((row) => ({ ...row, seasons: row.seasons.size || 1 })).sort((a, b) => b.points - a.points || b.goals - a.goals);
  }

  #buildRecords(rows, bestSeason) {
    const bestGoalSeason = [...rows].sort((a, b) => (Number(b.goals) || 0) - (Number(a.goals) || 0))[0] || null;
    const bestAssistSeason = [...rows].sort((a, b) => (Number(b.assists) || 0) - (Number(a.assists) || 0))[0] || null;
    return { bestSeason, bestGoalSeason, bestAssistSeason };
  }

  #buildRetiredNumbers(leaders) {
    return leaders.filter((row) => row.points >= 80 || row.seasons >= 4).slice(0, 4).map((row) => ({ ...row, number: legacyNumber(row.playerId || row.name) }));
  }
}
