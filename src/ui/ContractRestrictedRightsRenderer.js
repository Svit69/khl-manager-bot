export class ContractRestrictedRightsRenderer {
  render(rows) {
    if (!rows?.length) return "";
    const cards = rows.map((row) => this.#renderRightsCard(row)).join("");
    return `<section class="osa-rights-panel"><div class="osa-rights-head"><h3>Права на ОСА</h3><span>${rows.length}</span></div>${cards}</section>`;
  }

  #renderRightsCard(row) {
    const offer = row.userOffer || row.offer;
    const bestOffer = row.offer || {};
    return `<div class="osa-rights-card">
      <div class="osa-rights-top">
        <div class="osa-rights-player"><span class="contract-chip warning">ОСА</span><strong title="${row.playerName}">${row.playerName}</strong><span>${row.position} • OVR ${row.ovr}</span>${row.sourceLabel ? `<span>${row.sourceLabel}</span>` : ""}</div>
        <div class="osa-rights-offer"><span>Лучший оффер</span><strong>${row.offerTeamName}</strong><span>${bestOffer.years} г. • ${this.#formatMillions(bestOffer.salaryRub)} млн</span><span>Компенсация: ${row.compensationLabel || "без компенсации"}</span></div>
      </div>
      <div class="osa-rights-body">
        <div class="muted">Агент игрока принес оффершит от другого клуба. Повторите условия или отпустите игрока за компенсацию.</div>
        <div class="row">${this.#renderYearButtons(row, offer, bestOffer)}</div>
        ${this.#renderSalaryControls(row, offer, bestOffer)}
        <div class="row"><button class="btn" data-action="match-osa-offer" data-offer-id="${row.id}">Повторить оффершит</button><button class="btn secondary danger" data-action="release-osa-rights" data-offer-id="${row.id}">Забрать компенсацию</button></div>
      </div>
    </div>`;
  }

  #renderYearButtons(row, offer, bestOffer) {
    return [1, 2, 3, 4].map((years) => {
      const disabled = years < (Number(bestOffer.years) || 1) ? "disabled" : "";
      return `<button class="btn secondary ${offer.years === years ? "active" : ""}" ${disabled} data-action="set-osa-years" data-offer-id="${row.id}" data-years="${years}">${years} г.</button>`;
    }).join("");
  }

  #renderSalaryControls(row, offer, bestOffer) {
    return `<div class="negotiation-salary-box"><label class="muted" for="osa-salary-${row.id}">Ваше предложение, млн руб.</label><div class="negotiation-salary-row"><button class="btn secondary compact" data-action="adjust-osa-salary" data-offer-id="${row.id}" data-delta-million="-5">-5</button><button class="btn secondary compact" data-action="adjust-osa-salary" data-offer-id="${row.id}" data-delta-million="-1">-1</button><input id="osa-salary-${row.id}" class="negotiation-salary-input" type="number" min="${this.#formatMillionsInput(bestOffer.salaryRub)}" step="0.5" value="${this.#formatMillionsInput(offer.salaryRub)}" data-action="set-osa-salary-input" data-offer-id="${row.id}"><span class="muted">млн</span><button class="btn secondary compact" data-action="adjust-osa-salary" data-offer-id="${row.id}" data-delta-million="1">+1</button><button class="btn secondary compact" data-action="adjust-osa-salary" data-offer-id="${row.id}" data-delta-million="5">+5</button></div></div>`;
  }

  #formatMillions(value) {
    const millions = (Number(value) || 0) / 1000000;
    return Number.isInteger(millions) ? String(millions) : millions.toFixed(1);
  }

  #formatMillionsInput(value) {
    return this.#formatMillions(value).replace(",", ".");
  }
}
