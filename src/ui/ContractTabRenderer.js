export class ContractTabRenderer{
  render(rows,negotiation){
    const content=rows.map(row=>{
      const contractInfo=row.contractEndDate?`До ${row.contractEndDate}`:"Контракт не найден";
      const status=this.#formatStatus(row.age,row.khlGamesPlayed);
      const isLocked=Boolean(row.isRenewalLocked);
      const buttonLabel=isLocked?"Продлено":"Продлить";
      const disabledAttr=isLocked?"disabled":"";
      const controls=`<div class="row"><button class="btn secondary" ${disabledAttr} data-action="open-negotiation" data-player-id="${row.playerId}">${buttonLabel}</button></div>`;
      const lockNotice=row.isRenewalLocked?`<div class="contract-lock-note">${row.renewalLockReason}</div>`:"";
      const negotiationPanel=(negotiation && negotiation.playerId===row.playerId)
        ? this.#renderNegotiationPanel(negotiation)
        : "";
      return `<div class="contract-card"><div class="contract-row"><div class="contract-row-top"><span class="contract-player-name">${row.displayName}</span><span class="contract-chip ${status==="НСА"?"warning":"ok"}">${status}</span></div><div class="contract-meta-grid"><span>Позиция: <strong>${row.position}</strong></span><span>OVR: <strong>${row.ovr}</strong></span><span>Возраст: <strong>${row.age}</strong></span><span>${contractInfo}</span></div>${lockNotice}${controls}</div>${negotiationPanel}</div>`;
    }).join("");
    return `<h2>Контракты</h2><div class="contract-grid">${content||"<div class=\"muted\">Игроки не найдены</div>"}</div>`;
  }
  #renderNegotiationPanel(negotiation){
    const preview=negotiation.preview;
    const reasons=preview.reasons.map(r=>`<div class="negotiation-reason ${r.value>=0?"pos":"neg"}">${r.value>=0?"+":""}${r.value} ${r.text}</div>`).join("")||"";
    const offer=negotiation.offer;
    const market=preview.marketSalary;
    const offerLine=`Предложение: ${offer.years} г. • ${Math.round(offer.salaryRub/1000000)} млн`;
    const reaction=`Ожидаемая реакция: ${preview.state.emoji} ${preview.state.label} (~${preview.state.chance}%)`;
    const chance=Math.max(0,Math.min(100,Number(preview.state.chance)||0));
    const outcome=negotiation.outcome?`<div class="muted">Ответ: ${negotiation.outcome}</div>`:"";
    const lockNotice=preview.isRenewalLocked?`<div class="muted">${preview.renewalLockReason}</div>`:"";
    const yearsButtons=[1,2,3,4].map(y=>`<button class="btn secondary" data-action="set-offer-years" data-player-id="${preview.playerId}" data-years="${y}">${y} г.</button>`).join("");
    const salaryButtons=[0.8,0.9,1,1.1,1.2].map(m=>{
      const label=`${Math.round(m*100)}%`;
      return `<button class="btn secondary" data-action="set-offer-salary" data-player-id="${preview.playerId}" data-multiplier="${m}">${label}</button>`;
    }).join("");
    const submitDisabled=preview.isRenewalLocked?"disabled":"";
    return `<div class="negotiation-panel"><div class="negotiation-head"><div class="muted">Отношение к клубу: ${preview.state.emoji} ${preview.state.label}</div><div class="negotiation-chance"><span style="width:${chance}%"></span></div></div><div class="negotiation-reasons">${reasons}</div><div class="negotiation-offer-grid"><div class="muted">${offerLine}</div><div class="muted">Рынок: ${Math.round(market/1000000)} млн</div></div><div class="muted">${reaction}</div>${lockNotice}<div class="row">${yearsButtons}</div><div class="row">${salaryButtons}</div><div class="row"><button class="btn" ${submitDisabled} data-action="submit-offer" data-player-id="${preview.playerId}">Отправить оффер</button><button class="btn secondary" data-action="close-negotiation" data-player-id="${preview.playerId}">Закрыть</button></div>${outcome}</div>`;
  }
  #formatStatus(age,khlGamesPlayed){
    if(age>=29)return "НСА";
    if(age>=28 && (khlGamesPlayed||0)>=250)return "НСА";
    return "ОСА";
  }
}
