export class Renderer{
  #teamEl;#calEl;#matchEl;#userEl;
  constructor(){
    this.#teamEl=document.getElementById("teamPanel");
    this.#calEl=document.getElementById("calendarPanel");
    this.#matchEl=document.getElementById("matchPanel");
    this.#userEl=document.getElementById("userBadge");
  }
  renderUser(user){this.#userEl.textContent=`ID: ${user.id}`}
  renderTeam(team){
    const lines=team.lines.map(l=>`<div>${l.players.map(p=>p.name).join(" | ")}</div>`).join("");
    const header=`<div class="row"><img class="logo" src="${team.logoUrl}" alt="${team.name}"/><div><div>${team.name}</div><div class="muted">${team.city}, ${team.country} • ${team.shortName}</div></div></div>`;
    this.#teamEl.innerHTML=`<h2>Моя команда</h2>${header}<div class="list">${lines}</div>`;
  }
  renderTeamSelection(teams,activeTeamId){
    const cards=teams.map(t=>`<button class="team-card" data-team-id="${t.id}"><img src="${t.logoUrl}" alt="${t.name}"/><span>${t.name}</span></button>`).join("");
    const note=activeTeamId?"Выбрана команда":"Выберите команду";
    this.#teamEl.innerHTML=`<h2>${note}</h2><div class="team-grid">${cards}</div>`;
  }
  renderMyTeamRoster(team){
    const players=team.getRoster();
    const cards=players.map(p=>{
      const photo=p.identity.photoUrl||"./player-photo/placeholder.png";
      const main=p.identity.primaryPosition||"";
      const secondary=(p.identity.secondaryPositions||[]).join(", ");
      const pos=secondary?`${main} (${secondary})`:main;
      return `<div class="player-card"><img class="player-photo" src="${photo}" alt="${p.name}"/><div><div>${p.name}</div><div class="muted">Позиция ${pos} • OVR ${p.ovr}</div><div class="muted">Форма ${p.form.toFixed(2)} • Усталость ${p.fatigueStatus} (${p.fatigueScore})</div></div></div>`;
    }).join("");
    this.#matchEl.innerHTML=`<h2>Состав</h2><div class="roster-grid">${cards}</div>`;
  }
  renderConfirmSelection(team){
    const modal=`<div class="modal"><div class="modal-card"><div class="row"><img class="logo" src="${team.logoUrl}" alt="${team.name}"/><div><div>${team.name}</div><div class="muted">${team.city}, ${team.country}</div></div></div><div class="modal-actions"><button class="btn" data-action="confirm-team">Подтвердить</button><button class="btn secondary" data-action="cancel-team">Отмена</button></div></div></div>`;
    this.#teamEl.insertAdjacentHTML("beforeend",modal);
  }
  renderCalendar(day,info,isLocked){
    const text=isLocked?"Сначала выберите команду":(info?.match?`${info.match.home.name} — ${info.match.away.name}`:"День отдыха");
    const disabled=isLocked?"disabled":"";const label=isLocked?"Выбрать команду":"Дальше";
    this.#calEl.innerHTML=`<h2>Календарь • День ${day}</h2><div class="row"><div>${text}</div><button id="playBtn" class="btn" ${disabled}>${label}</button></div>`;
  }
  renderResetButton(){
    const html=`<div class="row reset-row"><button id="resetBtn" class="btn secondary">Новая игра</button></div>`;
    this.#calEl.insertAdjacentHTML("beforeend",html);
  }
  renderMatch(match,stats){
    if(match===null){this.#matchEl.innerHTML=`<h2>Матч</h2><div class="list">Сегодня отдых</div>`;return;}
    if(!match){this.#matchEl.innerHTML=`<h2>Матч</h2><div class="list">Сезон завершён</div>`;return;}
    const score=`${match.home.name} ${match.homeGoals}:${match.awayGoals} ${match.away.name}`;
    const events=match.events.map(e=>`<div class="event">${e.minute}' ${e.team}: ${e.scorer} (+${e.assist})</div>`).join("");
    const top=stats.slice(0,4).map(s=>`${s.name} ${s.goals}+${s.assists}`).join("<br/>");
    this.#matchEl.innerHTML=`<h2>Матч</h2><div class="list">${score}</div><div class="list">${events||"Без голов"}</div><div class="list">Лидеры:<br/>${top||"Нет"}</div>`;
  }
}
