export class ContractTabRenderer{
  render(rows){
    const content=rows.map(row=>{
      const contractInfo=row.contractEndDate?`До ${row.contractEndDate}`:"Контракт не найден";
      const status=this.#formatStatus(row.fatigueStatus);
      const details=`${row.position} • OVR ${row.ovr} • Возраст ${row.age} • Статус ${status} • ${contractInfo}`;
      return `<div class="contract-card"><div class="contract-row"><span>${row.displayName}</span><span class="muted">${details}</span></div></div>`;
    }).join("");
    return `<h2>Контракты</h2><div class="contract-grid">${content||"<div class=\"muted\">Игроки не найдены</div>"}</div>`;
  }
  #formatStatus(fatigueStatus){
    if(fatigueStatus==="green"||fatigueStatus==="yellow")return "НСА";
    if(fatigueStatus)return "ОСА";
    return "НСА";
  }
}
