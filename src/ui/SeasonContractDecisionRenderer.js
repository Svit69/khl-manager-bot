import { PHOTO_FALLBACK_ATTR } from "../utils/PlayerPhoto.js";

const formatMillions = (value) => {
  const millions = (Number(value) || 0) / 1000000;
  return Number.isInteger(millions) ? String(millions) : millions.toFixed(1);
};

const formatMillionsInput = (value) => formatMillions(value).replace(",", ".");
const statusLabel = (status) => status === "OSA" ? "ОСА" : (status === "NSA" ? "НСА" : status);

const renderDecisionBadge = (row, decision) => {
  if (row.hasFutureContract) return `<span class="season-contract-badge good">Продлен</span>`;
  if (decision === "release") return `<span class="season-contract-badge danger">Отпустить</span>`;
  return `<span class="season-contract-badge pending">Без решения</span>`;
};

const renderReason = (reason) =>
  `<div class="season-contract-reason ${reason.value >= 0 ? "pos" : "neg"}">${reason.value >= 0 ? "+" : ""}${reason.value} ${reason.text}</div>`;

const renderOfferControls = (row, offer) => {
  const yearsButtons = [1, 2, 3, 4]
    .map((years) => `<button class="season-contract-chip${offer.years === years ? " active" : ""}" data-action="season-contract-years" data-player-id="${row.playerId}" data-years="${years}">${years} г.</button>`)
    .join("");
  return `<div class="season-contract-offer">
    <div class="season-contract-years">${yearsButtons}</div>
    <div class="season-contract-salary">
      <button class="season-contract-step" data-action="season-contract-adjust-salary" data-player-id="${row.playerId}" data-delta-million="-5">-5</button>
      <button class="season-contract-step" data-action="season-contract-adjust-salary" data-player-id="${row.playerId}" data-delta-million="-1">-1</button>
      <input class="season-contract-input" type="number" min="0.5" step="0.5" value="${formatMillionsInput(offer.salaryRub)}" data-action="season-contract-salary-input" data-player-id="${row.playerId}">
      <span>млн</span>
      <button class="season-contract-step" data-action="season-contract-adjust-salary" data-player-id="${row.playerId}" data-delta-million="1">+1</button>
      <button class="season-contract-step" data-action="season-contract-adjust-salary" data-player-id="${row.playerId}" data-delta-million="5">+5</button>
      <button class="season-contract-step wide" data-action="season-contract-market-salary" data-player-id="${row.playerId}">Рынок</button>
      <button class="season-contract-step wide" data-action="season-contract-demand-salary" data-player-id="${row.playerId}">Ожидание</button>
    </div>
  </div>`;
};

const renderRow = (row, view) => {
  const decision = view.releasePlayerIds.has(row.playerId) ? "release" : (row.hasFutureContract ? "renewed" : "pending");
  const selectedClass = view.selectedPlayerId === row.playerId ? " active" : "";
  return `<button class="season-contract-player${selectedClass}" data-action="season-contract-select" data-player-id="${row.playerId}">
    <img src="${row.photoUrl}" alt="${row.displayName}" ${PHOTO_FALLBACK_ATTR}>
    <span class="season-contract-player-main">
      <strong>${row.displayName}</strong>
      <small>${row.position} • ${row.age} лет • OVR ${row.ovr}</small>
    </span>
    ${renderDecisionBadge(row, decision)}
  </button>`;
};

