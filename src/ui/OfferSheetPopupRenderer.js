const formatMillions = (value) => {
  const millions = (Number(value) || 0) / 1000000;
  return Number.isInteger(millions) ? String(millions) : millions.toFixed(1);
};

export class OfferSheetPopupRenderer {
  render(view) {
    const row = view?.row;
    if (!row) return "";
    const offer = row.offer || {};
    return `<div class="modal offer-sheet-modal">
      <div class="offer-sheet-card">
        <div class="offer-sheet-head">
          <div>
            <div class="season-contract-kicker">Оффершит ОСА</div>
            <h2>${row.playerName}</h2>
            <p>${row.offerTeamName} предложил контракт вашему ограниченно свободному агенту.</p>
          </div>
          <button class="season-contract-close" data-action="offer-sheet-popup-dismiss" data-offer-id="${row.id}" aria-label="Закрыть">×</button>
        </div>
        <div class="offer-sheet-grid">
          <div><span>Контракт</span><strong>${offer.years || 1} г. • ${formatMillions(offer.salaryRub)} млн</strong></div>
          <div><span>Игрок</span><strong>${row.position} • OVR ${row.ovr}</strong></div>
          <div><span>Компенсация</span><strong>${row.compensationLabel}</strong></div>
        </div>
        <div class="offer-sheet-note">Повторите оффершит, чтобы сохранить игрока, или отпустите его и заберите компенсацию.</div>
        <div class="offer-sheet-actions">
          <button class="btn" data-action="match-osa-offer" data-offer-id="${row.id}">Повторить оффершит</button>
          <button class="btn secondary danger" data-action="release-osa-rights" data-offer-id="${row.id}">Забрать компенсацию</button>
          <button class="btn secondary" data-action="offer-sheet-popup-dismiss" data-offer-id="${row.id}">Решить позже</button>
        </div>
      </div>
    </div>`;
  }
}
