import { calculateAge } from "../contracts/SeasonUtils.js";
import { getPlayerPhotoUrl, PHOTO_FALLBACK_ATTR } from "../utils/PlayerPhoto.js";
import { formatTradeSalary, renderTradeSalaryCap } from "./TradeSalaryCapRenderer.js";

const formatDelta = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${value}`;
};
const getNameFitClass = (name = "") => name.length > 28 ? "name-fit-xs" : name.length > 22 ? "name-fit-sm" : "";
const getTradeAssetKey = (player) => `${player.externalCareer ? "rights" : "player"}:${player.id}`;

const renderPlayerPickRow = (side, player, selectedIds) => {
  const age = calculateAge(player.identity?.birthDate);
  const assetKey = getTradeAssetKey(player);
  const selected = selectedIds.has(assetKey);
  const position = player.identity?.primaryPosition || "—";
  const isRightsAsset = Boolean(player.externalCareer);
  const assetLabel = isRightsAsset ? `<span class="trade-rights-chip">Права • ${player.externalCareer?.league || "НХЛ / АХЛ"}</span>` : "";
  const salaryLabel = formatTradeSalary(player.tradeSalaryRub);
  return `<button class="trade-player-row${selected ? " selected" : ""}" data-action="trade-toggle-${side}" data-player-id="${player.id}" data-asset-key="${assetKey}">
    <img class="trade-player-photo" src="${getPlayerPhotoUrl(player)}" alt="${player.name}" ${PHOTO_FALLBACK_ATTR}>
    <div class="trade-player-main">
      <span class="trade-player-name ${getNameFitClass(player.name)}" title="${player.name}">${player.name}</span>
      <span class="trade-player-subtitle"><span>${position}</span><span>${age} лет</span>${salaryLabel ? `<span>${salaryLabel}</span>` : ""}${assetLabel}</span>
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
      <span class="trade-summary-name ${getNameFitClass(item.player.name)}" title="${item.player.name}">${item.player.name}${item.assetType === "rights" ? ' <small>права</small>' : ""}</span>
      <span class="trade-summary-value">${item.userValue}</span>
    </div>
  `).join("");
};

const renderTradeReasons = (reasons = []) => {
  if (!reasons.length) return "";
  return `<div class="trade-reasons">
    <div class="trade-summary-title">Почему ИИ так оценивает</div>
    ${reasons.map((reason) => `<div class="trade-reason">${reason}</div>`).join("")}
  </div>`;
};

const renderTeamPicker = (partners, selectedTeamId, selectedTeam) => {
  const label = selectedTeam?.name || "Выберите команду";
  const logo = selectedTeam?.logoUrl || "";
  return `<details class="trade-team-picker">
    <summary>
      <span class="trade-team-picker-label">Клуб для переговоров</span>
      <span class="trade-team-picker-current">
        ${logo ? `<img src="${logo}" alt="${label}">` : `<span class="trade-team-picker-placeholder">?</span>`}
        <strong>${label}</strong>
      </span>
    </summary>
    <div class="trade-team-menu">
      ${partners.map((team) => `<button class="trade-team-option${team.id === selectedTeamId ? " active" : ""}" data-action="trade-select-team" data-team-id="${team.id}">
        <img src="${team.logoUrl}" alt="${team.name}">
        <span><strong>${team.name}</strong><small>${team.city || team.shortName || ""}</small></span>
      </button>`).join("")}
    </div>
  </details>`;
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
      salaryCap = null,
      message = ""
    } = view || {};

    const indicator = evaluation?.indicator ? evaluation.indicator.text : "Соберите пакет";
    const decision = evaluation?.decision?.label || "Добавьте игроков с обеих сторон и оцените сделку";
    const submitDisabled = !selectedTeam || !evaluation?.isValid || salaryCap?.allowed === false ? "disabled" : "";
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
          ${renderTeamPicker(partners, selectedTeamId, selectedTeam)}
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

      ${renderTradeSalaryCap(salaryCap)}

      ${selectedTeam ? `<div class="trade-grid">
        <section class="trade-panel">
          <div class="trade-panel-head">
            <div>
              <h3>Вы отдаёте</h3>
              <span>${giveCandidates.length} игроков и активов в списке</span>
            </div>
            <div class="trade-panel-badge">${giveSelectedIds.size} выбрано</div>
          </div>
          <div class="trade-list-shell">
            <div class="trade-list-header">
              <span></span>
              <span>Игрок</span>
              <span class="align-right">OVR</span>
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
              <span>${receiveCandidates.length} игроков и активов в списке</span>
            </div>
            <div class="trade-panel-badge">${receiveSelectedIds.size} выбрано</div>
          </div>
          <div class="trade-list-shell">
            <div class="trade-list-header">
              <span></span>
              <span>Игрок</span>
              <span class="align-right">OVR</span>
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
        <div class="trade-eval-row"><span>Состав ИИ после обмена</span><strong>${formatDelta(evaluation?.aiRosterProjection?.delta)}</strong></div>
        ${evaluation?.aiRequiredPremium ? `<div class="trade-eval-row"><span>Премия за лидера/ядро</span><strong>+${evaluation.aiRequiredPremium}</strong></div>` : ""}
        ${renderTradeReasons(evaluation?.reasons)}

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
