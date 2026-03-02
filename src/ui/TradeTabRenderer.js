import { calculateAge } from "../contracts/SeasonUtils.js";

const renderPlayerPickRow = (side, player, selectedIds) => {
  const age = calculateAge(player.identity?.birthDate);
  const selected = selectedIds.has(player.id);
  return `<button class="trade-player-row${selected ? " selected" : ""}" data-action="trade-toggle-${side}" data-player-id="${player.id}"><span class="name">${player.name}</span><span>${player.identity?.primaryPosition || "—"}</span><span>OVR ${player.ovr}</span><span>${age} лет</span></button>`;
};

const renderSelectedSummary = (items) => {
  if (!items?.length) return `<div class="muted">Пока пусто</div>`;
  return items.map((item) => `<div class="trade-summary-row"><span>${item.player.name}</span><span>${item.userValue}</span></div>`).join("");
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

    const partnerOptions = partners.map((team) => `<option value="${team.id}" ${team.id === selectedTeamId ? "selected" : ""}>${team.name}</option>`).join("");
    const indicator = evaluation?.indicator ? `${evaluation.indicator.icon} ${evaluation.indicator.text}` : "—";
    const decision = evaluation?.decision?.label || "Соберите предложение для оценки";
    const submitDisabled = !selectedTeam || !evaluation?.isValid ? "disabled" : "";

    return `<div class="trade-screen">
      <div class="trade-head">
        <h2>Обмены</h2>
        <label class="trade-team-select">Обмен с:
          <select data-action="trade-select-team">
            <option value="">Выберите команду</option>
            ${partnerOptions}
          </select>
        </label>
      </div>
      ${selectedTeam ? `<div class="trade-grid">
        <section class="trade-col">
          <h3>Вы отдаёте</h3>
          <div class="trade-list">${giveCandidates.map((player) => renderPlayerPickRow("give", player, giveSelectedIds)).join("") || `<div class="muted">Нет игроков</div>`}</div>
        </section>
        <section class="trade-col">
          <h3>Вы получаете</h3>
          <div class="trade-list">${receiveCandidates.map((player) => renderPlayerPickRow("receive", player, receiveSelectedIds)).join("") || `<div class="muted">Нет игроков</div>`}</div>
        </section>
      </div>` : `<div class="muted">Выберите команду для переговоров.</div>`}
      <div class="trade-eval-card">
        <div class="trade-eval-row"><span>Оценка сделки:</span><strong>${indicator}</strong></div>
        <div class="trade-eval-row"><span>Вердикт ИИ:</span><span>${decision}</span></div>
        <div class="trade-eval-row"><span>Ваш баланс:</span><span>${evaluation ? `${evaluation.userDelta > 0 ? "+" : ""}${evaluation.userDelta}` : "—"}</span></div>
        <div class="trade-eval-row"><span>Баланс ИИ:</span><span>${evaluation ? `${evaluation.aiDelta > 0 ? "+" : ""}${evaluation.aiDelta}` : "—"}</span></div>
        <div class="trade-summary">
          <div><div class="muted">Отдаёте (ценность)</div>${renderSelectedSummary(evaluation?.giveValues)}</div>
          <div><div class="muted">Получаете (ценность)</div>${renderSelectedSummary(evaluation?.receiveValues)}</div>
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
