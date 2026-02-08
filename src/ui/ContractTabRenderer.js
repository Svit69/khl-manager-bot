export class ContractTabRenderer{
  render(rows,negotiation){
    const content=rows.map(row=>{
      const contractInfo=row.contractEndDate?`До ${row.contractEndDate}`:"Контракт не найден";
      const status=this.#formatStatus(row.age,row.khlGamesPlayed);
      const details=`${row.position} • OVR ${row.ovr} • Возраст ${row.age} • Статус ${status} • ${contractInfo}`;
      const controls=`<div class=\"row\"><button class=\"btn secondary\" data-action=\"open-negotiation\" data-player-id=\"${row.playerId}\">Продлить</button></div>`;
      const negotiationPanel=(negotiation && negotiation.playerId===row.playerId)
        ? this.#renderNegotiationPanel(negotiation)
        : "";
      return `<div class=\"contract-card\"><div class=\"contract-row\"><span>${row.displayName}</span><span class=\"muted\">${details}</span>${controls}</div>${negotiationPanel}</div>`;
    }).join("");
    return `<h2>Контракты</h2><div class=\"contract-grid\">${content||"<div class=\"muted\">Игроки не найдены</div>"}</div>`;
  }
  #renderNegotiationPanel(negotiation){
    const preview=negotiation.preview;
    const reasons=preview.reasons.map(r=>`<div class=\"muted\">${r.value>=0?"+":""}${r.value} ${r.text}</div>`).join("")||"";
    const offer=negotiation.offer;
    const market=preview.marketSalary;
    const offerLine=`Предложение: ${offer.years} г. • ${Math.round(offer.salaryRub/1000000)} млн`;
    const reaction=`Ожидаемая реакция: ${preview.state.emoji} ${preview.state.label} (~${preview.state.chance}%)`;
    const outcome=negotiation.outcome?`<div class=\"muted\">Ответ: ${negotiation.outcome}</div>`:"";
    const yearsButtons=[1,2,3,4].map(y=>`<button class=\"btn secondary\" data-action=\"set-offer-years\" data-player-id=\"${preview.playerId}\" data-years=\"${y}\">${y} г.</button>`).join("");
    const salaryButtons=[0.8,0.9,1,1.1,1.2].map(m=>{
      const label=`${Math.round(m*100)}%`;
      return `<button class=\"btn secondary\" data-action=\"set-offer-salary\" data-player-id=\"${preview.playerId}\" data-multiplier=\"${m}\">${label}</button>`;
    }).join("");
    return `<div class=\"negotiation-panel\">
      <div class=\"muted\">Отношение к клубу: ${preview.state.emoji} ${preview.state.label}</div>
      ${reasons}
      <div class=\"muted\">${offerLine}</div>
      <div class=\"muted\">Рынок: ${Math.round(market/1000000)} млн</div>
      <div class=\"muted\">${reaction}</div>
      <div class=\"row\">${yearsButtons}</div>
      <div class=\"row\">${salaryButtons}</div>
      <div class=\"row\">
        <button class=\"btn\" data-action=\"submit-offer\" data-player-id=\"${preview.playerId}\">Отправить оффер</button>
        <button class=\"btn secondary\" data-action=\"close-negotiation\" data-player-id=\"${preview.playerId}\">Закрыть</button>
      </div>
      ${outcome}
    </div>`;
  }
  #formatStatus(age,khlGamesPlayed){
    if(age>=29)return "НСА";
    if(age>=28 && (khlGamesPlayed||0)>=250)return "НСА";
    return "ОСА";
  }
}
