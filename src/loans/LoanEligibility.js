import { LoanCalendar } from "./LoanCalendar.js";
export class LoanEligibility {
  static evaluate(request, contracts, registry) {
    const { player, fromTeam, toTeam, season, currentDate, consent, feeRub = 0 } = request;
    const year = LoanCalendar.seasonYear(season), now = LoanCalendar.timestamp(currentDate);
    const age = year - LoanCalendar.birthYear(player?.identity?.birthDate), reasons = [];
    const reject = (condition, code) => { if (condition) reasons.push(code); };
    reject(!player?.id || !player.affiliation || !fromTeam?.id || !toTeam?.id ||
      fromTeam.id === toTeam.id, "INVALID_PARTICIPANTS");
    reject(!Number.isFinite(year) || !Number.isFinite(now) || now < LoanCalendar.beginning(year), "INVALID_DATE");
    reject(now > LoanCalendar.deadline(year), "DEADLINE_PASSED");
    reject(!Number.isFinite(age) || age < 0 || age > 24, "AGE_LIMIT");
    reject(consent !== true, "CONSENT_REQUIRED");
    reject(feeRub !== 0, "LOAN_MUST_BE_FREE");
    reject(registry.some(row => row.playerId === player?.id && row.status === "active"), "ALREADY_ON_LOAN");
    reject(player?.affiliation?.teamId !== fromTeam?.id, "NOT_OWNER");
    const current = contracts.find(row => row.season === season);
    reject(!current || current.teamId !== fromTeam?.id, "CURRENT_CONTRACT_REQUIRED");
    reject(!contracts.some(row => row.season === `${year + 1}/${year + 2}` &&
      row.teamId === fromTeam?.id), "NEXT_SEASON_CONTRACT_REQUIRED");
    const history = registry.filter(row => row.season === season);
    reject(history.filter(row => row.fromTeamId === fromTeam?.id && row.toTeamId === toTeam?.id).length >= 2, "PAIR_LIMIT");
    const slot = {};
    for (const [direction, field, team] of [["outgoing", "fromTeamId", fromTeam], ["incoming", "toTeamId", toTeam]]) {
      const active = history.filter(row => row.status === "active" && row[field] === team?.id);
      reject(active.length >= 4 || (age > 22 && active.some(row => row.age > 22)), `${direction.toUpperCase()}_LIMIT`);
      slot[direction] = age <= 22 && active.filter(row => row.age <= 22).length < 3 ? "under23" : "under25";
    }
    return { eligible: reasons.length === 0, reasons, age, slot };
  }
}
