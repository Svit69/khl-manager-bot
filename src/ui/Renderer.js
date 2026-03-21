import { ContractTabRenderer } from "./ContractTabRenderer.js";
import { FreeAgentTabRenderer } from "./FreeAgentTabRenderer.js";
import { TradeTabRenderer } from "./TradeTabRenderer.js";
import { calculateAge } from "../contracts/SeasonUtils.js";
import { adjustedOvrForPosition } from "../utils/positionFit.js";
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
    : `<span class="${className} nation-flag-fallback" aria-hidden="true">БЕЗ ФЛАГА</span>`;
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
  return renderNationFlagIcon(code,`Флаг — ${code||"N/A"}`,"nation-flag-card");
};
const renderRosterCard=(player,extraClass="",options={})=>{
  const photo=player.identity.photoUrl||"./player-photo/placeholder.png";
  const surname=getSurname(player).toUpperCase();
  const age=calculateAge(player.identity.birthDate);
  const nationCode=getNationCode(player.identity.nationality);
  const nationFlag=getNationFlag(player.identity.nationality);
  const displayOvr=options.displayOvr??player.ovr;
  const displayPosition=options.displayPosition||player.identity.primaryPosition;
  const penalizedClass=options.isPenalized?" hockey-card--penalized":"";
  return `<article class="hockey-card${extraClass?` ${extraClass}`:""}${penalizedClass}"><div class="hockey-card-layers"><img class="hockey-card-bg" src="./card/card_background.svg" alt="" aria-hidden="true"/><img class="hockey-card-photo" src="${photo}" alt="${player.name}"/><img class="hockey-card-front" src="./card/card_front.svg" alt="" aria-hidden="true"/></div><div class="hockey-card-top"><span class="hockey-card-ovr-wrap"><span class="hockey-card-ovr">${displayOvr}</span></span><span class="hockey-card-pos">${displayPosition}</span></div><div class="hockey-card-name-band">${surname}</div><div class="hockey-card-meta-row"><span>${age} ЛЕТ</span><span>${nationFlag} ${nationCode}</span></div></article>`;
};
const renderEmptyRosterSlot=slot=>{
  const attrs=[
    `class="roster-slot-card roster-slot-card-empty"`,
    `data-empty-slot="1"`,
    `data-roster-kind="line"`,
    `data-line-index="${slot.lineIndex}"`,
    `data-slot-index="${slot.slotIndex}"`,
    `data-slot-position="${slot.position}"`
  ];
  return `<div ${attrs.join(" ")}><div class="empty-roster-slot"><span class="empty-roster-slot-icon">+</span><span class="empty-roster-slot-pos">${slot.position}</span></div></div>`;
};
const renderRosterSlotCard=(player,slot,extraClass="",selected=false)=>{
  const attrs=[
    `class="roster-slot-card${selected?" is-selected":""}"`,
    `data-roster-slot="1"`,
    `data-roster-kind="${slot.kind}"`,
    `data-player-id="${player.id}"`
  ];
  if(slot.kind==="line"){
    attrs.push(`draggable="true"`);
    attrs.push(`data-line-index="${slot.lineIndex}"`);
    attrs.push(`data-slot-index="${slot.slotIndex}"`);
    attrs.push(`data-action="select-roster-card"`);
    const slotPosition=slot.position||player.identity?.primaryPosition;
    const displayOvr=adjustedOvrForPosition(player,slotPosition);
    const isPenalized=displayOvr<player.ovr;
    return `<div ${attrs.join(" ")}>${renderRosterCard(player,extraClass,{
      displayPosition:slotPosition,
      displayOvr,
      isPenalized
    })}<button class="roster-slot-action" data-action="move-to-reserve" data-line-index="${slot.lineIndex}" data-slot-index="${slot.slotIndex}">В запас</button></div>`;
  }else{
    attrs.push(`draggable="true"`);
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
  return (line?.positions||[]).map((position,slotIndex)=>{
    const player=line?.players?.[slotIndex]||null;
    return {
      player,
      slot:{kind:"line",lineIndex,slotIndex,position}
    };
  });
};
const renderRosterUnitButtons=activeUnit=>{
  const units=["1","2","3","4","G"];
  const labels={1:"1",2:"2",3:"3",4:"4",G:"В"};
  return `<div class="line-unit-buttons">${units.map(unit=>`<button class="line-unit-btn${String(activeUnit||"1")===unit?" active":""}" data-action="select-roster-unit" data-unit="${unit}">${labels[unit]}</button>`).join("")}</div>`;
};
const renderRosterActionBar=(selectedItem,unitKey)=>{
  if(!selectedItem?.player || String(unitKey)==="G")return "";
  const slotPosition=selectedItem.slot.position||selectedItem.player.identity?.primaryPosition;
  const displayOvr=adjustedOvrForPosition(selectedItem.player,slotPosition);
  return `<div class="roster-action-bar"><div class="roster-action-bar-meta"><span class="roster-action-bar-label">Выбран игрок</span><strong>${selectedItem.player.name}</strong><span>${slotPosition} • OVR ${displayOvr}</span></div><div class="roster-action-bar-actions"><button class="btn secondary" data-action="move-to-reserve" data-line-index="${selectedItem.slot.lineIndex}" data-slot-index="${selectedItem.slot.slotIndex}">Убрать в запас</button></div></div>`;
};
const renderRosterUnitCards=(team,unitKey,selectedSlot=null)=>{
  const items=getRosterUnitSlotDescriptors(team,unitKey);
  if(!items.length)return `<div class="line-empty">Состав пуст</div>`;
  const forwards=items.filter(item=>["ЛНП","ЦТР","ПНП"].includes(item.slot.position));
  const defenders=items.filter(item=>item.slot.position==="ЗАЩ");
  const others=items.filter(item=>!forwards.includes(item)&&!defenders.includes(item));
  const ordered=[...forwards,...defenders,...others];
  const selectedItem=ordered.find(item=>item.slot.kind==="line"&&selectedSlot&&item.slot.lineIndex===selectedSlot.lineIndex&&item.slot.slotIndex===selectedSlot.slotIndex) || null;
  const renderItem=item=>item.player
    ? renderRosterSlotCard(item.player,item.slot,"",Boolean(selectedSlot&&item.slot.lineIndex===selectedSlot.lineIndex&&item.slot.slotIndex===selectedSlot.slotIndex))
    : renderEmptyRosterSlot(item.slot);
  const top=ordered.slice(0,3).map(renderItem).join("");
  const bottom=ordered.slice(3).map(renderItem).join("");
  return `<div class="line-card-layout"><div class="line-card-row line-card-row-top">${top}</div><div class="line-card-row line-card-row-bottom">${bottom}</div>${renderRosterActionBar(selectedItem,unitKey)}</div>`;
};
const renderReserveStrip=players=>{
  if(!players?.length)return `<div class="team-reserve-empty">Запасных нет</div>`;
  return `<div class="team-reserve-strip">${players.map((player,index)=>renderRosterSlotCard(player,{kind:"reserve",index},"hockey-card--reserve")).join("")}</div>`;
};
const renderTeamSidebar=(team,activeTab)=>`<aside class="team-sidebar"><img class="team-sidebar-logo" src="${team.logoUrl}" alt="${team.name}"/><div class="team-sidebar-nav"><button class="team-nav-link${activeTab==="roster"?" active":""}" data-tab="roster">Состав</button><button class="team-nav-link${activeTab==="contracts"?" active":""}" data-tab="contracts">Контракты</button><button class="team-nav-link${activeTab==="freeAgents"?" active":""}" data-tab="freeAgents">Свободные агенты</button><button class="team-nav-link${activeTab==="trades"?" active":""}" data-tab="trades">Обмены</button></div></aside>`;
export class Renderer{
  #teamEl;#calEl;#matchEl;#userEl;#contractTab=new ContractTabRenderer();#freeAgentTab=new FreeAgentTabRenderer();#tradeTab=new TradeTabRenderer();
  constructor(){
    this.#teamEl=document.getElementById("teamPanel");
    this.#calEl=document.getElementById("calendarPanel");
    this.#matchEl=document.getElementById("matchPanel");
    this.#userEl=document.getElementById("userBadge");
  }
  renderUser(user){this.#userEl.textContent=`ID: ${user.id}`}
  renderTeam(team,activeTab,activeRosterUnit="1",selectedRosterSlot=null){
    const rosterView=activeTab==="roster"
      ? `<div class="team-club-shell"><div class="team-roster-stage"><div class="line-view-panel">${renderRosterUnitButtons(activeRosterUnit)}${renderRosterUnitCards(team,activeRosterUnit,selectedRosterSlot)}</div></div><div class="team-reserve-wrap">${renderReserveStrip(team.reservePlayers||[])}</div></div>`
      : `<div class="muted">Переключитесь на вкладку «Состав»</div>`;
    const sidebar=renderTeamSidebar(team,activeTab);
    this.#teamEl.innerHTML=`<div class="team-screen">${sidebar}<div class="team-screen-main"><div class="team-screen-header"><div><div class="team-screen-title">${team.name}</div><div class="team-screen-subtitle">${team.city}, ${team.shortName}</div></div><div class="team-screen-status"><span class="team-screen-status-pill">Club Hub</span><span class="team-screen-status-pill team-screen-status-pill-muted">${activeTab==="roster"?"Основной состав":"Управление клубом"}</span></div></div>${rosterView}<div id="teamTabContent"></div></div></div>`;
  }
  renderTeamSelection(teams,activeTeamId,selectedTeamId=null){
    const popularShortNames=new Set(["AVT","AKB","CSK","AVG"]);
    const popularTeams=teams.filter(team=>popularShortNames.has(team.shortName));
    const otherTeams=teams.filter(team=>!popularShortNames.has(team.shortName));
    const selectedTeam=teams.find(team=>team.id===selectedTeamId)||null;
    const renderCard=team=>`<button class="team-select-card${selectedTeamId===team.id?" active":""}" data-team-id="${team.id}">
      <div class="team-select-card-glow"></div>
      <div class="team-select-card-body">
        <img src="${team.logoUrl}" alt="${team.name}"/>
        <div class="team-select-card-name">${team.name}</div>
        <div class="team-select-card-subtitle">${team.city}</div>
      </div>
    </button>`;
    const renderSection=(title,cards)=>cards.length?`<section class="team-select-section"><h3>${title}</h3><div class="team-select-grid">${cards.map(renderCard).join("")}</div></section>`:"";
    const actionDock=selectedTeam?`<div class="team-select-dock">
      <div class="team-select-dock-meta">
        <span class="team-select-dock-label">Выбран клуб</span>
        <strong>${selectedTeam.name}</strong>
      </div>
      <div class="team-select-dock-actions">
        <button class="btn secondary team-select-dock-btn team-select-dock-btn-ghost" data-action="start-fantasy-draft">Фэнтези драфт</button>
        <button class="btn team-select-dock-btn" data-action="confirm-team">Выбрать ${selectedTeam.name}</button>
      </div>
    </div>`:`<div class="team-select-dock team-select-dock-empty"><div class="team-select-dock-meta"><span class="team-select-dock-label">Новая игра</span><strong>Выберите клуб, чтобы продолжить</strong></div></div>`;
    this.#teamEl.innerHTML=`<section class="team-select-screen">
      <div class="team-select-hero">
        <span class="team-select-badge">Новый сезон</span>
        <div class="team-select-mark">WNTR</div>
        <h2>Выберите свой клуб</h2>
        <p>Начните обычную карьеру или сразу перейдите в режим фэнтези-драфта. Выбранная команда станет вашей точкой входа в новое сохранение.</p>
      </div>
      <div class="team-select-content">
        ${renderSection("Популярные клубы",popularTeams)}
        ${renderSection("Все клубы",otherTeams)}
      </div>
      ${actionDock}
    </section>`;
  }
  renderMyTeamRoster(team){
    const container=document.getElementById("teamTabContent");
    if(container)container.innerHTML="";
    else{
      const cards=team.getRoster().map(player=>renderRosterCard(player)).join("");
      this.#matchEl.innerHTML=`<h2>Состав</h2><div class="roster-grid roster-grid-cards">${cards}</div>`;
    }
  }
  renderContracts(rows,negotiation){
    const container=document.getElementById("teamTabContent");
    if(container){container.innerHTML=this.#contractTab.render(rows,negotiation);return;}
    this.#matchEl.innerHTML=this.#contractTab.render(rows,negotiation);
  }
  renderTrades(view){
    const container=document.getElementById("teamTabContent");
    if(container){container.innerHTML=this.#tradeTab.render(view);return;}
    this.#matchEl.innerHTML=this.#tradeTab.render(view);
  }
  renderFreeAgents(rows,negotiation){
    const container=document.getElementById("teamTabContent");
    if(container){container.innerHTML=this.#freeAgentTab.render(rows,negotiation);return;}
    this.#matchEl.innerHTML=this.#freeAgentTab.render(rows,negotiation);
  }
  renderConfirmSelection(team){
    this.renderTeamSelection([team],null,team.id);
  }
  renderFantasyDraftIntro(team){
    const infoPills=[
      {label:"Режим",value:"20 раундов"},
      {label:"Порядок",value:"Snake draft"},
      {label:"После",value:"Переход к составу"}
    ];
    const featureTags=[
      {left:"ЛУЧШИЙ ПИК",center:"Берите лучших игроков по OVR",right:"OVR"},
      {left:"БАЛАНС",center:"Следите за позициями и возрастом",right:"LIVE"},
      {left:"ИИ ДРАФТ",center:"Команды адаптируются к ходу драфта",right:"SMART"}
    ];
    const pills=infoPills.map(item=>`<div class="draft-intro-pill"><span>${item.label}</span><strong>${item.value}</strong></div>`).join("");
    const tags=featureTags.map(item=>`<div class="draft-intro-tag-row"><span class="draft-intro-tag draft-intro-tag-dark">${item.left}</span><span class="draft-intro-tag draft-intro-tag-light">${item.center}</span><span class="draft-intro-tag draft-intro-tag-accent">${item.right}</span></div>`).join("");
    this.#teamEl.innerHTML=`<section class="draft-intro-screen">
      <div class="draft-intro-rail draft-intro-rail-top"><span>KHL MANAGER</span><span>FANTASY DRAFT</span><span>BUILD YOUR TEAM</span><span>KHL MANAGER</span><span>FANTASY DRAFT</span><span>BUILD YOUR TEAM</span></div>
      <div class="draft-intro-main">
        <div class="draft-intro-hero">
          <div class="draft-intro-kicker">Fantasy Draft</div>
          <h1>Draft your team</h1>
          <p class="draft-intro-lead">Вы выбрали <strong>${team.name}</strong>. Сейчас вся лига по очереди будет забирать игроков из общей базы. Ваша задача — собрать сильный и сбалансированный состав за 20 пиков.</p>
          <div class="draft-intro-pills">${pills}</div>
        </div>
        <div class="draft-intro-showcase">
          <div class="draft-intro-card-stage">
            <div class="draft-intro-card-frame">
              <div class="draft-intro-card-badge">
                <img src="${team.logoUrl}" alt="${team.name}"/>
                <span>${team.shortName}</span>
              </div>
              ${renderRosterCard((team.getRoster?.()||[])[0]||{
                name:team.name,
                ovr:82,
                identity:{lastName:team.shortName,displayName:team.name,birthDate:"1997-01-01",nationality:team.country,primaryPosition:"ЦТР",photoUrl:"./player-photo/placeholder.png"}
              },"draft-intro-card")}
            </div>
            <div class="draft-intro-card-caption">
              <strong>${team.name}</strong>
              <span>${team.city} • старт с пустого ростера</span>
            </div>
          </div>
          <div class="draft-intro-feature-stack">${tags}</div>
            <div class="draft-intro-actions">
              <button class="btn draft-intro-primary" data-action="draft-intro-start">Draft your team</button>
              <button class="btn secondary draft-intro-secondary" data-action="draft-intro-back">Назад</button>
          </div>
        </div>
      </div>
      <div class="draft-intro-rail draft-intro-rail-bottom"><span>OWN THE DRAFT</span><span>YOUR KHL ERA</span><span>OWN THE DRAFT</span><span>YOUR KHL ERA</span><span>OWN THE DRAFT</span><span>YOUR KHL ERA</span></div>
    </section>`;
    this.#matchEl.innerHTML="";
  }
  renderFantasyDraft(draft,team){
    const selectedPlayer=draft.availablePlayers.find(player=>player.id===draft.selectedPlayerId)||null;
    const previewPlayer=selectedPlayer||draft.availablePlayers[0]||null;
    const totalProgress=draft.totalPicks>0?Math.min(100,Math.round((Math.max(0,draft.pickNumber-1)/draft.totalPicks)*100)):0;
    const draftHeader=`<div class="draft-header-shell"><div class="draft-header-main"><img class="logo" src="${team.logoUrl}" alt="${team.name}"/><div><div class="draft-header-title">Фэнтези драфт — ${team.name}</div><div class="muted">Раунд ${draft.currentRound}/20 • Пик ${draft.currentPickInRound}/${draft.teams.length} • Общий #${draft.pickNumber}/${draft.totalPicks}</div></div></div><div class="draft-header-side"><div class="muted">Текущий пик</div><div class="draft-current-team">${draft.currentTeamName||"—"}</div><div class="draft-progress"><span style="width:${totalProgress}%"></span></div></div></div>`;
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
    const confirmDisabled=!draft.isUserTurn||!selectedPlayer?"disabled":"";
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
    this.#teamEl.innerHTML=`<div class="draft-screen"><div class="draft-top">${draftHeader}<div class="draft-order-strip">${orderPreview}</div></div><div class="draft-layout"><section class="draft-left"><div class="draft-card"><div class="draft-card-head"><h2>Доступные игроки</h2><div class="muted">${draft.availablePlayers.length} в пуле</div></div><div class="draft-toolbar"><div><div class="muted">Сортировка</div>${sortControls}</div><div><div class="muted">Фильтр по позиции</div>${filterControls}</div></div>${actionBar}<div class="draft-list">${cards||"<div class=\"muted\">Нет игроков</div>"}</div></div></section><aside class="draft-right"><div class="draft-card"><div class="draft-card-head"><h2>Просмотр игрока</h2><div class="muted">Имя • позиция • OVR • возраст • нация</div></div>${previewCard}</div><div class="draft-card"><div class="draft-card-head"><h2>Ваш драфт-борд</h2><div class="muted">${team.name}</div></div>${renderDraftNeedsGrid(userRoster)}<div class="draft-panel">${rosterPanel}</div></div><div class="draft-card"><div class="draft-card-head"><h2>Команды</h2><div class="muted">20 раундов • змейка</div></div><div class="draft-team-list">${teamRows}</div></div><div class="draft-card"><div class="draft-card-head"><h2>Последние пики</h2><div class="muted">Live log</div></div><div class="draft-recent-list">${recentPicks}</div></div></aside></div></div>`;
    this.#matchEl.innerHTML="";
  }  renderCalendar(day,info,isLocked,panelData={}){
    const text=isLocked?"Сначала выберите команду":(info?.match?`${info.match.home.name} — ${info.match.away.name}`:"День отдыха");
    const activeTab=panelData?.tab||"standings";
    const standings=(panelData?.standings||[]).map((row,index)=>`<div class="calendar-table-row"><span>${index+1}</span><span>${row.shortName||row.name}</span><span>${row.gp||0}</span><span>${row.w||0}</span><span>${row.otl||0}</span><span>${row.l||0}</span><span>${row.pts||0}</span></div>`).join("")||`<div class="muted">Нет данных</div>`;
    const scorers=(panelData?.scorers||[]).map((row,index)=>`<div class="calendar-scorer-row"><span>${index+1}</span><span>${row.name}</span><span>${row.team||"—"}</span><span>${row.points||((row.goals||0)+(row.assists||0))}</span><span>${row.goals||0}</span><span>${row.assists||0}</span></div>`).join("")||`<div class="muted">Нет данных</div>`;
    const scheduleRows=(panelData?.schedule||[]).map(row=>{
      if(row.isRestDay)return `<div class="calendar-schedule-row${row.isCurrent?" current":""}"><span class="day">Д${row.day}</span><span class="teams">${row.isCurrent?"День отдыха (текущий)":"День отдыха"}</span><span class="res">${row.isPlayed?"✓":"—"}</span></div>`;
      const result=row.result?`${row.result.homeGoals}:${row.result.awayGoals}${row.result.wentToOvertime?" ОТ":""}`:(row.isPlayed?"—":"vs");
      return `<div class="calendar-schedule-row${row.isCurrent?" current":""}${row.isMyMatch?" mine":""}"><span class="day">Д${row.day}</span><span class="teams">${row.home?.shortName||row.home?.name} — ${row.away?.shortName||row.away?.name}</span><span class="res">${result}</span></div>`;
    }).join("")||`<div class="muted">Нет матчей</div>`;
    const tabButtons=`<div class="calendar-tabs"><button class="calendar-tab-btn${activeTab==="standings"?" active":""}" data-action="calendar-tab" data-value="standings">Таблица</button><button class="calendar-tab-btn${activeTab==="scorers"?" active":""}" data-action="calendar-tab" data-value="scorers">Бомбардиры</button><button class="calendar-tab-btn${activeTab==="schedule"?" active":""}" data-action="calendar-tab" data-value="schedule">Расписание</button></div>`;
    const tableHeader=activeTab==="standings"
      ? `<div class="calendar-table-header"><span>#</span><span>Команда</span><span>И</span><span>В</span><span>ПО</span><span>П</span><span>О</span></div>`
      : activeTab==="scorers"
        ? `<div class="calendar-scorer-header"><span>#</span><span>Игрок</span><span>Команда</span><span>О</span><span>Г</span><span>П</span></div>`
        : `<div class="calendar-schedule-header"><span>День</span><span>Матч</span><span>Счет</span></div>`;
    const tableBody=activeTab==="standings"?standings:(activeTab==="scorers"?scorers:scheduleRows);
    this.#calEl.innerHTML=`<h2>Календарь • День ${day}</h2><div class="row"><div>${text}</div><button id="playBtn" class="btn" ${isLocked?"disabled":""}>${isLocked?"Выбрать команду":"Дальше"}</button></div>${tabButtons}<div class="calendar-panel-list">${tableHeader}<div class="calendar-panel-scroll">${tableBody}</div></div>`;
  }
  renderResetButton(){this.#calEl.insertAdjacentHTML("beforeend","<div class=\"row reset-row\"><button id=\"resetBtn\" class=\"btn secondary\">Новая игра</button></div>")}
  renderMatchSimulationPopup(playback){
    if(!playback)return;
    const formatIceTime=seconds=>{
      const safe=Math.max(0,Number(seconds)||0);
      const mm=String(Math.floor(safe/60)).padStart(2,"0");
      const ss=String(safe%60).padStart(2,"0");
      return `${mm}:${ss}`;
    };
    const buildMatchStatsRows=(teamSummary,team)=>((teamSummary?.playerStats||[])
      .map(stat=>({
        ...stat,
        points:(stat.goals||0)+(stat.assists||0),
        team
      }))
      .sort((a,b)=>
        (b.points-a.points)||
        ((b.goals||0)-(a.goals||0))||
        ((b.assists||0)-(a.assists||0))||
        ((b.shots||0)-(a.shots||0))||
        String(a.playerName||"").localeCompare(String(b.playerName||""),"ru")
      ));
    const fmtClock=seconds=>{
      const safe=Math.max(0,Number(seconds)||0);
      const isOt=safe>=3600;
      const period=isOt?4:Math.min(3,Math.floor(safe/1200)+1);
      const periodLen=isOt?300:1200;
      const inPeriod=isOt?(safe-3600):(safe%1200);
      const down=Math.max(0,periodLen-inPeriod);
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
    const visibleEvents=playback.visibleEvents||[];
    const duration=playback.match.summary?.durationSeconds||3600;
    const progressRatio=duration>0?Math.min(1,playback.currentSecond/duration):0;
    const visibleHomePens=visibleEvents.filter(event=>event.type==="penalty"&&event.teamId===playback.match.home.id).length;
    const visibleAwayPens=visibleEvents.filter(event=>event.type==="penalty"&&event.teamId===playback.match.away.id).length;
    const finalHomeShots=Number(playback.match.summary?.home?.shots)||0;
    const finalAwayShots=Number(playback.match.summary?.away?.shots)||0;
    const homeVisibleGoals=visibleEvents.filter(event=>event.type==="goal"&&event.teamId===playback.match.home.id).length;
    const awayVisibleGoals=visibleEvents.filter(event=>event.type==="goal"&&event.teamId===playback.match.away.id).length;
    const homeShots=Math.min(finalHomeShots,Math.max(homeVisibleGoals,Math.round(finalHomeShots*Math.pow(progressRatio,0.92))));
    const awayShots=Math.min(finalAwayShots,Math.max(awayVisibleGoals,Math.round(finalAwayShots*Math.pow(progressRatio,0.92))));
    const statsRows=[
      ...buildMatchStatsRows(playback.match.summary?.home,playback.match.home),
      ...buildMatchStatsRows(playback.match.summary?.away,playback.match.away)
    ];
    const timeline=(visibleEvents).map(event=>{
      const isHome=event.teamId===playback.match.home.id;
      let text="";
      let tagClass="sim-log-chip";
      if(event.type==="goal"){
        const scorer=event.scorer?.name||event.scorer;
        const assists=(event.assists||[]).length?` (${(event.assists||[]).join(", ")})`:"";
        const strength=event.strength?` [${event.strength}]`:"";
        text=`${scorer}${assists}${strength}`;
        tagClass+=" goal";
      }else{
        text=`Удаление: ${event.player?.name||event.player} (${event.penaltyMinutes||2} мин)`;
        tagClass+=" penalty";
      }
      return `<div class="sim-log-row"><div class="sim-log-side home">${isHome?`<span class="${tagClass}">${event.type==="goal"?"ГОЛ":"УДАЛ."}</span><span>${text}</span>`:""}</div><div class="sim-log-time">P${event.period} ${event.periodClock}</div><div class="sim-log-side away">${!isHome?`<span>${text}</span><span class="${tagClass}">${event.type==="goal"?"ГОЛ":"УДАЛ."}</span>`:""}</div></div>`;
    }).join("");
    const statsTable=`<div class="sim-stats-table"><div class="sim-stats-header"><span>Команда</span><span>Игрок</span><span>Г</span><span>П</span><span>О</span><span>Время</span><span>Бр</span><span>ШМ</span></div>${statsRows.map(row=>`<div class="sim-stats-row"><span class="sim-stats-team">${row.team?.logoUrl?`<img class="sim-stats-team-logo" src="${row.team.logoUrl}" alt="${row.team.name}"/>`:""}<span>${row.team?.shortName||row.team?.name||"—"}</span></span><span class="sim-stats-player" title="${row.playerName||"Игрок"}">${row.playerName||"Игрок"}</span><span>${row.goals||0}</span><span>${row.assists||0}</span><span>${row.points||0}</span><span>${formatIceTime(row.totalIceTime)}</span><span>${row.shots||0}</span><span>${row.penaltyMinutes||0}</span></div>`).join("")||`<div class="muted">Нет статистики</div>`}</div>`;
    const periodsLabel=clock.period===4?"ОТ 3x3":"Период";
    const contentLabel=playback.view==="stats"?"Статистика матча":"События матча";
    const contentBody=playback.view==="stats"
      ? statsTable
      : `<div class="sim-timeline sim-timeline-eafc">${timeline||'<div class="muted">Симуляция идет...</div>'}</div>`;
    const controls=playback.isFinished
      ? `<button class="btn secondary${playback.view==="events"?" active":""}" data-action="sim-view-events">События</button><button class="btn secondary${playback.view==="stats"?" active":""}" data-action="sim-view-stats">Статистика матча</button><button class="btn" data-action="sim-close">Закрыть</button>`
      : `<button class="btn secondary" data-action="sim-skip">Пропустить симуляцию</button>`;
    this.#teamEl.insertAdjacentHTML("beforeend",`<div class="modal sim-modal"><div class="sim-modal-card sim-eafc"><div class="sim-top-head"><div class="sim-top-team"><span class="sim-top-team-name">${playback.match.home.name}</span><img class="sim-team-logo" src="${playback.match.home.logoUrl}" alt="${playback.match.home.name}"/></div><div class="sim-top-center"><div class="sim-top-score">${score.home}:${score.away}</div><div class="sim-period">${periodsLabel}${clock.period===4?"":" • "+clock.period+"/3"}</div><div class="sim-clock">${clock.label}</div></div><div class="sim-top-team sim-top-team-right"><img class="sim-team-logo" src="${playback.match.away.logoUrl}" alt="${playback.match.away.name}"/><span class="sim-top-team-name">${playback.match.away.name}</span></div></div><div class="sim-stage"><aside class="sim-side-panel"><div class="sim-side-stat"><div class="sim-side-label">Броски</div><div class="sim-side-value">${homeShots}</div></div><div class="sim-side-stat"><div class="sim-side-label">Удаления</div><div class="sim-side-value">${visibleHomePens}</div></div><div class="sim-side-stat"><div class="sim-side-label">Голы</div><div class="sim-side-value">${score.home}</div></div></aside><section class="sim-board"><div class="sim-board-overlay"></div><div class="sim-progress sim-progress-eafc"><span style="width:${Math.min(100,Math.round(progressRatio*100))}%"></span></div><div class="sim-timeline-header"><span>${contentLabel}</span><span>${playback.match.summary?.wentToOvertime?"С ОТ":"Основное время"}</span></div>${contentBody}<div class="sim-center-actions sim-center-actions-eafc">${controls}</div></section><aside class="sim-side-panel sim-side-panel-right"><div class="sim-side-stat"><div class="sim-side-label">Броски</div><div class="sim-side-value">${awayShots}</div></div><div class="sim-side-stat"><div class="sim-side-label">Удаления</div><div class="sim-side-value">${visibleAwayPens}</div></div><div class="sim-side-stat"><div class="sim-side-label">Голы</div><div class="sim-side-value">${score.away}</div></div></aside></div></div></div>`);
  }
  renderMatch(match,stats){
    if(match===null){this.#matchEl.innerHTML=`<h2>Матч</h2><div class="list">Сегодня отдых</div>`;return;}
    if(!match){this.#matchEl.innerHTML=`<h2>Матч</h2><div class="list">Сезон завершен</div>`;return;}
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
