import { calculateAge } from "../contracts/SeasonUtils.js";

const formatDelta = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${value}`;
};

const renderPlayerPickRow = (side, player, selectedIds) => {
  const age = calculateAge(player.identity?.birthDate);
  const selected = selectedIds.has(player.id);
  const position = player.identity?.primaryPosition || "—";
  return `<button class="trade-player-row${selected ? " selected" : ""}" data-action="trade-toggle-${side}" data-player-id="${player.id}">
    <div class="trade-player-main">
      <span class="trade-player-name" title="${player.name}">${player.name}</span>
      <span class="trade-player-subtitle">${position} • ${age} лет</span>
    </div>
    <div class="trade-player-rating">
      <span class="trade-player-rating-label">OVR</span>
      <strong>${player.ovr}</strong>
    </div>
  </button>`;
};

const renderSelectedSummary = (items, emptyLabel) => {
  if (!items?.length) return `<div class="trade-summary-empty">${emptyLabel}</div>`;
  return items.map((item) => `
    <div class="trade-summary-row">
      <span class="trade-summary-name" title="${item.player.name}">${item.player.name}</span>
      <span class="trade-summary-value">${item.userValue}</span>
    </div>
  `).join("");
};

export class TradeTabRenderer {
  render(view) {
    const {
      partners = [],
      selectedTeamId = "",
      selectedTeam = null,
      giveCandidates = [],
      receiveCandidates = [],
      giveSelectedIds = new Set(),
      receiveSelectedIds = new Set(),
      evaluation = null,
      message = ""
    } = view || {};

    const partnerOptions = partners
      .map((team) => `<option value="${team.id}" ${team.id === selectedTeamId ? "selected" : ""}>${team.name}</option>`)
      .join("");

    const indicator = evaluation?.indicator ? `${evaluation.indicator.icon} ${evaluation.indicator.text}` : "Соберите пакет";
    const decision = evaluation?.decision?.label || "Добавьте игроков с обеих сторон и оцените сделку";
    const submitDisabled = !selectedTeam || !evaluation?.isValid ? "disabled" : "";
    const giveCount = evaluation?.givePlayers?.length || 0;
    const receiveCount = evaluation?.receivePlayers?.length || 0;
    const acceptance = evaluation?.decision?.accepted ? "Да" : "Нет";
    const acceptanceClass = evaluation?.decision?.accepted ? "positive" : "negative";
    const acceptanceHint = evaluation?.acceptanceHint || "Подберите равный пакет по ценности и роли";

    return `<div class="trade-screen">
      <div class="trade-hero">
        <div class="trade-hero-copy">
          <div class="trade-overline">Transfer hub</div>
          <h2>Обмен игроков</h2>
          <p>Соберите пакет, оцените баланс и отправьте предложение только когда оно действительно выглядит равноценным.</p>
        </div>
        <div class="trade-hero-controls">
          <label class="trade-team-select">
            <span>Клуб для переговоров</span>
            <select data-action="trade-select-team">
              <option value="">Выберите команду</option>
              ${partnerOptions}
            </select>
          </label>
        </div>
      </div>

      <div class="trade-status-bar">
        <div class="trade-status-pill">
          <span>Баланс сделки</span>
          <strong>${indicator}</strong>
        </div>
        <div class="trade-status-pill ${acceptanceClass}">
          <span>Решение ИИ</span>
          <strong>${acceptance}</strong>
        </div>
        <div class="trade-status-pill wide">
          <span>Подсказка</span>
          <strong>${acceptanceHint}</strong>
        </div>
      </div>

      ${selectedTeam ? `<div class="trade-grid">
        <section class="trade-panel">
          <div class="trade-panel-head">
            <div>
              <h3>Вы отдаёте</h3>
              <span>${giveCandidates.length} игроков в списке</span>
            </div>
            <div class="trade-panel-badge">${giveSelectedIds.size} выбрано</div>
          </div>
          <div class="trade-list-shell">
            <div class="trade-list-header">
              <span>Игрок</span>
              <span class="align-right">Рейтинг</span>
            </div>
            <div class="trade-list">
              ${giveCandidates.map((player) => renderPlayerPickRow("give", player, giveSelectedIds)).join("") || `<div class="trade-summary-empty">Игроков нет</div>`}
            </div>
          </div>
        </section>

        <section class="trade-panel">
          <div class="trade-panel-head">
            <div>
              <h3>Вы получаете</h3>
              <span>${receiveCandidates.length} игроков в списке</span>
            </div>
            <div class="trade-panel-badge">${receiveSelectedIds.size} выбрано</div>
          </div>
          <div class="trade-list-shell">
            <div class="trade-list-header">
              <span>Игрок</span>
              <span class="align-right">Рейтинг</span>
            </div>
            <div class="trade-list">
              ${receiveCandidates.map((player) => renderPlayerPickRow("receive", player, receiveSelectedIds)).join("") || `<div class="trade-summary-empty">Игроков нет</div>`}
            </div>
          </div>
        </section>
      </div>` : `<div class="trade-empty-state">Выберите команду, чтобы открыть переговорный экран и собрать предложение.</div>`}

      <div class="trade-deal-card">
        <div class="trade-deal-head">
          <div>
            <div class="trade-overline">Deal review</div>
            <h3>Разбор предложения</h3>
          </div>
          <div class="trade-deal-packet">${giveCount} → ${receiveCount}</div>
        </div>

        <div class="trade-eval-row"><span>Вердикт ИИ</span><strong>${decision}</strong></div>
        <div class="trade-eval-row"><span>Ваш баланс</span><strong>${formatDelta(evaluation?.userDelta)}</strong></div>
        <div class="trade-eval-row"><span>Баланс ИИ</span><strong>${formatDelta(evaluation?.aiDelta)}</strong></div>

        <div class="trade-summary">
          <div class="trade-summary-card">
            <div class="trade-summary-title">Пакет на выход</div>
            ${renderSelectedSummary(evaluation?.giveValues, "Пока пусто")}
          </div>
          <div class="trade-summary-card">
            <div class="trade-summary-title">Пакет на вход</div>
            ${renderSelectedSummary(evaluation?.receiveValues, "Пока пусто")}
          </div>
        </div>

        <div class="trade-actions">
          <button class="btn secondary" data-action="trade-clear">Сбросить</button>
          <button class="btn" ${submitDisabled} data-action="trade-submit">Предложить обмен</button>
        </div>
        ${message ? `<div class="trade-message">${message}</div>` : ""}
      </div>
    </div>`;
  }
}
