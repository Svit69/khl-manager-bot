import { calculateAge } from "../contracts/SeasonUtils.js";

export class LoanCandidatePresenter {
  static build(runtime, context) {
    const result = [];
    for (const owner of context.teams) for (const player of owner.getRoster()) {
      if (runtime.activeAgreement(player.id)) continue;
      const age = Number(context.seasonLabel.slice(0, 4)) - Number(String(player.identity.birthDate).slice(0, 4));
      if (age > 24 || age < 0) continue;
      const destinations = context.teams.filter(team => team.id !== owner.id && [owner.id, team.id].includes(context.activeTeamId))
        .map(team => ({ teamId: team.id, teamName: team.name, ...runtime.evaluate(player, owner, team, context) }));
      if (!destinations.length) continue;
      result.push({ playerId: player.id, displayName: player.name, photoUrl: player.identity.photoUrl,
        position: player.identity.primaryPosition, ovr: player.ovr, age: calculateAge(player.identity.birthDate, context.currentDate),
        ownerTeamId: owner.id, ownerTeamName: owner.name,
        salaryRub: context.contractService.getContractForSeason(player.id, context.seasonLabel)?.salaryRub || 0, destinations });
    }
    return result.sort((a, b) => Number(b.destinations.some(row => row.eligible)) - Number(a.destinations.some(row => row.eligible)) || b.ovr - a.ovr);
  }
}
