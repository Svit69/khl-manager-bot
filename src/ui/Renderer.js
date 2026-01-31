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
    this.#teamEl.innerHTML=`<h2>${team.name}</h2><div class="list">${lines}</div>`;
  }
  renderCalendar(day,info){
    const text=info?.match?`${info.match.home.name} — ${info.match.away.name}`:"День отдыха";
    this.#calEl.innerHTML=`<h2>Календарь • День ${day}</h2><div class="row"><div>${text}</div><button id="playBtn" class="btn">Дальше</button></div>`;
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
