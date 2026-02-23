import { ContractTabRenderer } from "./ContractTabRenderer.js";
import { calculateAge } from "../contracts/SeasonUtils.js";
const NATION_FLAG_ASSET_BY_CODE=Object.freeze({
  RU:"./flags/icon-russia.png",RUS:"./flags/icon-russia.png",
  CA:"./flags/icon-canada.png",CAN:"./flags/icon-canada.png",
  US:"./flags/icon-usa.png",USA:"./flags/icon-usa.png",
  FR:"./flags/icon-france.png",
  BY:"./flags/icon-belarus.png",
  DE:"./flags/icon-germany.png",
  KZ:"./flags/icon-kazakhstan.png",
  SE:"./flags/icon-sweden.png",SWE:"./flags/icon-sweden.png",
  CZ:"./flags/icon-czech.png",CZE:"./flags/icon-czech.png",
  FI:"./flags/icon-finland.png",FIN:"./flags/icon-finland.png",
  SK:"./flags/icon-slovakia.png",SVK:"./flags/icon-slovakia.png",
  SI:"./flags/icon-slovenia.png",SVN:"./flags/icon-slovenia.png",
  NL:"./flags/icon-netherlands.png",NED:"./flags/icon-netherlands.png",
  HR:"./flags/icon-croatia.png",CRO:"./flags/icon-croatia.png",
  CN:"./flags/icon-china.png",CHN:"./flags/icon-china.png"
});
const getNationFlagAsset=nationality=>NATION_FLAG_ASSET_BY_CODE[String(nationality||"").trim().toUpperCase()]||"";
const renderNationFlagIcon=(nationality,altText,className="nation-flag-icon")=>{
  const src=getNationFlagAsset(nationality);
  return src
    ? `<img class="${className}" src="${src}" alt="${altText||""}"/>`
    : `<span class="${className} nation-flag-fallback" aria-hidden="true">🏳️</span>`;
};
const getNationBadge=nationality=>{
  const code=String(nationality||"").trim().toUpperCase()||"N/A";
  return `<span class="nation-badge-inline">${renderNationFlagIcon(code,`Флаг ${code}`,"nation-flag-inline")}<span>${code}</span></span>`;
};
const renderDraftPositionBlock=(label,players)=>{
  const names=(players||[]).map(player=>player.name).join(", ");
  return `<div class="draft-pos"><div class="muted">${label} (${players.length})</div><div>${names||"—"}</div></div>`;
};
const getDraftTargetByPosition=position=>{
  if(position==="CTR")return 4;
  if(position==="LW")return 4;
  if(position==="RW")return 4;
  if(position==="DEF")return 6;
  if(position==="G")return 2;
  return 0;
};
const renderDraftNeedsGrid=userRoster=>{
  const items=[
    {key:"CTR",label:"ЦТР"},
    {key:"LW",label:"ЛНП"},
    {key:"RW",label:"ПНП"},
    {key:"DEF",label:"ЗАЩ"},
    {key:"G",label:"ВРТ"}
  ];
  return `<div class="draft-needs-grid">${items.map(item=>{
    const current=(userRoster[item.key]||[]).length;
    const target=getDraftTargetByPosition(item.key);
    const ratio=target>0?Math.min(1,current/target):0;
    return `<div class="draft-need-card"><div class="draft-need-head"><span>${item.label}</span><span>${current}/${target}</span></div><div class="draft-need-bar"><span style="width:${Math.round(ratio*100)}%"></span></div></div>`;
  }).join("")}</div>`;
};
const getSurname=player=>player.identity?.lastName||String(player.name||"").trim().split(/\s+/).slice(-1)[0]||player.name;
const getNationCode=nationality=>{
  const code=String(nationality||"").trim().toUpperCase();
  return code||"N/A";
};
const getNationFlag=nationality=>{
  const code=String(nationality||"").trim().toUpperCase();
  return renderNationFlagIcon(code,`Флаг ${code||"N/A"}`,"nation-flag-card");
};
const renderRosterCard=(player,extraClass="")=>{
  const photo=player.identity.photoUrl||"./player-photo/placeholder.png";
  const surname=getSurname(player).toUpperCase();
  const age=calculateAge(player.identity.birthDate);
  const nationCode=getNationCode(player.identity.nationality);
  const nationFlag=getNationFlag(player.identity.nationality);
  return `<article class="hockey-card${extraClass?` ${extraClass}`:""}"><div class="hockey-card-layers"><img class="hockey-card-bg" src="./card/card_background.svg" alt="" aria-hidden="true"/><img class="hockey-card-photo" src="${photo}" alt="${player.name}"/><img class="hockey-card-front" src="./card/card_front.svg" alt="" aria-hidden="true"/></div><div class="hockey-card-top"><span class="hockey-card-ovr">${player.ovr}</span><span class="hockey-card-pos">${player.identity.primaryPosition}</span></div><div class="hockey-card-name-band">${surname}</div><div class="hockey-card-meta-row"><span>${age} ЛЕТ</span><span>${nationFlag} ${nationCode}</span></div></article>`;
};
const renderRosterSlotCard=(player,slot,extraClass="")=>{
  const attrs=[
    `class="roster-slot-card"`,
    `data-roster-slot="1"`,
    `data-roster-kind="${slot.kind}"`,
    `data-player-id="${player.id}"`,
    `draggable="true"`
  ];
  if(slot.kind==="line"){
    attrs.push(`data-line-index="${slot.lineIndex}"`);
    attrs.push(`data-slot-index="${slot.slotIndex}"`);
  }else{
    attrs.push(`data-reserve-index="${slot.index}"`);
  }
  return `<div ${attrs.join(" ")}>${renderRosterCard(player,extraClass)}</div>`;
};
const getRosterUnitPlayers=(team,unitKey)=>{
  if(String(unitKey)==="G"){
    return team.getRoster().filter(player=>player.identity?.primaryPosition==="ВРТ");
  }
  const lineIndex=Math.max(1,Math.min(4,Number(unitKey)||1))-1;
  return [...(team.lines?.[lineIndex]?.players||[])];
};
const getRosterUnitSlotDescriptors=(team,unitKey)=>{
  if(String(unitKey)==="G"){
    return (team.reservePlayers||[])
      .map((player,index)=>({player,slot:{kind:"reserve",index}}))
      .filter(item=>item.player.identity?.primaryPosition==="ВРТ");
  }
  const lineIndex=Math.max(1,Math.min(4,Number(unitKey)||1))-1;
  const line=team.lines?.[lineIndex];
  return (line?.players||[]).map((player,slotIndex)=>({player,slot:{kind:"line",lineIndex,slotIndex}}));
};
const renderRosterUnitButtons=activeUnit=>{
  const units=["1","2","3","4","G"];
  const labels={1:"1",2:"2",3:"3",4:"4",G:"В"};
  return `<div class="line-unit-buttons">${units.map(unit=>`<button class="line-unit-btn${String(activeUnit||"1")===unit?" active":""}" data-action="select-roster-unit" data-unit="${unit}">${labels[unit]}</button>`).join("")}</div>`;
};
const renderRosterUnitCards=(team,unitKey)=>{
  const items=getRosterUnitSlotDescriptors(team,unitKey);
  if(!items.length)return `<div class="line-empty">Состав пуст</div>`;
  const forwards=items.filter(item=>["ЛНП","ЦТР","ПНП"].includes(item.player.identity?.primaryPosition));
  const defenders=items.filter(item=>item.player.identity?.primaryPosition==="ЗАЩ");
  const others=items.filter(item=>!forwards.includes(item)&&!defenders.includes(item));
  const ordered=[...forwards,...defenders,...others];
  const top=ordered.slice(0,3).map(item=>renderRosterSlotCard(item.player,item.slot)).join("");
  const bottom=ordered.slice(3).map(item=>renderRosterSlotCard(item.player,item.slot)).join("");
  return `<div class="line-card-layout"><div class="line-card-row line-card-row-top">${top}</div><div class="line-card-row line-card-row-bottom">${bottom}</div></div>`;
};
const renderReserveStrip=players=>{
  if(!players?.length)return `<div class="team-reserve-empty">Запасных нет</div>`;
  return `<div class="team-reserve-strip">${players.map((player,index)=>renderRosterSlotCard(player,{kind:"reserve",index},"hockey-card--reserve")).join("")}</div>`;
};
const renderTeamSidebar=(team,activeTab)=>`<aside class="team-sidebar"><img class="team-sidebar-logo" src="${team.logoUrl}" alt="${team.name}"/><div class="team-sidebar-nav"><button class="team-nav-link${activeTab==="roster"?" active":""}" data-tab="roster">Состав</button><button class="team-nav-link${activeTab==="contracts"?" active":""}" data-tab="contracts">Контракты</button></div></aside>`;
export class Renderer{
  #teamEl;#calEl;#matchEl;#userEl;#contractTab=new ContractTabRenderer();
  constructor(){
    this.#teamEl=document.getElementById("teamPanel");
    this.#calEl=document.getElementById("calendarPanel");
    this.#matchEl=document.getElementById("matchPanel");
    this.#userEl=document.getElementById("userBadge");
  }
  renderUser(user){this.#userEl.textContent=`ID: ${user.id}`}
  renderTeam(team,activeTab,activeRosterUnit="1"){
    const rosterView=activeTab==="roster"
      ? `<div class="line-view-panel">${renderRosterUnitButtons(activeRosterUnit)}${renderRosterUnitCards(team,activeRosterUnit)}</div>`
      : `<div class="muted">Переключитесь на вкладку «Состав»</div>`;
    const sidebar=renderTeamSidebar(team,activeTab);
    const reserve=activeTab==="roster"?`<div class="team-reserve-wrap">${renderReserveStrip(team.reservePlayers||[])}</div>`:"";
    this.#teamEl.innerHTML=`<div class="team-screen">${sidebar}<div class="team-screen-main"><div class="team-screen-header"><div class="team-screen-title">${team.name}</div><div class="muted">${team.city}, ${team.shortName}</div></div>${rosterView}${reserve}</div></div>`;
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
    const previewPlayer=selectedPlayer||draft.availablePlayers[0]||null;
    const totalProgress=draft.totalPicks>0?Math.min(100,Math.round((Math.max(0,draft.pickNumber-1)/draft.totalPicks)*100)):0;
    const draftHeader=`<div class="draft-header-shell"><div class="draft-header-main"><img class="logo" src="${team.logoUrl}" alt="${team.name}"/><div><div class="draft-header-title">Фэнтези драфт • ${team.name}</div><div class="muted">Раунд ${draft.currentRound}/20 • Пик ${draft.currentPickInRound}/${draft.teams.length} • Общий #${draft.pickNumber}/${draft.totalPicks}</div></div></div><div class="draft-header-side"><div class="muted">Текущий пик</div><div class="draft-current-team">${draft.currentTeamName||"—"}</div><div class="draft-progress"><span style="width:${totalProgress}%"></span></div></div></div>`;
    const teamRows=draft.teams.map(item=>{
      const isCurrent=item.id===draft.currentTeamId;
      const isUser=item.id===team.id;
      return `<div class="draft-team-row${isCurrent?" current":""}${isUser?" user":""}"><span class="draft-team-name">${item.name}</span><span class="draft-team-count">${item.pickedCount}/20</span></div>`;
    }).join("");
    const orderPreview=draft.upcomingOrder.map(item=>{
      const pickTeam=draft.teams.find(teamItem=>teamItem.id===item.teamId);
      const isCurrent=item.round===draft.currentRound && item.pick===draft.currentPickInRound;
      return `<div class="draft-order-chip${isCurrent?" active":""}"><div class="draft-order-chip-meta">R${item.round} • #${item.pick}</div><div class="draft-order-chip-name">${pickTeam?.name||item.teamId}</div></div>`;
    }).join("");
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
    const sortControls=`<div class="draft-toolbar-group">${[
      {id:"ovr",label:"OVR"},
      {id:"position",label:"Позиция"},
      {id:"age",label:"Возраст"}
    ].map(item=>`<button class="chip-btn${draft.sortBy===item.id?" active":""}" data-action="draft-sort" data-sort="${item.id}">${item.label}</button>`).join("")}</div>`;
    const filterControls=`<div class="draft-toolbar-group">${[
      {id:"ALL",label:"Все"},
      {id:"ЦТР",label:"ЦТР"},
      {id:"ЛНП",label:"ЛНП"},
      {id:"ПНП",label:"ПНП"},
      {id:"ЗАЩ",label:"ЗАЩ"},
      {id:"ВРТ",label:"ВРТ"}
    ].map(item=>`<button class="chip-btn${draft.filterPosition===item.id?" active":""}" data-action="draft-filter" data-position="${item.id}">${item.label}</button>`).join("")}</div>`;
    const actionBar=`<div class="draft-action"><div class="draft-action-text"><div class="muted">Статус</div><div>${status}</div><div class="muted">Выбрано: ${selectedPlayer?`${selectedPlayer.name} • ${selectedPlayer.identity.primaryPosition} • OVR ${selectedPlayer.ovr}`:"—"}</div></div><div class="draft-action-buttons"><button class="btn secondary" data-action="draft-cancel">Отмена</button><button class="btn" ${confirmDisabled} data-action="draft-confirm-pick">${confirmText}</button></div></div>`;
    const cards=draft.availablePlayers.map(player=>{
      const age=calculateAge(player.identity.birthDate);
      const selectedClass=player.id===draft.selectedPlayerId?" selected":"";
      const nation=getNationBadge(player.identity.nationality);
      return `<button class="draft-list-row${selectedClass}" data-action="draft-select" data-player-id="${player.id}"><div class="draft-list-row-pos">${player.identity.primaryPosition||"—"}</div><img class="player-photo" src="${player.identity.photoUrl||"./player-photo/placeholder.png"}" alt="${player.name}"/><div class="draft-list-row-main"><div class="draft-list-row-name">${player.name}</div><div class="draft-list-row-meta">${nation}</div></div><div class="draft-list-row-stat"><span class="draft-list-row-stat-label">OVR</span><strong>${player.ovr}</strong></div><div class="draft-list-row-stat"><span class="draft-list-row-stat-label">Возраст</span><strong>${age}</strong></div></button>`;
    }).join("");
    const recentPicks=(draft.pickLog||[]).slice(-5).reverse().map(item=>`<div class="draft-recent-row"><span>#${item.pickNumber}</span><span>${item.teamName}</span><span>${item.playerName}</span></div>`).join("")||`<div class="muted">Пиков пока нет</div>`;
    const attrs=previewPlayer?.attributes?.attributesJson||{};
    const attrRows=Object.entries(attrs).filter(([,value])=>typeof value==="number").slice(0,5).map(([key,value])=>{
      const labels={shot:"Бросок",speed:"Скорость",physical:"Силовая",defense:"Оборона",skill:"Техника",reflexes:"Рефлексы",positioning:"Позиция",glove:"Ловушка",blocker:"Блин",reboundControl:"Подбор"};
      const pct=Math.max(0,Math.min(100,Number(value)||0));
      return `<div class="draft-attr-row"><span>${labels[key]||key}</span><div class="draft-attr-bar"><span style="width:${pct}%"></span></div><strong>${value}</strong></div>`;
    }).join("");
    const previewAge=previewPlayer?calculateAge(previewPlayer.identity.birthDate):null;
    const previewCard=previewPlayer?`<div class="draft-preview-head"><img class="draft-preview-photo" src="${previewPlayer.identity.photoUrl||"./player-photo/placeholder.png"}" alt="${previewPlayer.name}"/><div class="draft-preview-title"><div class="draft-preview-ovr">${previewPlayer.ovr}</div><div class="draft-preview-name">${previewPlayer.name}</div><div class="draft-preview-meta">${previewPlayer.identity.primaryPosition} • ${previewAge} лет • ${getNationBadge(previewPlayer.identity.nationality)}</div></div></div><div class="draft-preview-attrs">${attrRows||'<div class="muted">Атрибуты недоступны</div>'}</div>`:`<div class="muted">Игрок не выбран</div>`;
    this.#teamEl.innerHTML=`<div class="draft-screen"><div class="draft-top">${draftHeader}<div class="draft-order-strip">${orderPreview}</div></div><div class="draft-layout"><section class="draft-left"><div class="draft-card"><div class="draft-card-head"><h2>Доступные игроки</h2><div class="muted">${draft.availablePlayers.length} в пуле</div></div><div class="draft-toolbar"><div><div class="muted">Сортировка</div>${sortControls}</div><div><div class="muted">Фильтр по позиции</div>${filterControls}</div></div>${actionBar}<div class="draft-list">${cards||"<div class=\"muted\">Нет игроков</div>"}</div></div></section><aside class="draft-right"><div class="draft-card"><div class="draft-card-head"><h2>Просмотр игрока</h2><div class="muted">MVP поля: имя • позиция • OVR • возраст • нация</div></div>${previewCard}</div><div class="draft-card"><div class="draft-card-head"><h2>Ваш драфт-борд</h2><div class="muted">${team.name}</div></div>${renderDraftNeedsGrid(userRoster)}<div class="draft-panel">${rosterPanel}</div></div><div class="draft-card"><div class="draft-card-head"><h2>Команды</h2><div class="muted">20 раундов • змейка</div></div><div class="draft-team-list">${teamRows}</div></div><div class="draft-card"><div class="draft-card-head"><h2>Последние пики</h2><div class="muted">Live log</div></div><div class="draft-recent-list">${recentPicks}</div></div></aside></div></div>`;
    this.#matchEl.innerHTML="";
  }
  renderCalendar(day,info,isLocked){
    const text=isLocked?"Сначала выберите команду":(info?.match?`${info.match.home.name} — ${info.match.away.name}`:"День отдыха");
    this.#calEl.innerHTML=`<h2>Календарь • День ${day}</h2><div class="row"><div>${text}</div><button id="playBtn" class="btn" ${isLocked?"disabled":""}>${isLocked?"Выбрать команду":"Дальше"}</button></div>`;
  }
  renderResetButton(){this.#calEl.insertAdjacentHTML("beforeend","<div class=\"row reset-row\"><button id=\"resetBtn\" class=\"btn secondary\">Новая игра</button></div>")}
  renderMatchSimulationPopup(playback){
    if(!playback)return;
    const fmtClock=seconds=>{
      const safe=Math.max(0,Number(seconds)||0);
      const period=Math.min(3,Math.floor(safe/1200)+1);
      const inPeriod=safe%1200;
      const down=1200-inPeriod;
      const mm=String(Math.floor(down/60)).padStart(2,"0");
      const ss=String(down%60).padStart(2,"0");
      return {period,label:`${mm}:${ss}`};
    };
    const clock=fmtClock(playback.currentSecond);
    const score=playback.visibleEvents.reduce((acc,event)=>{
      if(event.type!=="goal")return acc;
      if(event.teamId===playback.match.home.id)acc.home++;
      if(event.teamId===playback.match.away.id)acc.away++;
      return acc;
    },{home:0,away:0});
    const timeline=(playback.visibleEvents||[]).map(event=>{
      if(event.type==="goal"){
        const assists=(event.assists||[]).length?` • Передачи: ${(event.assists||[]).join(", ")}`:"";
        return `<div class="sim-event sim-event-goal"><div class="sim-event-time">P${event.period} ${event.periodClock}</div><div class="sim-event-body"><span class="sim-event-tag">ГОЛ</span><span>${event.team}: ${event.scorer?.name||event.scorer}${assists}</span></div></div>`;
      }
      return `<div class="sim-event sim-event-penalty"><div class="sim-event-time">P${event.period} ${event.periodClock}</div><div class="sim-event-body"><span class="sim-event-tag">УДАЛ.</span><span>${event.team}: ${event.player?.name||event.player} (${event.penaltyMinutes||2} мин)</span></div></div>`;
    }).join("");
    const homeShots=playback.match.summary?.home?.shots??"-";
    const awayShots=playback.match.summary?.away?.shots??"-";
    const homePens=playback.match.summary?.home?.penalties??0;
    const awayPens=playback.match.summary?.away?.penalties??0;
    this.#teamEl.insertAdjacentHTML("beforeend",`<div class="modal sim-modal"><div class="sim-modal-card"><div class="sim-scoreboard"><div class="sim-team sim-team-home"><img class="sim-team-logo" src="${playback.match.home.logoUrl}" alt="${playback.match.home.name}"/><div class="sim-team-name">${playback.match.home.name}</div><div class="sim-team-score">${score.home}</div></div><div class="sim-center"><div class="sim-period">Период ${clock.period}/3</div><div class="sim-clock">${clock.label}</div><div class="sim-progress"><span style="width:${Math.min(100,Math.round((playback.currentSecond/3600)*100))}%"></span></div><div class="sim-center-actions">${playback.isFinished?`<button class="btn" data-action="sim-close">Закрыть</button>`:`<button class="btn secondary" data-action="sim-skip">Пропустить симуляцию</button>`}</div></div><div class="sim-team sim-team-away"><img class="sim-team-logo" src="${playback.match.away.logoUrl}" alt="${playback.match.away.name}"/><div class="sim-team-name">${playback.match.away.name}</div><div class="sim-team-score">${score.away}</div></div></div><div class="sim-stats-row"><div>Броски: <strong>${homeShots}</strong></div><div>Удаления: <strong>${homePens}</strong></div><div>Броски: <strong>${awayShots}</strong></div><div>Удаления: <strong>${awayPens}</strong></div></div><div class="sim-timeline">${timeline||'<div class="muted">Симуляция идет...</div>'}</div></div></div>`);
  }
  renderMatch(match,stats){
    if(match===null){this.#matchEl.innerHTML=`<h2>Матч</h2><div class="list">Сегодня отдых</div>`;return;}
    if(!match){this.#matchEl.innerHTML=`<h2>Матч</h2><div class="list">Сезон завершён</div>`;return;}
    const events=(match.events||[]).map(event=>{
      if(event.type==="penalty")return `<div class="event">P${event.period} ${event.periodClock} ${event.team}: удаление (${event.player?.name||event.player})</div>`;
      const scorer=event.scorer?.name||event.scorer;
      const assists=(event.assists||[]).length?event.assists.join(", "):(event.assist||"");
      return `<div class="event">P${event.period||1} ${event.periodClock||`${event.minute}'`}: ${event.team} — ${scorer}${assists?` (+${assists})`:""}</div>`;
    }).join("");
    const top=stats.slice(0,4).map(item=>`${item.name} ${item.goals}+${item.assists}`).join("<br/>");
    this.#matchEl.innerHTML=`<h2>Матч</h2><div class="list">${match.home.name} ${match.homeGoals}:${match.awayGoals} ${match.away.name}</div><div class="list">${events||"Без голов"}</div><div class="list">Лидеры:<br/>${top||"Нет"}</div>`;
  }
  #renderTabs(activeTab){
    const rosterClass=activeTab==="roster"?"tab active":"tab";
    const contractClass=activeTab==="contracts"?"tab active":"tab";
    return `<div class="tab-row"><button class="${rosterClass}" data-tab="roster">Состав</button><button class="${contractClass}" data-tab="contracts">Контракты</button></div>`;
  }
}

