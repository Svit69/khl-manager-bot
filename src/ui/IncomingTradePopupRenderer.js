const formatDelta = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "0";
  return `${value > 0 ? "+" : ""}${value}`;
};

const getAssetLabel = (entry) => {
  const player = entry?.player;
  if (!player) return "";
  const position = player.identity?.primaryPosition || "—";
  const rights = entry.assetType === "rights" ? " · права" : "";
  return `<li><strong>${player.name}</strong><span>${position} · OVR ${player.ovr}${rights}</span></li>`;
};

const renderAssets = (items) => `<ul class="offer-sheet-player-list">${(items || []).map(getAssetLabel).join("")}</ul>`;

export class IncomingTradePopupRenderer {
  render(view) {
    const row = view?.row;
    const evaluation = row?.evaluation;
    if (!row || !evaluation) return "";
    return `<div class="modal offer-sheet-modal">
      <div class="offer-sheet-card">
        <div class="offer-sheet-head">
          <div>
            <div class="season-contract-kicker">Предложение обмена</div>
            <h2>${row.teamName}</h2>
            <p>${row.teamName} предлагает сделку по ходу сезона. Предложение активно до дня ${row.expiresDay}.</p>
          </div>
          <button class="season-contract-close" data-action="incoming-trade-dismiss" data-offer-id="${row.id}" aria-label="Закрыть">×</button>
        </div>
        <div class="offer-sheet-grid">
          <div><span>Вы отдаете</span><strong>${evaluation.giveValues?.length || 0} игрок</strong></div>
          <div><span>Вы получаете</span><strong>${evaluation.receiveValues?.length || 0} актив</strong></div>
          <div><span>Баланс</span><strong>${formatDelta(evaluation.userDelta)}</strong></div>
        </div>
        <div class="offer-sheet-trade-packages">
          <section><h3>К вам</h3>${renderAssets(evaluation.receiveValues)}</section>
          <section><h3>В ${row.teamName}</h3>${renderAssets(evaluation.giveValues)}</section>
        </div>
        <div class="offer-sheet-note">ИИ собрал пакет под свою потребность по позиции и текущую оценку обменов. После отказа это предложение исчезнет.</div>
        <div class="offer-sheet-actions">
          <button class="btn" data-action="incoming-trade-accept" data-offer-id="${row.id}">Принять обмен</button>
          <button class="btn secondary danger" data-action="incoming-trade-decline" data-offer-id="${row.id}">Отказаться</button>
          <button class="btn secondary" data-action="incoming-trade-dismiss" data-offer-id="${row.id}">Решить позже</button>
        </div>
      </div>
    </div>`;
  }
}
