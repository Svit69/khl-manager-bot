import { renderExternalRightsPanel } from "./ExternalRightsCardRenderer.js";

const getNameFitClass = (name = "") => name.length > 28 ? "name-fit-xs" : name.length > 22 ? "name-fit-sm" : "";

export class ContractTabRenderer {
  render(rows, negotiation, restrictedRights = [], externalPlayers = [], salaryCap = null) {
    const restrictedMarkup = this.#renderRestrictedRights(restrictedRights);
    const externalMarkup = this.#renderExternalPlayers(externalPlayers);
    const capMarkup = this.#renderSalaryCapSummary(salaryCap);
    const content = rows
      .map((row) => {
        const contractInfo = row.contractEndDate ? `До ${row.contractEndDate}` : "Контракт не найден";
        const status = row.freeAgentStatus || this.#formatStatus(row.age, row.khlGamesPlayed);
        const isLocked = Boolean(row.isRenewalLocked);
        const buttonLabel = isLocked ? "Продлено" : "Продлить";
        const disabledAttr = isLocked ? "disabled" : "";
        const controls = `<div class="row"><button class="btn secondary" ${disabledAttr} data-action="open-negotiation" data-player-id="${row.playerId}">${buttonLabel}</button></div>`;
        const lockNotice = row.isRenewalLocked
          ? `<div class="contract-lock-note">${row.renewalLockReason}</div>`
          : "";
        const negotiationPanel =
          negotiation && negotiation.playerId === row.playerId ? this.#renderNegotiationPanel(negotiation) : "";

        return `<div class="contract-card"><div class="contract-row"><div class="contract-row-top"><span class="contract-player-name ${getNameFitClass(row.displayName)}" title="${row.displayName}">${row.displayName}</span><span class="contract-chip ${status === "НСА" ? "warning" : "ok"}">${status}</span></div><div class="contract-meta-grid"><span>Позиция: <strong>${row.position}</strong></span><span>OVR: <strong>${row.ovr}</strong></span><span>Возраст: <strong>${row.age}</strong></span><span>${contractInfo}</span></div>${lockNotice}${controls}</div>${negotiationPanel}</div>`;
      })
      .join("");

    return `<h2>Контракты</h2>${capMarkup}${restrictedMarkup}${externalMarkup}<div class="contract-grid">${content || '<div class="muted">Игроки не найдены</div>'}</div>`;
  }