export class SeasonContractDecisionRenderer {
  render(view) {
    if (!view?.isOpen) return "";
    const rows = view.filteredRows || [];
    const selected = view.selectedRow || rows[0] || null;
    const filters = [
      ["all", "Все"],
      ["pending", "Без решения"],
      ["osa", "ОСА"],
      ["nsa", "НСА"],
      ["renewed", "Продлены"],
      ["release", "Отпустить"],
    ];
    const filterMarkup = filters
      .map(([id, label]) => `<button class="season-contract-filter${view.filter === id ? " active" : ""}" data-action="season-contract-filter" data-filter="${id}">${label}</button>`)
      .join("");
    const selectedDecision = selected
      ? (view.releasePlayerIds.has(selected.playerId) ? "release" : (selected.hasFutureContract ? "renewed" : "pending"))
      : "pending";
    const preview = selected?.preview || null;
    const offer = view.offersByPlayerId[selected?.playerId] || preview?.offer || null;
    const reasons = (preview?.reasons || []).slice(0, 5).map(renderReason).join("");
    const chance = Math.max(0, Math.min(100, Number(preview?.state?.chance) || 0));
    const selectedPanel = selected
      ? `<section class="season-contract-detail">
          <div class="season-contract-detail-head">
            <img src="${selected.photoUrl}" alt="${selected.displayName}" ${PHOTO_FALLBACK_ATTR}>
            <div>
              <div class="season-contract-kicker">${statusLabel(selected.ufaStatus)} • ${selected.location === "junior" ? "молодежка" : "основа"}</div>
              <h3>${selected.displayName}</h3>
              <p>${selected.position} • ${selected.age} лет • OVR ${selected.ovr} • ${selected.contractType}</p>
            </div>
            ${renderDecisionBadge(selected, selectedDecision)}
          </div>
          <div class="season-contract-detail-grid">
            <div><span>Текущая зарплата</span><strong>${formatMillions(selected.salaryRub)} млн</strong></div>
            <div><span>Контракт до</span><strong>${selected.contractEndDate || "31.05"}</strong></div>
            <div><span>Статус</span><strong>${statusLabel(selected.ufaStatus)}</strong></div>
            <div><span>Матчи КХЛ</span><strong>${selected.khlGamesPlayed}</strong></div>
          </div>
          ${preview ? `<div class="season-contract-market">
            <div><span>Рынок</span><strong>${formatMillions(preview.marketSalary)} млн</strong></div>
            <div><span>Ожидание от клуба</span><strong>${formatMillions(preview.teamAdjustedDemand)} млн</strong></div>
            <div><span>Шанс согласия</span><strong>${preview.state.emoji} ${preview.state.chance}%</strong></div>
          </div>
          <div class="season-contract-chance"><span style="width:${chance}%"></span></div>
          <div class="season-contract-reasons">${reasons}</div>
          ${offer ? renderOfferControls(selected, offer) : ""}` : `<div class="season-contract-locked">Игрок уже продлен на будущий сезон.</div>`}
          <div class="season-contract-actions">
            ${preview ? `<button class="btn" data-action="season-contract-submit-offer" data-player-id="${selected.playerId}">Предложить контракт</button>` : ""}
            ${selectedDecision === "release"
              ? `<button class="btn secondary" data-action="season-contract-undo-release" data-player-id="${selected.playerId}">Вернуть в решения</button>`
              : (preview ? `<button class="btn secondary danger" data-action="season-contract-release" data-player-id="${selected.playerId}">${selected.ufaStatus === "OSA" || selected.ufaStatus === "ОСА" ? "Отпустить права" : "Отпустить на рынок"}</button>` : "")}
          </div>
          ${view.outcomesByPlayerId[selected.playerId] ? `<div class="season-contract-outcome">${view.outcomesByPlayerId[selected.playerId]}</div>` : ""}
        </section>`
      : `<section class="season-contract-detail"><div class="season-contract-empty">Нет игроков по выбранному фильтру.</div></section>`;

    return `<div class="modal season-contract-modal">
      <div class="season-contract-card">
        <div class="season-contract-header">
          <div>
            <div class="season-contract-kicker">31 мая • окончание контрактов</div>
            <h2>Решения по контрактам</h2>
            <p>Продлите нужных игроков или явно отпустите их перед открытием рынка свободных агентов.</p>
          </div>
          <button class="season-contract-close" data-action="season-contract-close" aria-label="Закрыть">×</button>
        </div>
        <div class="season-contract-summary">
          <div><span>Всего</span><strong>${view.totalCount}</strong></div>
          <div><span>Решено</span><strong>${view.resolvedCount}</strong></div>
          <div><span>Без решения</span><strong>${view.pendingCount}</strong></div>
          <div><span>ОСА</span><strong>${view.osaCount}</strong></div>
        </div>
        <div class="season-contract-filters">${filterMarkup}</div>
        <div class="season-contract-layout">
          <aside class="season-contract-list">${rows.map((row) => renderRow(row, view)).join("") || `<div class="season-contract-empty">Нет игроков</div>`}</aside>
          ${selectedPanel}
        </div>
        <div class="season-contract-footer">
          <button class="btn secondary" data-action="season-contract-release-pending">Отпустить всех без решения</button>
          <div class="season-contract-footer-main">
            <span>${view.pendingCount ? `Осталось решить: ${view.pendingCount}` : "Все решения приняты"}</span>
            <button class="btn" ${view.pendingCount ? "disabled" : ""} data-action="season-contract-confirm">Подтвердить и перейти в новый сезон</button>
          </div>
        </div>
      </div>
    </div>`;
  }
}
