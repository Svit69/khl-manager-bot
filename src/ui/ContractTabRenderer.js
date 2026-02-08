export class ContractTabRenderer{
  render(rows){
    const content=rows.map(row=>{
      const contractInfo=row.contractEndDate?`До ${row.contractEndDate}`:"Контракт не найден";
      const status=this.#formatStatus(row.age,row.khlGamesPlayed);
      const details=`${row.position} • OVR ${row.ovr} • Возраст ${row.age} • Статус ${status} • ${contractInfo}`;
      return `<div class="contract-card"><div class="contract-row"><span>${row.displayName}</span><span class="muted">${details}</span></div></div>`;
    }).join("");
    return `<h2>Контракты</h2><div class="contract-grid">${content||"<div class=\"muted\">Игроки не найдены</div>"}</div>`;
  }
  #formatStatus(age,khlGamesPlayed){
    if(age>=29)return "НСА";
    if(age>=28 && (khlGamesPlayed||0)>=250)return "НСА";
    return "ОСА";
  }
}
