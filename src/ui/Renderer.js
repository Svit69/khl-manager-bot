import { ContractTabRenderer } from "./ContractTabRenderer.js";
import { calculateAge } from "../contracts/SeasonUtils.js";
export class Renderer{
  #teamEl;#calEl;#matchEl;#userEl;#contractTab=new ContractTabRenderer();
  constructor(){
    this.#teamEl=document.getElementById("teamPanel");this.#calEl=document.getElementById("calendarPanel");
    this.#matchEl=document.getElementById("matchPanel");this.#userEl=document.getElementById("userBadge");
  }
  renderUser(user){this.#userEl.textContent=`ID: ${user.id}`}
  renderTeam(team,activeTab){
    const lines=team.lines.map(l=>`<div>${l.players.map(p=>p.name).join(" | ")}</div>`).join("");
    const header=`<div class="row"><img class="logo" src="${team.logoUrl}" alt="${team.name}"/><div><div>${team.name}</div><div class="muted">${team.city}, ${team.country} • ${team.shortName}</div></div></div>`;
    this.#teamEl.innerHTML=`<h2>Моя команда</h2>${header}${this.#renderTabs(activeTab)}<div class="list">${lines}</div>`;
  }
  renderTeamSelection(teams,activeTeamId){
    const cards=teams.map(t=>`<button class="team-card" data-team-id="${t.id}"><img src="${t.logoUrl}" alt="${t.name}"/><span>${t.name}</span></button>`).join("");
    this.#teamEl.innerHTML=`<h2>${activeTeamId?"Выбрана команда":"Выберите команду"}</h2><div class="team-grid">${cards}</div>`;
  }
  renderMyTeamRoster(team){
    const cards=team.getRoster().map(p=>{
      const photo=p.identity.photoUrl||"./player-photo/placeholder.png";
      const secondary=(p.identity.secondaryPositions||[]).join(", ");
      const position=secondary?`${p.identity.primaryPosition} (${secondary})`:p.identity.primaryPosition;
      return `<div class="player-card"><img class="player-photo" src="${photo}" alt="${p.name}"/><div><div>${p.name}</div><div class="muted">Позиция ${position} • OVR ${p.ovr}</div><div class="muted">Форма ${p.form.toFixed(2)} • Усталость ${p.fatigueStatus} (${p.fatigueScore})</div></div></div>`;
    }).join("");
    this.#matchEl.innerHTML=`<h2>Состав</h2><div class="roster-grid">${cards}</div>`;
  }
  renderContracts(rows,negotiation){this.#matchEl.innerHTML=this.#contractTab.render(rows,negotiation)}
  renderConfirmSelection(team){
    const modal=`<div class="modal"><div class="modal-card"><div class="row"><img class="logo" src="${team.logoUrl}" alt="${team.name}"/><div><div>${team.name}</div><div class="muted">${team.city}, ${team.country}</div></div></div><div class="modal-actions"><button class="btn" data-action="confirm-team">Обычная игра</button><button class="btn" data-action="start-fantasy-draft">Фэнтези драфт</button><button class="btn secondary" data-action="cancel-team">Отмена</button></div></div></div>`;
    this.#teamEl.insertAdjacentHTML("beforeend",modal);
  }
  renderFantasyDraft(draft,team){
    const header=`<div class="row"><img class="logo" src="${team.logoUrl}" alt="${team.name}"/><div><div>Фэнтези драфт — ${team.name}</div><div class="muted">Раунд ${draft.currentRound}/20 • Пик ${draft.currentPickInRound}/${draft.teams.length}</div></div></div>`;
    const teamRows=draft.teams.map(item=>`<div class="muted">${item.name}: ${item.pickedCount}/20</div>`).join("");
    const sortControls=`<div class="row"><button class="btn secondary" data-action="draft-sort" data-sort="ovr">OVR</button><button class="btn secondary" data-action="draft-sort" data-sort="position">Позиция</button><button class="btn secondary" data-action="draft-sort" data-sort="age">Возраст</button></div>`;
    const filterControls=`<div class="row"><button class="btn secondary" data-action="draft-filter" data-position="ALL">Все</button><button class="btn secondary" data-action="draft-filter" data-position="ЦТР">ЦТР</button><button class="btn secondary" data-action="draft-filter" data-position="ЛНП">ЛНП</button><button class="btn secondary" data-action="draft-filter" data-position="ПНП">ПНП</button><button class="btn secondary" data-action="draft-filter" data-position="ЗАЩ">ЗАЩ</button></div>`;
    const canPick=draft.isUserTurn && !draft.isComplete;
    const playerCards=draft.availablePlayers.map(player=>{
      const age=calculateAge(player.identity.birthDate);
      const position=player.identity?.primaryPosition||"";
      const action=canPick?`<button class="btn" data-action="draft-pick" data-player-id="${player.id}">Задрафтовать</button>`:"";
      return `<div class="player-card"><img class="player-photo" src="${player.identity.photoUrl||"./player-photo/placeholder.png"}" alt="${player.name}"/><div><div>${player.name}</div><div class="muted">${position} • OVR ${player.ovr} • Возраст ${age}</div>${action}</div></div>`;
    }).join("");
    const status=draft.isComplete?"Драфт завершен":(draft.isUserTurn?`Ваш пик: ${draft.currentTeamName}`:`Пикает: ${draft.currentTeamName}`);
    this.#teamEl.innerHTML=`<h2>Режим драфта</h2>${header}<div class="list">${teamRows}</div><div class="row"><div class="muted">${status}</div><button class="btn secondary" data-action="draft-cancel">Отмена</button></div>`;
    this.#matchEl.innerHTML=`<h2>Пул игроков</h2>${sortControls}${filterControls}<div class="roster-grid">${playerCards||"<div class=\"muted\">Нет игроков</div>"}</div>`;
  }
  renderCalendar(day,info,isLocked){
    const text=isLocked?"Сначала выберите команду":(info?.match?`${info.match.home.name} — ${info.match.away.name}`:"День отдыха");
    this.#calEl.innerHTML=`<h2>Календарь • День ${day}</h2><div class="row"><div>${text}</div><button id="playBtn" class="btn" ${isLocked?"disabled":""}>${isLocked?"Выбрать команду":"Дальше"}</button></div>`;
  }
  renderResetButton(){this.#calEl.insertAdjacentHTML("beforeend","<div class=\"row reset-row\"><button id=\"resetBtn\" class=\"btn secondary\">Новая игра</button></div>")}
  renderMatch(match,stats){
    if(match===null){this.#matchEl.innerHTML=`<h2>Матч</h2><div class="list">Сегодня отдых</div>`;return;}
    if(!match){this.#matchEl.innerHTML=`<h2>Матч</h2><div class="list">Сезон завершён</div>`;return;}
    const events=match.events.map(e=>`<div class="event">${e.minute}' ${e.team}: ${e.scorer} (+${e.assist})</div>`).join("");
    const top=stats.slice(0,4).map(s=>`${s.name} ${s.goals}+${s.assists}`).join("<br/>");
    this.#matchEl.innerHTML=`<h2>Матч</h2><div class="list">${match.home.name} ${match.homeGoals}:${match.awayGoals} ${match.away.name}</div><div class="list">${events||"Без голов"}</div><div class="list">Лидеры:<br/>${top||"Нет"}</div>`;
  }
  #renderTabs(activeTab){
    const rosterClass=activeTab==="roster"?"tab active":"tab";
    const contractClass=activeTab==="contracts"?"tab active":"tab";
    return `<div class="tab-row"><button class="${rosterClass}" data-tab="roster">Состав</button><button class="${contractClass}" data-tab="contracts">Контракты</button></div>`;
  }
}

