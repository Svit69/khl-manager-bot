import { TEAM_ROSTER_POSITION_TARGETS, TEAM_ROSTER_TARGET_SIZE } from "../season/RosterTargets.js";

export class LoanFutureBudgetPolicy {
  evaluate({ player, fromTeam, season, contracts, capFor, activeTeamId, teams = [] }) {
    const seasons = [...new Set(contracts.filter(row => row.playerId === player.id && row.teamId === fromTeam.id && row.season > season).map(row => row.season))];
    const players = [...new Map(teams.flatMap(team => team.getRoster()).map(row => [row.id, row])).values()];
    const reasons = [];
    for (const label of seasons) {
      const rows = contracts.filter(row => row.teamId === fromTeam.id && row.season === label);
      const payrollRub = rows.reduce((sum, row) => sum + (Number(row.salaryRub) || 0), 0);
      if (payrollRub > capFor(label)) reasons.push("OWNER_FUTURE_SALARY_CAP");
      const futureIds = new Set(rows.map(row => row.playerId));
      const roster = players.filter(row => futureIds.has(row.id));
      const counts = roster.reduce((result, row) => {
        const position = row.identity.primaryPosition;
        const group = position === "ВРТ" ? "G" : position === "ЗАЩ" ? "DEF" : "FWD";
        result[group]++; return result;
      }, { FWD: 0, DEF: 0, G: 0 });
      const slots = Math.max(TEAM_ROSTER_TARGET_SIZE - roster.length,
        Object.entries(TEAM_ROSTER_POSITION_TARGETS).reduce((sum, [group, target]) => sum + Math.max(0, target - counts[group]), 0), 0);
      if (fromTeam.id !== activeTeamId && capFor(label) - payrollRub < slots * 500000) reasons.push("OWNER_FUTURE_ROSTER_BUDGET");
    }
    return [...new Set(reasons)];
  }
}