  #renderSalaryCapSummary(cap) {
    if (!cap?.enabled) return "";
    return `<section class="salary-cap-summary"><div><span>Потолок ${cap.seasonLabel}</span><strong>${this.#formatMillions(cap.payrollRub)} / ${this.#formatMillions(cap.capRub)} млн</strong></div><div><span>Доступно</span><strong>${this.#formatMillions(cap.remainingRub)} млн</strong></div></section>`;
  }

  #renderExternalPlayers(rows) {
    return renderExternalRightsPanel(rows || []);
  }

  #renderRestrictedRights(rows) {
    if (!rows?.length) return "";
    const cards = rows.map((row) => {
      const offer = row.userOffer || row.offer;
      const bestOffer = row.offer || {};
      const yearsButtons = [1, 2, 3, 4]
        .map((years) => {
          const disabled = years < (Number(bestOffer.years) || 1) ? "disabled" : "";
          return `<button class="btn secondary ${offer.years === years ? "active" : ""}" ${disabled} data-action="set-osa-years" data-offer-id="${row.id}" data-years="${years}">${years} г.</button>`;
        })
        .join("");
      const salaryControls = `<div class="negotiation-salary-box"><label class="muted" for="osa-salary-${row.id}">Ваше предложение, млн руб.</label><div class="negotiation-salary-row"><button class="btn secondary compact" data-action="adjust-osa-salary" data-offer-id="${row.id}" data-delta-million="-5">-5</button><button class="btn secondary compact" data-action="adjust-osa-salary" data-offer-id="${row.id}" data-delta-million="-1">-1</button><input id="osa-salary-${row.id}" class="negotiation-salary-input" type="number" min="${this.#formatMillionsInput(bestOffer.salaryRub)}" step="0.5" value="${this.#formatMillionsInput(offer.salaryRub)}" data-action="set-osa-salary-input" data-offer-id="${row.id}"><span class="muted">млн</span><button class="btn secondary compact" data-action="adjust-osa-salary" data-offer-id="${row.id}" data-delta-million="1">+1</button><button class="btn secondary compact" data-action="adjust-osa-salary" data-offer-id="${row.id}" data-delta-million="5">+5</button></div></div>`;
      return `<div class="osa-rights-card">
        <div class="osa-rights-top">
          <div class="osa-rights-player"><span class="contract-chip warning">ОСА</span><strong title="${row.playerName}">${row.playerName}</strong><span>${row.position} • OVR ${row.ovr}</span>${row.sourceLabel ? `<span>${row.sourceLabel}</span>` : ""}</div>
          <div class="osa-rights-offer"><span>Лучший оффер</span><strong>${row.offerTeamName}</strong><span>${bestOffer.years} г. • ${this.#formatMillions(bestOffer.salaryRub)} млн</span><span>Компенсация: ${row.compensationLabel || "без компенсации"}</span></div>
        </div>
        <div class="osa-rights-body">
          <div class="muted">Агент игрока принес оффершит от другого клуба. Повторите условия или отпустите игрока за компенсацию.</div>
          <div class="row">${yearsButtons}</div>
          ${salaryControls}
          <div class="row"><button class="btn" data-action="match-osa-offer" data-offer-id="${row.id}">Повторить оффершит</button><button class="btn secondary danger" data-action="release-osa-rights" data-offer-id="${row.id}">Забрать компенсацию</button></div>
        </div>
      </div>`;
    }).join("");
    return `<section class="osa-rights-panel"><div class="osa-rights-head"><h3>Права на ОСА</h3><span>${rows.length}</span></div>${cards}</section>`;
  }

  #renderNegotiationPanel(negotiation) {
    const preview = negotiation.preview;
    const reasons =
      preview.reasons
        .map(
          (reason) =>
            `<div class="negotiation-reason ${reason.value >= 0 ? "pos" : "neg"}">${reason.value >= 0 ? "+" : ""}${reason.value} ${reason.text}</div>`,
        )
        .join("") || "";
    const offer = negotiation.offer;
    const market = preview.marketSalary;
    const teamAdjustedDemand = preview.teamAdjustedDemand || market;
    const offerLine = `Предложение: ${offer.years} г. • ${this.#formatMillions(offer.salaryRub)} млн`;
    const marketLine = preview.marketSampleSize
      ? `Рынок: ${this.#formatMillions(market)} млн • ${preview.marketSampleSize} игроков • ${preview.marketRangeLabel}`
      : `Рынок: ${this.#formatMillions(market)} млн • недостаточно игроков в диапазоне ${preview.marketRangeLabel}`;
    const demandLine = `Ожидание от клуба: ${this.#formatMillions(teamAdjustedDemand)} млн`;
    const reaction = `Вероятность согласия: ${preview.state.emoji} ${preview.state.label} (~${preview.state.chance}%)`;
    const capMarkup = this.#renderSalaryCapHint(preview.salaryCap, offer.salaryRub);
    const chance = Math.max(0, Math.min(100, Number(preview.state.chance) || 0));
    const outcome = negotiation.outcome ? `<div class="muted">Ответ: ${negotiation.outcome}</div>` : "";
    const lockNotice = preview.isRenewalLocked ? `<div class="muted">${preview.renewalLockReason}</div>` : "";
    const yearsButtons = [1, 2, 3, 4]
      .map(
        (years) =>
          `<button class="btn secondary ${offer.years === years ? "active" : ""}" data-action="set-offer-years" data-player-id="${preview.playerId}" data-years="${years}">${years} г.</button>`,
      )
      .join("");
    const salaryControls = `<div class="negotiation-salary-box"><label class="muted" for="salary-input-${preview.playerId}">Зарплата, млн руб.</label><div class="negotiation-salary-row"><button class="btn secondary compact" data-action="adjust-offer-salary" data-player-id="${preview.playerId}" data-delta-million="-5">-5</button><button class="btn secondary compact" data-action="adjust-offer-salary" data-player-id="${preview.playerId}" data-delta-million="-1">-1</button><input id="salary-input-${preview.playerId}" class="negotiation-salary-input" type="number" min="0.5" step="0.5" value="${this.#formatMillionsInput(offer.salaryRub)}" data-action="set-offer-salary-input" data-player-id="${preview.playerId}"><span class="muted">млн</span><button class="btn secondary compact" data-action="adjust-offer-salary" data-player-id="${preview.playerId}" data-delta-million="1">+1</button><button class="btn secondary compact" data-action="adjust-offer-salary" data-player-id="${preview.playerId}" data-delta-million="5">+5</button><button class="btn secondary compact" data-action="set-offer-demand-salary" data-player-id="${preview.playerId}">Ожидание</button><button class="btn secondary compact" data-action="set-offer-market-salary" data-player-id="${preview.playerId}">Рынок</button></div></div>`;
    const submitDisabled = preview.isRenewalLocked ? "disabled" : "";

    return `<div class="negotiation-panel"><div class="negotiation-head"><div class="muted">Отношение к клубу: ${preview.state.emoji} ${preview.state.label}</div><div class="negotiation-chance"><span style="width:${chance}%"></span></div></div>${capMarkup}<div class="negotiation-reasons">${reasons}</div><div class="negotiation-offer-grid"><div class="muted">${offerLine}</div><div class="muted">${marketLine}</div><div class="muted">${demandLine}</div></div><div class="muted">${reaction}</div>${lockNotice}<div class="row">${yearsButtons}</div>${salaryControls}<div class="row"><button class="btn" ${submitDisabled} data-action="submit-offer" data-player-id="${preview.playerId}">Отправить оффер</button><button class="btn secondary" data-action="close-negotiation" data-player-id="${preview.playerId}">Закрыть</button></div>${outcome}</div>`;
  }

  #renderSalaryCapHint(cap, offerSalaryRub = 0) {
    if (!cap?.enabled) return "";
    const remaining = this.#formatMillions(cap.remainingRub);
    const projected = this.#formatMillions((Number(cap.payrollRub) || 0) + (Number(offerSalaryRub) || 0));
    const stateClass = cap.offerFits ? "ok" : "danger";
    return `<div class="negotiation-cap-hint ${stateClass}"><div><span>Потолок ${cap.seasonLabel}</span><strong>${this.#formatMillions(cap.payrollRub)} / ${this.#formatMillions(cap.capRub)} млн</strong></div><div><span>Можно предложить</span><strong>${remaining} млн</strong></div><div><span>После оффера</span><strong>${projected} млн</strong></div></div>`;
  }

  #formatMillions(value) {
    const millions = (Number(value) || 0) / 1000000;
    return Number.isInteger(millions) ? String(millions) : millions.toFixed(1);
  }

  #formatMillionsInput(value) {
    return this.#formatMillions(value).replace(",", ".");
  }

  #formatStatus(age, khlGamesPlayed) {
    if (age >= 29) return "НСА";
    if (age >= 28 && (khlGamesPlayed || 0) >= 250) return "НСА";
    return "ОСА";
  }
}
