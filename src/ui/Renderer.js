import { ContractTabRenderer } from "./ContractTabRenderer.js";
import { calculateAge } from "../contracts/SeasonUtils.js";
const getNationBadge=nationality=>{
  const code=String(nationality||"").trim().toUpperCase();
  if(code==="RU"||code==="RUS")return "🇷🇺 RU";
  if(code==="CA"||code==="CAN")return "🇨🇦 CA";
  if(code==="US"||code==="USA")return "🇺🇸 US";
  if(code==="FR")return "🇫🇷 FR";
  if(code==="BY")return "🇧🇾 BY";
  if(code==="DE")return "🇩🇪 DE";
  if(code==="KZ")return "🇰🇿 KZ";
  return `🏳️ ${code||"N/A"}`;
};
const renderDraftPositionBlock=(label,players)=>{
  const names=(players||[]).map(player=>player.name).join(", ");
  return `<div class="draft-pos"><div class="muted">${label} (${players.length})</div><div>${names||"—"}</div></div>`;
};
const getSurname=player=>player.identity?.lastName||String(player.name||"").trim().split(/\s+/).slice(-1)[0]||player.name;
const getNationCode=nationality=>{
  const code=String(nationality||"").trim().toUpperCase();
  return code||"N/A";
};
const renderRosterCard=player=>{
  const photo=player.identity.photoUrl||"./player-photo/placeholder.png";
  const surname=getSurname(player);
  return `<article class="hockey-card"><img class="hockey-card-bg" src="./card/card_background.svg" alt="" aria-hidden="true"/><img class="hockey-card-photo" src="${photo}" alt="${player.name}"/><div class="hockey-card-bottom"><div class="hockey-card-name">${surname}</div><div class="hockey-card-meta">${player.identity.primaryPosition} • OVR ${player.ovr}</div></div></article>`;
};
export class Renderer{
  #teamEl;#calEl;#matchEl;#userEl;#contractTab=new ContractTabRenderer();
  constructor(){
    this.#teamEl=document.getElementById("teamPanel");
    this.#calEl=document.getElementById("calendarPanel");
    this.#matchEl=document.getElementById("matchPanel");
    this.#userEl=document.getElementById("userBadge");
  }
  renderUser(user){this.#userEl.textContent=`ID: ${user.id}`}
  renderTeam(team,activeTab){
    const cards=team.getRoster().map(player=>renderRosterCard(player)).join("");
    const header=`<div class="row"><img class="logo" src="${team.logoUrl}" alt="${team.name}"/><div><div>${team.name}</div><div class="muted">${team.city}, ${team.country} • ${team.shortName}</div></div></div>`;
    this.#teamEl.innerHTML=`<h2>Моя команда</h2>${header}${this.#renderTabs(activeTab)}<div class="list roster-grid roster-grid-cards">${cards}</div>`;
  }
  renderTeamSelection(teams,activeTeamId){
    const cards=teams.map(team=>`<button class="team-card" data-team-id="${team.id}"><img src="${team.logoUrl}" alt="${team.name}"/><span>${team.name}</span></button>`).join("");
    this.#teamEl.innerHTML=`<h2>${activeTeamId?"Выбрана команда":"Выберите команду"}</h2><div class="team-grid">${cards}</div>`;
  }
  renderMyTeamRoster(team){
    const cards=team.getRoster().map(player=>renderRosterCard(player)).join("");
    this.#matchEl.innerHTML=`<h2>Состав</h2><div class="roster-grid roster-grid-cards">${cards}</div>`;
  }
  renderContracts(rows,negotiation){this.#matchEl.innerHTML=this.#contractTab.render(rows,negotiation)}
  renderConfirmSelection(team){
    const modal=`<div class="modal"><div class="modal-card"><div class="row"><img class="logo" src="${team.logoUrl}" alt="${team.name}"/><div><div>${team.name}</div><div class="muted">${team.city}, ${team.country}</div></div></div><div class="modal-actions"><button class="btn" data-action="confirm-team">Обычная игра</button><button class="btn" data-action="start-fantasy-draft">Фэнтези драфт</button><button class="btn secondary" data-action="cancel-team">Отмена</button></div></div></div>`;
    this.#teamEl.insertAdjacentHTML("beforeend",modal);
  }
  renderFantasyDraft(draft,team){
    const selectedPlayer=draft.availablePlayers.find(player=>player.id===draft.selectedPlayerId)||null;
    const draftHeader=`<div class="row"><img class="logo" src="${team.logoUrl}" alt="${team.name}"/><div><div>Фэнтези драфт — ${team.name}</div><div class="muted">Раунд ${draft.currentRound}/20 • Пик ${draft.currentPickInRound}/${draft.teams.length} • Общий #${draft.pickNumber}/${draft.totalPicks}</div></div></div>`;
    const teamRows=draft.teams.map(item=>`<div class="muted">${item.name}: ${item.pickedCount}/20</div>`).join("");
    const flow=draft.flow.map(item=>`<div class="muted">${item.isDone?"✅":(item.isCurrent?"▶":"○")} ${item.step}</div>`).join("");
    const orderPreview=draft.upcomingOrder.map(item=>`<div class="muted">R${item.round}.${item.pick} — ${draft.teams.find(teamItem=>teamItem.id===item.teamId)?.name||item.teamId}</div>`).join("");
    const userRoster=draft.userRosterByPosition||{CTR:[],LW:[],RW:[],DEF:[],G:[]};
    const rosterPanel=[
      renderDraftPositionBlock("ЦТР",userRoster.CTR||[]),
      renderDraftPositionBlock("ЛНП",userRoster.LW||[]),
      renderDraftPositionBlock("ПНП",userRoster.RW||[]),
      renderDraftPositionBlock("ЗАЩ",userRoster.DEF||[]),
      renderDraftPositionBlock("ВРТ",userRoster.G||[])
    ].join("");
    const status=draft.isComplete?"Драфт завершен":(draft.isUserTurn?`Ваш пик: ${draft.currentTeamName}`:`Пикает: ${draft.currentTeamName}`);
    const confirmText=selectedPlayer?`Задрафтовать: ${selectedPlayer.name}`:"Выберите игрока";
    const confirmDisabled=(!draft.isUserTurn||draft.isComplete||!selectedPlayer)?"disabled":"";
    this.#teamEl.innerHTML=`<h2>Режим драфта</h2>${draftHeader}<div class="list">${teamRows}</div><div class="draft-panel">${rosterPanel}</div><div class="draft-panel"><div class="muted">Core flow</div>${flow}</div><div class="draft-panel"><div class="muted">Draft order (ближайшие пики)</div>${orderPreview}</div><div class="row"><div class="muted">${status}</div><button class="btn secondary" data-action="draft-cancel">Отмена</button></div>`;
    const sortControls=`<div class="row"><button class="btn secondary" data-action="draft-sort" data-sort="ovr">OVR</button><button class="btn secondary" data-action="draft-sort" data-sort="position">Позиция</button><button class="btn secondary" data-action="draft-sort" data-sort="age">Возраст</button></div>`;
    const filterControls=`<div class="row"><button class="btn secondary" data-action="draft-filter" data-position="ALL">Все</button><button class="btn secondary" data-action="draft-filter" data-position="ЦТР">ЦТР</button><button class="btn secondary" data-action="draft-filter" data-position="ЛНП">ЛНП</button><button class="btn secondary" data-action="draft-filter" data-position="ПНП">ПНП</button><button class="btn secondary" data-action="draft-filter" data-position="ЗАЩ">ЗАЩ</button></div>`;
    const actionBar=`<div class="draft-action row"><div class="muted">Выбрано: ${selectedPlayer?`${selectedPlayer.name} • ${selectedPlayer.identity.primaryPosition} • OVR ${selectedPlayer.ovr} • ${getNationBadge(selectedPlayer.identity.nationality)}`:"—"}</div><button class="btn" ${confirmDisabled} data-action="draft-confirm-pick">${confirmText}</button></div>`;
    const cards=draft.availablePlayers.map(player=>{
      const age=calculateAge(player.identity.birthDate);
      const selectedClass=player.id===draft.selectedPlayerId?" selected":"";
      const nation=getNationBadge(player.identity.nationality);
      return `<button class="player-card player-card-button${selectedClass}" data-action="draft-select" data-player-id="${player.id}"><img class="player-photo" src="${player.identity.photoUrl||"./player-photo/placeholder.png"}" alt="${player.name}"/><div><div>${player.name}</div><div class="muted">${player.identity.primaryPosition} • OVR ${player.ovr} • Возраст ${age}</div><div class="muted">${nation}</div></div></button>`;
    }).join("");
    this.#matchEl.innerHTML=`<h2>Пул игроков</h2>${sortControls}${filterControls}${actionBar}<div class="roster-grid">${cards||"<div class=\"muted\">Нет игроков</div>"}</div>`;
  }
  renderCalendar(day,info,isLocked){
    const text=isLocked?"Сначала выберите команду":(info?.match?`${info.match.home.name} — ${info.match.away.name}`:"День отдыха");
    this.#calEl.innerHTML=`<h2>Календарь • День ${day}</h2><div class="row"><div>${text}</div><button id="playBtn" class="btn" ${isLocked?"disabled":""}>${isLocked?"Выбрать команду":"Дальше"}</button></div>`;
  }
  renderResetButton(){this.#calEl.insertAdjacentHTML("beforeend","<div class=\"row reset-row\"><button id=\"resetBtn\" class=\"btn secondary\">Новая игра</button></div>")}
  renderMatch(match,stats){
    if(match===null){this.#matchEl.innerHTML=`<h2>Матч</h2><div class="list">Сегодня отдых</div>`;return;}
    if(!match){this.#matchEl.innerHTML=`<h2>Матч</h2><div class="list">Сезон завершён</div>`;return;}
    const events=match.events.map(event=>`<div class="event">${event.minute}' ${event.team}: ${event.scorer} (+${event.assist})</div>`).join("");
    const top=stats.slice(0,4).map(item=>`${item.name} ${item.goals}+${item.assists}`).join("<br/>");
    this.#matchEl.innerHTML=`<h2>Матч</h2><div class="list">${match.home.name} ${match.homeGoals}:${match.awayGoals} ${match.away.name}</div><div class="list">${events||"Без голов"}</div><div class="list">Лидеры:<br/>${top||"Нет"}</div>`;
  }
  #renderTabs(activeTab){
    const rosterClass=activeTab==="roster"?"tab active":"tab";
    const contractClass=activeTab==="contracts"?"tab active":"tab";
    return `<div class="tab-row"><button class="${rosterClass}" data-tab="roster">Состав</button><button class="${contractClass}" data-tab="contracts">Контракты</button></div>`;
  }
}

