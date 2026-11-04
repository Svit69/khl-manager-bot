import { loanEscape as esc, loanSalary, loanDate } from "./LoanUiFormatting.js";
const option = (id, label, selected) => `<option value="${esc(id)}"${id === selected ? " selected" : ""}>${esc(label)}</option>`;
export const renderLoanProposalForm = (view) => {
  const destination = view.destinations.find((entry) => entry.teamId === view.borrowingTeamId);
  const reasons = view.enabled === false ? [view.disabledReason || "Аренды отключены в настройках этой карьеры."]
    : !view.player ? ["В выбранном клубе нет доступных для аренды игроков основного состава."]
    : !destination ? ["Нет доступного клуба для этой аренды."] : [...(destination.reasons || [])];
  const disabled = view.enabled === false || !view.player || !destination?.eligible;
  if (disabled && !reasons.length) reasons.push("Эта аренда сейчас недоступна.");
  const sourceOptions = (view.teams || []).map((team) => option(team.id, team.name, view.sourceTeamId)).join("");
  const playerOptions = view.players.map((player) => option(player.playerId, `${player.displayName} / ${player.position} / OVR ${player.ovr}`, view.playerId)).join("");
  const destinationOptions = view.destinations.map((team) => option(team.teamId, `${team.teamName}${team.eligible ? "" : " / недоступно"}`, view.borrowingTeamId)).join("");
  const capTerms = view.capEnabled && Number.isFinite(destination?.projectedRub) && Number.isFinite(destination?.capRub)
    ? `<span>Потолок после сделки: <strong>${loanSalary(destination.projectedRub)} / ${loanSalary(destination.capRub)}</strong></span>` : "";
  return `<div class="loan-proposal-form">
    <label>Клуб-владелец<select data-action="loan-source"${view.enabled === false ? " disabled" : ""}>${sourceOptions}</select></label>
    <label>Игрок основы<select data-action="loan-player"${!view.players.length || view.enabled === false ? " disabled" : ""}>${playerOptions || '<option value="">Нет игроков</option>'}</select></label>
    <label>Арендующий клуб<select data-action="loan-borrower"${!view.destinations.length || view.enabled === false ? " disabled" : ""}>${destinationOptions || '<option value="">Нет клубов</option>'}</select></label>
    <div class="loan-terms"><span>Ставка за сезон <strong>${loanSalary(view.player?.salaryRub)}</strong></span><span>Аренда до <strong>${loanDate(view.endDate)}</strong></span>${capTerms}</div>
    <div class="loan-submit"><button class="btn" data-action="loan-submit"${disabled ? " disabled" : ""} aria-describedby="loan-disabled-reasons">${view.sourceTeamId === view.activeTeamId ? "Предложить аренду" : "Запросить аренду"}</button><div id="loan-disabled-reasons" class="loan-reasons">${reasons.map(esc).join(" ")}</div></div>
  </div>`;
};
