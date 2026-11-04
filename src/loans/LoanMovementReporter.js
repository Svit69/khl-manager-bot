export class LoanMovementReporter {
  static record(context, agreement, returning = false) {
    const player = context.teams.flatMap(team => team.getRoster()).find(row => row.id === agreement.playerId);
    const owner = context.teams.find(team => team.id === agreement.fromTeamId);
    const borrower = context.teams.find(team => team.id === agreement.toTeamId);
    const fromTeamId = returning ? agreement.toTeamId : agreement.fromTeamId;
    const toTeamId = returning ? agreement.fromTeamId : agreement.toTeamId;
    context.recordMovement({ player, fromTeamId, toTeamId, method: returning ? "loanReturn" : "loan",
      note: returning ? "Возвращение из аренды" : `Аренда до ${agreement.endDate}` });
    const message = returning ? `${player.name}: возвращение в клуб "${owner.name}" после аренды в клубе "${borrower.name}".`
      : `${player.name}: ${owner.name} → ${borrower.name}, аренда до ${agreement.endDate}.`;
    context.notify({ id: `loan-${agreement.id}-${returning ? "return" : "start"}`, type: "loan", title: returning ? "Возвращение из аренды" : "Арендное соглашение",
      message, playerId: player.id, day: context.currentDay, createdAt: new Date().toISOString(), read: false });
  }
}
