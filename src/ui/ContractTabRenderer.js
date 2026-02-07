const typeLabel=type=>({"one-way":"односторонний","two-way":"двухсторонний","three-way":"трехсторонний"}[type]||"односторонний");
export class ContractTabRenderer{
  render(rows,selectedPlayerId){
    const content=rows.map(row=>{
      const salaries=row.contracts.map(c=>`${c.season}: ${Math.round(c.salaryRub/1000000)} млн (${typeLabel(c.type)})`).join(" • ")||"нет контракта";
      const stats=`${row.seasonStats.games}И ${row.seasonStats.goals}Г ${row.seasonStats.assists}П`;
      const contractInfo=row.contractEndDate?`До ${row.contractEndDate}`:"Контракт не найден";
      const details=`${contractInfo} • Возраст ${row.age} • OVR ${row.ovr} • ${stats}`;
      const negotiation=selectedPlayerId===row.playerId?this.#renderNegotiation(row.playerId):"";
      return `<div class="contract-card"><button class="contract-row" data-action="open-negotiation" data-player-id="${row.playerId}"><span>${row.displayName}</span><span class="muted">${details}</span><span class="muted">${salaries}</span></button>${negotiation}</div>`;
    }).join("");
    return `<h2>Контракты</h2><div class="contract-grid">${content||"<div class=\"muted\">Игроки не найдены</div>"}</div>`;
  }
  #renderNegotiation(playerId){
    return `<div class="negotiation-panel"><div class="muted">Переговоры</div><div class="row"><button class="btn" data-action="negotiate-extend" data-mode="same" data-player-id="${playerId}">Продлить +1 год</button><button class="btn secondary" data-action="negotiate-extend" data-mode="raise" data-player-id="${playerId}">Продлить +1 год (+10%)</button></div></div>`;
  }
}
