import { FreeAgentContractOfferControlPanel } from "./contract-offer/FreeAgentContractOfferControlPanel.js";

const getNameFitClass = (name = "") => name.length > 28 ? "name-fit-xs" : name.length > 22 ? "name-fit-sm" : "";
const formatSavePercentage = (value) => {
  const safe = Number(value) || 0;
  return safe ? safe.toFixed(3).replace(/^0/, "") : "-";
};
const renderSeasonStats = (row) => {
  const stats = row.seasonStats || {};
  if (row.position === "\u0412\u0420\u0422") {
    return `\u0418 ${stats.games || 0} \u2022 SV% ${formatSavePercentage(stats.savePercentage)} \u2022 SV ${stats.saves || 0}`;
  }
  const points = Number(stats.points) || (Number(stats.goals) || 0) + (Number(stats.assists) || 0);
  return `\u0418 ${stats.games || 0} \u2022 ${stats.goals || 0}+${stats.assists || 0}=${points}`;
};

export class FreeAgentTabRenderer {
  #contractOfferControlPanel = new FreeAgentContractOfferControlPanel();

  render(rows, negotiation, salaryCap = null) {
    const capMarkup = this.#renderSalaryCapSummary(salaryCap);
    const content = rows
      .map((row) => {
        const status = row.freeAgentStatus || this.#formatStatus(row.age, row.khlGamesPlayed);
        const controls = `<div class="row"><button class="btn secondary" data-action="open-negotiation" data-player-id="${row.playerId}">Подписать</button></div>`;
        const negotiationPanel =
          negotiation && negotiation.playerId === row.playerId ? this.#contractOfferControlPanel.render(negotiation) : "";

        return `<div class="contract-card"><div class="contract-row"><div class="contract-row-top"><span class="contract-player-name ${getNameFitClass(row.displayName)}" title="${row.displayName}">${row.displayName}</span><span class="contract-chip ${status === "НСА" ? "warning" : "ok"}">${status}</span></div><div class="contract-meta-grid"><span>Позиция: <strong>${row.position}</strong></span><span>OVR: <strong>${row.ovr}</strong></span><span>Возраст: <strong>${row.age}</strong></span><span>\u0421\u0435\u0437\u043e\u043d: <strong>${renderSeasonStats(row)}</strong></span><span>Свободный агент</span></div>${controls}</div>${negotiationPanel}</div>`;
      })
      .join("");

    return `<h2>Свободные агенты</h2>${capMarkup}<div class="contract-grid">${content || '<div class="muted">Свободных агентов нет</div>'}</div>`;
  }

  #renderSalaryCapSummary(cap) {
    if (!cap?.enabled) return "";
    return `<section class="salary-cap-summary"><div><span>Потолок ${cap.seasonLabel}</span><strong>${this.#formatMillions(cap.payrollRub)} / ${this.#formatMillions(cap.capRub)} млн</strong></div><div><span>Доступно</span><strong>${this.#formatMillions(cap.remainingRub)} млн</strong></div></section>`;
  }

  #formatMillions(value) {
    const millions = (Number(value) || 0) / 1000000;
    return Number.isInteger(millions) ? String(millions) : millions.toFixed(1);
  }

  #formatStatus(age, khlGamesPlayed) {
    if (age >= 29) return "НСА";
    if (age >= 28 && (khlGamesPlayed || 0) >= 250) return "НСА";
    return "ОСА";
  }
}
