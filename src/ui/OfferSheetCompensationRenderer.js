const renderCandidate = (row) => `<button class="offer-sheet-junior-card${row.selected ? " selected" : ""}" data-action="toggle-osa-compensation-player" data-player-id="${row.playerId}">
  <strong>${row.name}</strong>
  <span>${row.age} лет • ${row.position}</span>
  <b>OVR ${row.ovr}</b>
  <em>Потенциал ${row.potential}</em>
</button>`;

export const renderOfferSheetCompensation = (view) => {
  if (!view) return "";
  const disabled = view.selectedCount !== view.requiredCount ? "disabled" : "";
  return `<section class="offer-sheet-compensation">
    <div class="offer-sheet-compensation-head">
      <h3>Выбор компенсации</h3>
      <span>${view.selectedCount}/${view.requiredCount}</span>
    </div>
    <p>Выберите молодых игроков из молодежки ${view.offerTeam?.name || "команды ИИ"}.</p>
    <div class="offer-sheet-junior-grid">${view.candidates.map(renderCandidate).join("") || `<div class="offer-sheet-empty">В молодежке нет доступных игроков компенсации.</div>`}</div>
    <div class="offer-sheet-actions">
      <button class="btn secondary" data-action="cancel-osa-compensation">Назад</button>
      <button class="btn secondary danger" ${disabled} data-action="confirm-osa-compensation" data-offer-id="${view.row?.id || ""}">Подтвердить компенсацию</button>
    </div>
  </section>`;
};
