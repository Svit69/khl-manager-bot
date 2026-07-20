import { ContractTabRenderer } from "./ContractTabRenderer.js";
import { FreeAgentTabRenderer } from "./FreeAgentTabRenderer.js";
import { TeamStatsTabRenderer } from "./TeamStatsTabRenderer.js";
import { TradeTabRenderer } from "./TradeTabRenderer.js";
import { JuniorTeamTabRenderer } from "./JuniorTeamTabRenderer.js";
import { TransferTabRenderer } from "./TransferTabRenderer.js";
import { CoachTabRenderer } from "./CoachTabRenderer.js";
import { SeasonContractDecisionRenderer } from "./SeasonContractDecisionRenderer.js";
import { OfferSheetPopupRenderer } from "./OfferSheetPopupRenderer.js";
import { IncomingTradePopupRenderer } from "./IncomingTradePopupRenderer.js";
import { SalaryCapComplianceRenderer } from "./SalaryCapComplianceRenderer.js";
import { CalendarMonthRenderer } from "./CalendarMonthRenderer.js";
import { CalendarBestPlayerRenderer } from "./CalendarBestPlayerRenderer.js";
import { CalendarNextMatchRenderer } from "./CalendarNextMatchRenderer.js";
import { CalendarPlayoffRenderer } from "./CalendarPlayoffRenderer.js";
import { LegacyTabRenderer } from "./LegacyTabRenderer.js";
import { TeamSidebarRenderer } from "./TeamSidebarRenderer.js";
import { renderFantasyDraftView } from "./draft/FantasyDraftViewRenderer.js";
import { calculateAge } from "../contracts/SeasonUtils.js";
import { adjustedOvrForPosition } from "../utils/positionFit.js";
import { getPlayerPhotoUrl, PHOTO_FALLBACK_ATTR } from "../utils/PlayerPhoto.js";
const FANTASY_DRAFT_ROUNDS=25;
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
const formatMillions=value=>{
  const millions=(Number(value)||0)/1000000;
  return Number.isInteger(millions)?String(millions):millions.toFixed(1);
};
const renderDraftPositionBlock=(label,players)=>{
  const names=(players||[]).map(player=>player.name).join(", ");
  return `<div class="draft-pos"><div class="muted">${label} (${players.length})</div><div>${names||"—"}</div></div>`;
};
const getDraftTargetByPosition=position=>{
  if(position==="CTR")return 5;
  if(position==="LW")return 5;
  if(position==="RW")return 5;
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
const renderFatigueDot=player=>{
  const status=player.fatigueStatus||"green";
  const score=Math.round(Number(player.fatigueScore)||0);
  const labels={green:"\u0421\u0432\u0435\u0436\u0438\u0439",yellow:"\u0423\u043c\u0435\u0440\u0435\u043d\u043d\u0430\u044f \u0443\u0441\u0442\u0430\u043b\u043e\u0441\u0442\u044c",orange:"\u0412\u044b\u0441\u043e\u043a\u0430\u044f \u0443\u0441\u0442\u0430\u043b\u043e\u0441\u0442\u044c",red:"\u0421\u0438\u043b\u044c\u043d\u0430\u044f \u0443\u0441\u0442\u0430\u043b\u043e\u0441\u0442\u044c",injured:"\u0422\u0440\u0430\u0432\u043c\u0430"};
  return `<span class="hockey-card-fatigue hockey-card-fatigue--${status}" title="${labels[status]||"\u0423\u0441\u0442\u0430\u043b\u043e\u0441\u0442\u044c"} \u2022 ${score}" aria-label="${labels[status]||"\u0423\u0441\u0442\u0430\u043b\u043e\u0441\u0442\u044c"}"></span>`;
};
const renderRosterCard=(player,extraClass="",options={})=>{
  const photo=getPlayerPhotoUrl(player);
  const surname=getSurname(player).toUpperCase();
  const age=calculateAge(player.identity.birthDate);
  const nationCode=getNationCode(player.identity.nationality);
  const nationFlag=getNationFlag(player.identity.nationality);
  const displayOvr=options.displayOvr??player.currentOvr??player.ovr;
  const displayPosition=options.displayPosition||player.identity.primaryPosition;
  const isPenalized=options.isPenalized||displayOvr<(player.ovr||displayOvr);
  const penalizedClass=isPenalized?" hockey-card--penalized":"";
  const fatigueClass=(player.fatigueOvrPenalty||0)>0?" hockey-card--fatigued":"";
  return `<article class="hockey-card${extraClass?` ${extraClass}`:""}${penalizedClass}${fatigueClass}"><div class="hockey-card-layers"><img class="hockey-card-bg" src="./card/card_background.svg" alt="" aria-hidden="true"/><img class="hockey-card-photo" src="${photo}" alt="${player.name}" ${PHOTO_FALLBACK_ATTR}/><img class="hockey-card-front" src="./card/card_front.svg" alt="" aria-hidden="true"/></div><div class="hockey-card-top"><span class="hockey-card-ovr-wrap"><span class="hockey-card-ovr">${displayOvr}</span></span><span class="hockey-card-pos">${displayPosition}</span></div><div class="hockey-card-name-band">${surname}</div><div class="hockey-card-meta-row"><span>${age} \u041b\u0415\u0422</span>${renderFatigueDot(player)}<span>${nationFlag} ${nationCode}</span></div></article>`;
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
    return [team.lines?.[4]?.players?.[0]].filter(player=>player?.identity?.primaryPosition==="ВРТ");
  }
  const lineIndex=Math.max(1,Math.min(4,Number(unitKey)||1))-1;
  return [...(team.lines?.[lineIndex]?.players||[])];
};
const getRosterUnitSlotDescriptors=(team,unitKey)=>{
  if(String(unitKey)==="G"){
    return [{player:team.lines?.[4]?.players?.[0]||null,slot:{kind:"line",lineIndex:4,slotIndex:0,position:"ВРТ"}}];
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
  if(!selectedItem?.player)return "";
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
const renderNotificationCenter=notifications=>{
  const unreadCount=Math.max(0,Number(notifications?.unreadCount)||0);
  const unreadItems=notifications?.unreadItems||[];
  const totalUnread=Math.max(unreadCount,Number(notifications?.totalUnread)||0);
  const extraCount=Math.max(0,totalUnread-unreadItems.length);
  const listMarkup=unreadItems.length
    ? unreadItems.map(item=>`<div class="team-notifications-item type-${item.type||"default"}"><div class="team-notifications-item-top"><span class="team-notifications-dot"></span><div class="team-notifications-item-title">${item.title||"\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0435"}</div><div class="team-notifications-item-meta">\u0414\u0435\u043d\u044c ${item.day||"\u2014"}</div></div><div class="team-notifications-item-text">${item.message||""}</div></div>`).join("")
    : `<div class="team-notifications-empty">\u041d\u0435\u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u043d\u044b\u0445 \u0443\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u0439 \u043d\u0435\u0442</div>`;
  return `<div class="team-notifications${unreadCount?" has-unread":""}">
    <button type="button" class="team-notifications-trigger" aria-label="\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f">
      <span class="team-notifications-icon" aria-hidden="true">&#128276;</span>
      <span class="team-notifications-label">\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f</span>
      ${unreadCount?`<span class="team-notifications-badge">${unreadCount>99?"99+":unreadCount}</span>`:""}
    </button>
    <div class="team-notifications-popover">
      <div class="team-notifications-popover-head"><strong>Club alerts</strong><span>${totalUnread} \u043d\u043e\u0432\u044b\u0445</span></div>
      <div class="team-notifications-list">${listMarkup}</div>
      <div class="team-notifications-actions">
        ${extraCount?`<button type="button" class="team-notifications-more" data-action="show-more-notifications">\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0435\u0449\u0435 ${extraCount}</button>`:""}
        ${totalUnread?`<button type="button" class="team-notifications-mark" data-action="mark-notifications-read">\u041e\u0442\u043c\u0435\u0442\u0438\u0442\u044c \u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u043d\u044b\u043c\u0438</button>`:""}
      </div>
    </div>
  </div>`;
};
export class Renderer{
  #teamEl;#calEl;#matchEl;#userEl;#contractTab=new ContractTabRenderer();#teamStatsTab=new TeamStatsTabRenderer();#freeAgentTab=new FreeAgentTabRenderer();#tradeTab=new TradeTabRenderer();#juniorTab=new JuniorTeamTabRenderer();#transferTab=new TransferTabRenderer();#coachTab=new CoachTabRenderer();#legacyTab=new LegacyTabRenderer();#teamSidebarRenderer=new TeamSidebarRenderer();#seasonContractDecision=new SeasonContractDecisionRenderer();#offerSheetPopup=new OfferSheetPopupRenderer();#incomingTradePopup=new IncomingTradePopupRenderer();#capCompliance=new SalaryCapComplianceRenderer();#monthCalendar=new CalendarMonthRenderer();#bestPlayerCard=new CalendarBestPlayerRenderer();#nextMatchCard=new CalendarNextMatchRenderer();#playoffCard=new CalendarPlayoffRenderer();
  constructor(){
    this.#teamEl=document.getElementById("teamPanel");
    this.#calEl=document.getElementById("calendarPanel");
    this.#matchEl=document.getElementById("matchPanel");
    this.#userEl=document.getElementById("userBadge");
  }
  renderUser(user){if(this.#userEl)this.#userEl.textContent=`ID: ${user.id}`}
  renderTeam(team,activeTab,activeRosterUnit="1",selectedRosterSlot=null,notifications=null,settings={}){
    const rosterView=activeTab==="roster"
      ? `<div class="team-club-shell"><div class="team-roster-stage"><div class="line-view-panel">${renderRosterUnitButtons(activeRosterUnit)}${renderRosterUnitCards(team,activeRosterUnit,selectedRosterSlot)}</div></div><div class="team-reserve-wrap">${renderReserveStrip(team.reservePlayers||[])}</div></div>`
      : "";
    const sidebar=this.#teamSidebarRenderer.render(team,activeTab,settings);
    this.#teamEl.innerHTML=`<div class="team-screen">${sidebar}<div class="team-screen-main"><header class="team-screen-header"><div class="team-screen-club"><img class="team-screen-logo" src="${team.logoUrl}" alt="${team.name}"/><div><div class="team-screen-title">${String(team.name).toUpperCase()}</div><div class="team-screen-subtitle">${this.#formatTeamLocation(team)}</div></div></div><div class="team-screen-status">${renderNotificationCenter(notifications)}<span class="team-screen-status-pill">Club Hub</span><span class="team-screen-status-pill team-screen-status-pill-muted">${activeTab==="roster"?"Основной состав":"Управление клубом"}</span></div></header><section class="team-screen-content">${rosterView}<div id="teamTabContent"></div></section></div></div>`;
  }
  #formatTeamLocation(team){
    const countryByCode={RU:"Россия",BY:"Беларусь",KZ:"Казахстан",CN:"Китай"};
    return [team.city,countryByCode[String(team.country||"").toUpperCase()]||team.country].filter(Boolean).join(", ");
  }
  renderTeamSelection(teams,activeTeamId,selectedTeamId=null,settings={}){
    const popularShortNames=new Set(["AVT","AKB","CSK","AVG"]);
    const popularTeams=teams.filter(team=>popularShortNames.has(team.shortName));
    const otherTeams=teams.filter(team=>!popularShortNames.has(team.shortName));
    const selectedTeam=teams.find(team=>team.id===selectedTeamId)||null;
    const rfaEnabled=settings.restrictedFreeAgencyEnabled!==false;
    const capEnabled=settings.salaryCapEnabled!==false;
    const coachesEnabled=settings.coachesEnabled!==false;
    const conferencesEnabled=settings.conferencesEnabled!==false;
    const renderCard=team=>`<button class="team-select-card${selectedTeamId===team.id?" active":""}" data-team-id="${team.id}">
      <div class="team-select-card-glow"></div>
      <div class="team-select-card-body">
        <img src="${team.logoUrl}" alt="${team.name}"/>
        <div class="team-select-card-name">${team.name}</div>
        <div class="team-select-card-subtitle">${team.city}</div>
      </div>
    </button>`;
    const renderSection=(title,cards)=>cards.length?`<section class="team-select-section"><h3>${title}</h3><div class="team-select-grid">${cards.map(renderCard).join("")}</div></section>`:"";
    const conferenceControl=`<label class="team-select-toggle"><input type="checkbox" data-action="new-game-conferences-toggle" ${conferencesEnabled?"checked":""}><span></span><strong>Конференции Восток / Запад</strong><small>${conferencesEnabled?"Таблица делится на конференции, в плей-офф выходят по 8 клубов.":"Используется единая общая таблица и прежний посев."}</small></label>`;
    const careerSettingsPanel=`<section class="team-select-settings"><div><h3>Настройки карьеры</h3><p>Можно изменить до выбора клуба.</p></div><div class="team-select-toggle-list"><label class="team-select-toggle"><input type="checkbox" data-action="new-game-rfa-toggle" ${rfaEnabled?"checked":""}><span></span><strong>ОСА / НСА и права игроков</strong><small>${rfaEnabled?"Квалификационные предложения, оффершиты и права на игроков включены.":"Все истекающие игроки становятся свободными агентами, права и оффершиты отключены."}</small></label><label class="team-select-toggle"><input type="checkbox" data-action="new-game-cap-toggle" ${capEnabled?"checked":""}><span></span><strong>Потолок зарплат КХЛ</strong><small>${capEnabled?"Выбранный потолок действует в драфте, контрактах и обменах.":"Подписания и обмены не ограничиваются общей платежкой клуба."}</small></label><label class="team-select-toggle"><input type="checkbox" data-action="new-game-coaches-toggle" ${coachesEnabled?"checked":""}><span></span><strong>Главные тренеры</strong><small>${coachesEnabled?"У клубов есть Head Coach, стиль и тренерские рейтинги.":"Вкладка тренера и тренерские параметры отключены."}</small></label>${conferenceControl}</div></section>`;
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
        ${careerSettingsPanel}
        ${renderSection("Популярные клубы",popularTeams)}
        ${renderSection("Все клубы",otherTeams)}
      </div>
      ${actionDock}
    </section>`;
  }
  renderSalaryCapCompliance(view){
    const container=document.getElementById("teamTabContent");
    if(container)container.innerHTML=this.#capCompliance.render(view);
  }
  renderMyTeamRoster(team){
    const container=document.getElementById("teamTabContent");
    if(container)container.innerHTML="";
    else{
      const cards=team.getRoster().map(player=>renderRosterCard(player)).join("");
      this.#matchEl.innerHTML=`<h2>Состав</h2><div class="roster-grid roster-grid-cards">${cards}</div>`;
    }
  }
  renderContracts(rows,negotiation,restrictedRights=[],externalPlayers=[],salaryCap=null){
    const container=document.getElementById("teamTabContent");
    if(container){container.innerHTML=this.#contractTab.render(rows,negotiation,restrictedRights,externalPlayers,salaryCap);return;}
    this.#matchEl.innerHTML=this.#contractTab.render(rows,negotiation,restrictedRights,externalPlayers,salaryCap);
  }
  renderTeamStatistics(rows,sortBy="points",selectedTeamId=null,teams=[],activeTeamId=null){
    const container=document.getElementById("teamTabContent");
    if(container){container.innerHTML=this.#teamStatsTab.render(rows,sortBy,selectedTeamId,teams,activeTeamId);return;}
    this.#matchEl.innerHTML=this.#teamStatsTab.render(rows,sortBy,selectedTeamId,teams,activeTeamId);
  }
  renderTrades(view){
    const container=document.getElementById("teamTabContent");
    if(container){container.innerHTML=this.#tradeTab.render(view);return;}
    this.#matchEl.innerHTML=this.#tradeTab.render(view);
  }
  renderTransfers(view){
    const container=document.getElementById("teamTabContent");
    if(container){container.innerHTML=this.#transferTab.render(view);return;}
    this.#matchEl.innerHTML=this.#transferTab.render(view);
  }
  renderJuniorTeam(view){
    const container=document.getElementById("teamTabContent");
    if(container){container.innerHTML=this.#juniorTab.render(view);return;}
    this.#matchEl.innerHTML=this.#juniorTab.render(view);
  }
  renderCoach(view){
    const container=document.getElementById("teamTabContent");
    if(container){container.innerHTML=this.#coachTab.render(view);return;}
    this.#matchEl.innerHTML=this.#coachTab.render(view);
  }
  renderLegacy(view){
    const container=document.getElementById("teamTabContent");
    if(container){container.innerHTML=this.#legacyTab.render(view);return;}
    this.#matchEl.innerHTML=this.#legacyTab.render(view);
  }
  renderSeasonContractDecision(view){
    if(!view?.isOpen)return;
    this.#teamEl.insertAdjacentHTML("beforeend",this.#seasonContractDecision.render(view));
  }
  renderOfferSheetPopup(view){
    if(!view?.row)return;
    this.#teamEl.insertAdjacentHTML("beforeend",this.#offerSheetPopup.render(view));
  }
  renderIncomingTradePopup(view){
    if(!view?.row)return;
    this.#teamEl.insertAdjacentHTML("beforeend",this.#incomingTradePopup.render(view));
  }
  renderFreeAgents(rows,negotiation,salaryCap=null){
    const container=document.getElementById("teamTabContent");
    if(container){container.innerHTML=this.#freeAgentTab.render(rows,negotiation,salaryCap);return;}
    this.#matchEl.innerHTML=this.#freeAgentTab.render(rows,negotiation,salaryCap);
  }
  renderConfirmSelection(team){
    this.renderTeamSelection([team],null,team.id);
  }
  renderFantasyDraftIntro(team,settings={}){
    const infoPills=[
      {label:"Режим",value:"23 раунда"},
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
    const capBaseMillions=Math.round((Number(settings.salaryCapBaseRub)||900000000)/1000000);
    const capGrowthRub=Number(settings.salaryCapGrowthRub)||0;
    const capControls=settings.salaryCapEnabled===false?"":`<div class="draft-cap-settings"><label><small>Start cap, млн</small><input type="number" min="500" step="50" value="${Math.max(500,capBaseMillions)}" data-action="new-game-cap-base"></label><label><small>Growth</small><select data-action="new-game-cap-growth"><option value="0"${capGrowthRub===0?" selected":""}>0 млн</option><option value="50000000"${capGrowthRub===50000000?" selected":""}>50 млн</option><option value="100000000"${capGrowthRub===100000000?" selected":""}>100 млн</option></select></label></div>`;
    this.#teamEl.innerHTML=`<section class="draft-intro-screen">
      <div class="draft-intro-rail draft-intro-rail-top"><span>KHL MANAGER</span><span>FANTASY DRAFT</span><span>BUILD YOUR TEAM</span><span>KHL MANAGER</span><span>FANTASY DRAFT</span><span>BUILD YOUR TEAM</span></div>
      <div class="draft-intro-main">
        <div class="draft-intro-hero">
          <div class="draft-intro-kicker">Fantasy Draft</div>
          <h1>Draft your team</h1>
          <p class="draft-intro-lead">Вы выбрали <strong>${team.name}</strong>. Сейчас вся лига по очереди будет забирать игроков из общей базы. Ваша задача — собрать сильный и сбалансированный состав за 23 пика.</p>
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
                identity:{lastName:team.shortName,displayName:team.name,birthDate:"1997-01-01",nationality:team.country,primaryPosition:"ЦТР",photoUrl:"./player-photo/default.png"}
              },"draft-intro-card")}
            </div>
            <div class="draft-intro-card-caption">
              <strong>${team.name}</strong>
              <span>${team.city} • старт с пустого ростера</span>
            </div>
          </div>
          <div class="draft-intro-feature-stack">${tags}</div>
            ${capControls}
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
    this.#teamEl.innerHTML=renderFantasyDraftView(draft,team);
    this.#matchEl.innerHTML="";
    return;
    const selectedPlayer=draft.availablePlayers.find(player=>player.id===draft.selectedPlayerId)||null;
    const previewPlayer=selectedPlayer||draft.availablePlayers[0]||null;
    const draftRounds=draft.rounds||FANTASY_DRAFT_ROUNDS;
    const totalProgress=draft.totalPicks>0?Math.min(100,Math.round((Math.max(0,draft.pickNumber-1)/draft.totalPicks)*100)):0;
    const draftHeader=`<div class="draft-header-shell"><div class="draft-header-main"><img class="logo" src="${team.logoUrl}" alt="${team.name}"/><div><div class="draft-header-title">Фэнтези драфт — ${team.name}</div><div class="muted">Раунд ${draft.currentRound}/${draftRounds} • Пик ${draft.currentPickInRound}/${draft.teams.length} • Общий #${draft.pickNumber}/${draft.totalPicks}</div></div></div><div class="draft-header-side"><div class="muted">Текущий пик</div><div class="draft-current-team">${draft.currentTeamName||"—"}</div><div class="draft-progress"><span style="width:${totalProgress}%"></span></div></div></div>`;
    const teamRows=draft.teams.map(item=>{
      const isCurrent=item.id===draft.currentTeamId;
      const isUser=item.id===team.id;
      const payroll=item.payrollRub!==null&&item.payrollRub!==undefined?`<small>${formatMillions(item.payrollRub)} / ${formatMillions(item.capRub)} млн</small>`:"";
      return `<div class="draft-team-row${isCurrent?" current":""}${isUser?" user":""}"><span class="draft-team-name">${item.name}${payroll}</span><span class="draft-team-count">${item.pickedCount}/${draftRounds}</span></div>`;
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
    const salaryCap=draft.salaryCap?{
      ...draft.salaryCap,
      selectedSalaryRub:previewPlayer?Number(draft.salaryCap.salaryByPlayerId?.[previewPlayer.id])||0:0,
      selectedFits:!previewPlayer || (Number(draft.salaryCap.userPayrollRub)||0)+(Number(draft.salaryCap.salaryByPlayerId?.[previewPlayer.id])||0)<=Number(draft.salaryCap.capRub)
    }:null;
    const capSummary=salaryCap?`<div class="draft-cap-summary"><div><span>Потолок ${salaryCap.seasonLabel}</span><strong>${formatMillions(salaryCap.userPayrollRub)} / ${formatMillions(salaryCap.capRub)} млн</strong></div><div><span>Доступно</span><strong>${formatMillions(salaryCap.remainingRub)} млн</strong></div><div><span>ЗП игрока</span><strong>${formatMillions(salaryCap.selectedSalaryRub)} млн</strong></div></div>`:"";
    const capMessage=salaryCap&&!salaryCap.selectedFits?`<div class="draft-warning">Игрок не помещается под потолок зарплат.</div>`:"";
    const draftMessage=draft.message?`<div class="draft-warning">${draft.message}</div>`:"";
    const confirmText=selectedPlayer?`Задрафтовать: ${selectedPlayer.name}`:"Выберите игрока";
    const confirmDisabled=!draft.isUserTurn||!selectedPlayer||(salaryCap&&!salaryCap.selectedFits)?"disabled":"";
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
    const actionBar=`<div class="draft-action"><div class="draft-action-text"><div class="muted">Статус</div><div>${status}</div><div class="muted">Выбрано: ${selectedPlayer?`${selectedPlayer.name} • ${selectedPlayer.identity.primaryPosition} • OVR ${selectedPlayer.ovr}`:"—"}</div>${capMessage}${draftMessage}</div><div class="draft-action-buttons"><button class="btn secondary" data-action="draft-cancel">Отмена</button><button class="btn" ${confirmDisabled} data-action="draft-confirm-pick">${confirmText}</button></div></div>`;
    const cards=draft.availablePlayers.map(player=>{
      const age=calculateAge(player.identity.birthDate);
      const selectedClass=player.id===draft.selectedPlayerId?" selected":"";
      const nation=getNationBadge(player.identity.nationality);
      const salaryRub=salaryCap?.salaryByPlayerId?.[player.id]||0;
      return `<button class="draft-list-row${selectedClass}" data-action="draft-select" data-player-id="${player.id}"><div class="draft-list-row-pos">${player.identity.primaryPosition||"—"}</div><img class="player-photo" src="${getPlayerPhotoUrl(player)}" alt="${player.name}" ${PHOTO_FALLBACK_ATTR}/><div class="draft-list-row-main"><div class="draft-list-row-name">${player.name}</div><div class="draft-list-row-meta">${nation}</div></div><div class="draft-list-row-stat"><span class="draft-list-row-stat-label">OVR</span><strong>${player.ovr}</strong></div><div class="draft-list-row-stat"><span class="draft-list-row-stat-label">Возраст</span><strong>${age}</strong></div>${salaryCap?`<div class="draft-list-row-stat"><span class="draft-list-row-stat-label">ЗП</span><strong>${formatMillions(salaryRub)}</strong></div>`:""}</button>`;
    }).join("");
    const recentPicks=(draft.pickLog||[]).slice(-5).reverse().map(item=>`<div class="draft-recent-row"><span>#${item.pickNumber}</span><span>${item.teamName}</span><span>${item.playerName}</span></div>`).join("")||`<div class="muted">Пиков пока нет</div>`;
    const attrs=previewPlayer?.attributes?.attributesJson||{};
    const attrRows=Object.entries(attrs).filter(([,value])=>typeof value==="number").slice(0,5).map(([key,value])=>{
      const labels={shot:"Бросок",speed:"Скорость",physical:"Силовая",defense:"Оборона",skill:"Техника",reaction:"Реакция",positioning:"Позиция",athleticism:"Атлетизм",puckControl:"Контроль шайбы",mental:"Психология"};
      const pct=Math.max(0,Math.min(100,Number(value)||0));
      return `<div class="draft-attr-row"><span>${labels[key]||key}</span><div class="draft-attr-bar"><span style="width:${pct}%"></span></div><strong>${value}</strong></div>`;
    }).join("");
    const previewAge=previewPlayer?calculateAge(previewPlayer.identity.birthDate):null;
    const previewSalary=salaryCap&&previewPlayer?` • ЗП ${formatMillions(salaryCap.selectedSalaryRub)} млн`:"";
    const previewCard=previewPlayer?`<div class="draft-preview-head"><img class="draft-preview-photo" src="${getPlayerPhotoUrl(previewPlayer)}" alt="${previewPlayer.name}" ${PHOTO_FALLBACK_ATTR}/><div class="draft-preview-title"><div class="draft-preview-ovr">${previewPlayer.ovr}</div><div class="draft-preview-name">${previewPlayer.name}</div><div class="draft-preview-meta">${previewPlayer.identity.primaryPosition} • ${previewAge} лет • ${getNationBadge(previewPlayer.identity.nationality)}${previewSalary}</div></div></div><div class="draft-preview-attrs">${attrRows||'<div class="muted">Атрибуты недоступны</div>'}</div>`:`<div class="muted">Игрок не выбран</div>`;
    this.#teamEl.innerHTML=`<div class="draft-screen"><div class="draft-top">${draftHeader}${capSummary}<div class="draft-order-strip">${orderPreview}</div></div><div class="draft-layout"><section class="draft-left"><div class="draft-card"><div class="draft-card-head"><h2>Доступные игроки</h2><div class="muted">${draft.availablePlayers.length} в пуле</div></div><div class="draft-toolbar"><div><div class="muted">Сортировка</div>${sortControls}</div><div><div class="muted">Фильтр по позиции</div>${filterControls}</div></div>${actionBar}<div class="draft-list">${cards||"<div class=\"muted\">Нет игроков</div>"}</div></div></section><aside class="draft-right"><div class="draft-card"><div class="draft-card-head"><h2>Просмотр игрока</h2><div class="muted">Имя • позиция • OVR • возраст • нация</div></div>${previewCard}</div><div class="draft-card"><div class="draft-card-head"><h2>Ваш драфт-борд</h2><div class="muted">${team.name}</div></div>${renderDraftNeedsGrid(userRoster)}<div class="draft-panel">${rosterPanel}</div></div><div class="draft-card"><div class="draft-card-head"><h2>Команды</h2><div class="muted">${draftRounds} раундов • змейка</div></div><div class="draft-team-list">${teamRows}</div></div><div class="draft-card"><div class="draft-card-head"><h2>Последние пики</h2><div class="muted">Live log</div></div><div class="draft-recent-list">${recentPicks}</div></div></aside></div></div>`;
    this.#matchEl.innerHTML="";
  }  renderCalendar(currentDateLabel,info,isLocked,panelData={}){
    const activeTab=panelData?.tab||"standings";
    const activeTeamId=panelData?.activeTeamId||null;
    const playoffs=panelData?.playoffs||{active:false,rounds:[]};
    const seasonState=panelData?.seasonState||null;
    const isSeasonComplete=Boolean(seasonState?.canAdvance);
    const currentMatch=info?.matches?.find(match=>activeTeamId&&(match.home?.id===activeTeamId||match.away?.id===activeTeamId))||info?.matches?.[0]||null;
    const text=isLocked
      ? "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043a\u043e\u043c\u0430\u043d\u0434\u0443"
      : isSeasonComplete
        ? `\u0421\u0435\u0437\u043e\u043d ${seasonState?.seasonLabel||""} \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d${seasonState?.latestArchive?.champion?.name?` \u2022 \u0427\u0435\u043c\u043f\u0438\u043e\u043d: ${seasonState.latestArchive.champion.name}`:""}`
      : (seasonState?.phase==="preseason"
        ? "\u041f\u0440\u0435\u0434\u0441\u0435\u0437\u043e\u043d\u043d\u043e\u0435 \u043e\u043a\u043d\u043e"
        : (!info?.matches?.length
        ? "\u0414\u0435\u043d\u044c \u043e\u0442\u0434\u044b\u0445\u0430"
        : (activeTeamId&&currentMatch
          ? `${info?.phase==="playoffs"&&info?.stageLabel?`${info.stageLabel} \u2022 `:""}${currentMatch.home.name} \u2014 ${currentMatch.away.name}`
          : `${info?.phase==="playoffs"&&info?.stageLabel?`${info.stageLabel} \u2022 `:""}\u0418\u0433\u0440\u043e\u0432\u043e\u0439 \u0434\u0435\u043d\u044c: ${info.matches.length} ${this.#pluralizeMatches(info.matches.length)}`)));
    const playoffLimit=this.#getPlayoffParticipantLimit(panelData?.standings?.length||0);
    const conferencesEnabled=panelData?.gameSettings?.conferencesEnabled!==false;
    const renderStandingRow=(row,index,isPlayoffZone)=>`<div class="calendar-table-row${isPlayoffZone?" playoff-zone":""}"><span>${index+1}</span><span class="calendar-table-team">${row.logoUrl?`<img src="${row.logoUrl}" alt="${row.name||row.shortName}"/>`:""}<strong>${row.shortName||row.name}</strong></span><span>${row.gp||0}</span><span>${row.w||0}</span><span>${row.l||0}</span><span>${row.otl||0}</span><span>${row.pts||0}</span></div>`;
    const flatStandings=(panelData?.standings||[]).map((row,index)=>renderStandingRow(row,index,index<playoffLimit)).join("");
    const conferenceStandings=(panelData?.conferenceStandings||[]).map(group=>`<section class="calendar-conference-standings"><h4>${String(group.label||"").toUpperCase()}</h4>${(group.rows||[]).map((row,index)=>renderStandingRow(row,index,index<8)).join("")}</section>`).join("");
    const standings=(conferencesEnabled&&conferenceStandings?conferenceStandings:flatStandings)||`<div class="muted">\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445</div>`;
    const scorers=(panelData?.scorers||[]).slice(0,20).map((row,index)=>{
      const fullName=this.#escapeHtmlAttribute(row.displayName||row.name);
      const nameParts=this.#splitPlayerName(row.displayName||row.name);
      const plusMinus=Number(row.plusMinus)||0;
      const plusMinusLabel=plusMinus>0?`+${plusMinus}`:`${plusMinus}`;
      return `<div class="calendar-scorer-row"><span>${index+1}</span><span class="calendar-scorer-player" title="${fullName}"><img src="${row.photoUrl||"./player-photo/default.png"}" alt="${fullName}" ${PHOTO_FALLBACK_ATTR}/><span title="${fullName}"><em>${nameParts.first}</em><strong>${nameParts.last}</strong></span></span><span class="calendar-scorer-team-logo">${row.teamLogoUrl?`<img src="${row.teamLogoUrl}" alt="${row.team||""}"/>`:""}</span><span>${row.games||0}</span><span>${row.goals||0}</span><span>${row.assists||0}</span><span class="calendar-scorer-points">${row.points||((row.goals||0)+(row.assists||0))}</span><span class="${this.#getPlusMinusClass(plusMinus)}">${plusMinusLabel}</span></div>`;
    }).join("")||`<div class="muted">\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445</div>`;
    const scheduleRows=this.#monthCalendar.render(panelData?.schedule||[],activeTeamId,panelData?.scheduleView||{});
    const playoffRows=this.#playoffCard.render(playoffs,seasonState,activeTeamId);
    const tabButtons=`<div class="calendar-tabs"><button class="calendar-tab-btn${activeTab==="standings"?" active":""}" data-action="calendar-tab" data-value="standings">\u0422\u0410\u0411\u041b\u0418\u0426\u0410</button><button class="calendar-tab-btn${activeTab==="scorers"?" active":""}" data-action="calendar-tab" data-value="scorers">\u0411\u041e\u041c\u0411\u0410\u0420\u0414\u0418\u0420\u042b</button><button class="calendar-tab-btn${activeTab==="schedule"?" active":""}" data-action="calendar-tab" data-value="schedule">\u0420\u0410\u0421\u041f\u0418\u0421\u0410\u041d\u0418\u0415</button><button class="calendar-tab-btn${activeTab==="playoffs"?" active":""}" data-action="calendar-tab" data-value="playoffs">\u041f\u041b\u0415\u0419-\u041e\u0424\u0424</button></div>`;
    const tableHeader=activeTab==="standings"
      ? `<div class="calendar-table-header"><span>#</span><span>\u041a\u041e\u041c\u0410\u041d\u0414\u0410</span><span>\u0418</span><span>\u0412</span><span>\u041f</span><span>\u041f\u041e</span><span>\u041e</span></div>`
      : activeTab==="scorers"
        ? `<div class="calendar-scorer-header"><span>#</span><span>\u0418\u0413\u0420\u041e\u041a</span><span></span><span>\u0418\u0413\u0420\u042b</span><span>\u0413\u041e\u041b\u042b</span><span>\u041f\u0415\u0420\u0415\u0414\u0410\u0427\u0418</span><span class="calendar-scorer-points">\u041e\u0427\u041a\u0418</span><span>+/-</span></div>`
        : activeTab==="schedule"
          ? ""
          : "";
    const tableBody=activeTab==="standings"?standings:(activeTab==="scorers"?scorers:(activeTab==="schedule"?scheduleRows:playoffRows));
    const panelClass=activeTab==="playoffs"?" playoffs":(activeTab==="schedule"?" schedule":(activeTab==="standings"?" standings":(activeTab==="scorers"?" scorers":"")));
    const bestTeamPlayer=this.#bestPlayerCard.render(panelData?.bestTeamScorer);
    const nextMatch=this.#nextMatchCard.render(currentMatch,panelData?.standings,info?.dateLabel||currentDateLabel,playoffs);
    this.#calEl.innerHTML=`<div class="calendar-shell"><section class="calendar-top-block"><div class="calendar-date-row"><div><div class="calendar-date-label">${String(currentDateLabel).toUpperCase()}</div><div class="calendar-state-label">${String(text).toUpperCase()}</div></div><button id="playBtn" class="btn calendar-next-btn" ${isLocked?"disabled":""}>ДАЛЬШЕ</button></div>${tabButtons}</section><section class="calendar-content-block"><div class="calendar-panel-list${panelClass}">${tableHeader}<div class="calendar-panel-scroll${panelClass}">${tableBody}</div></div></section><section class="calendar-split-block calendar-split-block-featured"><div>${bestTeamPlayer}</div><div>${nextMatch}</div></section><section class="calendar-split-block"><div></div><div></div></section></div>`;
  }
  #pluralizeMatches(count){
    const mod10=count%10;
    const mod100=count%100;
    if(mod10===1 && mod100!==11)return "матч";
    if(mod10>=2 && mod10<=4 && (mod100<12 || mod100>14))return "матча";
    return "матчей";
  }
  #getPlayoffParticipantLimit(teamCount){
    if(teamCount>=16)return 16;
    if(teamCount>=8)return 8;
    return 0;
  }
  #splitPlayerName(name){
    const parts=String(name||"").trim().split(/\s+/).filter(Boolean);
    if(parts.length<=1)return {first:"",last:parts[0]||""};
    return {first:parts.slice(0,-1).join(" "),last:parts[parts.length-1]};
  }
  #escapeHtmlAttribute(value){
    return String(value||"").replace(/[&<>"']/g,(char)=>({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;",
      "'":"&#39;",
    }[char]));
  }
  #getPlusMinusClass(value){
    if(value>0)return "calendar-plus-minus-positive";
    if(value<0)return "calendar-plus-minus-negative";
    return "calendar-plus-minus-neutral";
  }
  renderResetButton(){this.#calEl.insertAdjacentHTML("beforeend","<div class=\"row reset-row\"><button id=\"resetBtn\" class=\"btn secondary\">Новая игра</button></div>")}
  renderMatchSimulationPopup(playback){
    if(!playback)return;
    const formatIceTime=seconds=>{
      const safe=Math.max(0,Math.round(Number(seconds)||0));
      const mm=String(Math.floor(safe/60)).padStart(2,"0");
      const ss=String(safe%60).padStart(2,"0");
      return `${mm}:${ss}`;
    };
    const formatSavePercentage=value=>{
      const safe=Number(value)||0;
      return safe?safe.toFixed(3).replace(/^0/,""):"-";
    };
    const buildMatchStatsRows=(teamSummary,team)=>(teamSummary?.playerStats||[])
      .map(stat=>({
        ...stat,
        points:(stat.goals||0)+(stat.assists||0),
        team,
        playerKey:`${team?.id||team?.name||"team"}:${stat.playerId||stat.playerName||"player"}`
      }));
    const sortMatchStats=(rows,sortKey="points")=>{
      const sorted=[...rows];
      const compareName=(left,right)=>String(left.playerName||"").localeCompare(String(right.playerName||""),"ru");
      sorted.sort((left,right)=>{
        if(sortKey==="iceTime"){
          return ((right.totalIceTime||0)-(left.totalIceTime||0))||
            ((right.points||0)-(left.points||0))||
            ((right.shots||0)-(left.shots||0))||
            compareName(left,right);
        }
        if(sortKey==="shots"){
          return ((right.shots||0)-(left.shots||0))||
            ((right.points||0)-(left.points||0))||
            ((right.goals||0)-(left.goals||0))||
            compareName(left,right);
        }
        if(sortKey==="goalie"){
          return ((right.isGoalie?1:0)-(left.isGoalie?1:0))||
            ((right.saves||0)-(left.saves||0))||
            ((right.savePercentage||0)-(left.savePercentage||0))||
            compareName(left,right);
        }
        return ((right.points||0)-(left.points||0))||
          ((right.goals||0)-(left.goals||0))||
          ((right.assists||0)-(left.assists||0))||
          ((right.shots||0)-(left.shots||0))||
          compareName(left,right);
      });
      return sorted;
    };
    const fmtClock=seconds=>{
      const safe=Math.max(0,Number(seconds)||0);
      const isOt=safe>=3600;
      const overtimeFormat=playback.match.summary?.overtimeFormat||null;
      const overtimePeriodLen=overtimeFormat==="playoffs"?1200:300;
      const period=isOt
        ? (overtimeFormat==="playoffs" ? (4+Math.floor((safe-3600)/overtimePeriodLen)) : 4)
        : Math.min(3,Math.floor(safe/1200)+1);
      const periodLen=isOt?overtimePeriodLen:1200;
      const inPeriod=isOt
        ? (overtimeFormat==="playoffs" ? ((safe-3600)%overtimePeriodLen) : (safe-3600))
        : (safe%1200);
      const down=Math.max(0,periodLen-inPeriod);
      const mm=String(Math.floor(down/60)).padStart(2,"0");
      const ss=String(down%60).padStart(2,"0");
      return {period,label:`${mm}:${ss}`};
    };
    const clock=fmtClock(playback.currentSecond);
    const visibleEvents=playback.visibleEvents||[];
    const score=visibleEvents.reduce((acc,event)=>{
      if(event.type!=="goal")return acc;
      if(event.teamId===playback.match.home.id)acc.home++;
      if(event.teamId===playback.match.away.id)acc.away++;
      return acc;
    },{home:0,away:0});
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
    const statsSort=playback.statsSort||"points";
    const homeStatsRows=sortMatchStats(buildMatchStatsRows(playback.match.summary?.home,playback.match.home),statsSort);
    const awayStatsRows=sortMatchStats(buildMatchStatsRows(playback.match.summary?.away,playback.match.away),statsSort);
    const allStatsRows=[...homeStatsRows,...awayStatsRows];
    const selectedPlayerKey=playback.selectedStatPlayerKey||allStatsRows[0]?.playerKey||null;
    playback.selectedStatPlayerKey=selectedPlayerKey;
    const selectedPlayer=allStatsRows.find(row=>row.playerKey===selectedPlayerKey)||allStatsRows[0]||null;
    const timeline=visibleEvents.map(event=>{
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
        text=`\u0423\u0434\u0430\u043b\u0435\u043d\u0438\u0435: ${event.player?.name||event.player} (${event.penaltyMinutes||2} \u043c\u0438\u043d)`;
        tagClass+=" penalty";
      }
      return `<div class="sim-log-row"><div class="sim-log-side home">${isHome?`<span class="${tagClass}">${event.type==="goal"?"\u0413\u041e\u041b":"\u0423\u0414\u0410\u041b."}</span><span>${text}</span>`:""}</div><div class="sim-log-time">P${event.period} ${event.periodClock}</div><div class="sim-log-side away">${!isHome?`<span>${text}</span><span class="${tagClass}">${event.type==="goal"?"\u0413\u041e\u041b":"\u0423\u0414\u0410\u041b."}</span>`:""}</div></div>`;
    }).join("");
    const renderStatsSection=(title,team,rows,goalsValue,shotsValue,pimValue)=>`
      <section class="sim-stats-section">
        <div class="sim-stats-section-head">
          <div class="sim-stats-section-team">
            ${team?.logoUrl?`<img class="sim-stats-section-logo" src="${team.logoUrl}" alt="${team.name}"/>`:""}
            <div>
              <div class="sim-stats-section-label">${title}</div>
              <div class="sim-stats-section-name">${team?.name||"\u2014"}</div>
            </div>
          </div>
          <div class="sim-stats-summary">
            <span class="sim-stats-summary-chip"><b>${goalsValue}</b><small>\u0413</small></span>
            <span class="sim-stats-summary-chip"><b>${shotsValue}</b><small>\u0411\u0420</small></span>
            <span class="sim-stats-summary-chip"><b>${pimValue}</b><small>\u0428\u041c</small></span>
          </div>
        </div>
        <div class="sim-stats-legend">
          <span>\u0418\u0433\u0440\u043e\u043a</span>
          <span>\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u0438</span>
        </div>
        <div class="sim-stats-list">
          ${rows.map((row,index)=>`
            <button type="button" class="sim-player-card${index===0?" is-top":""}${row.playerKey===selectedPlayerKey?" is-selected":""}" data-action="sim-select-player" data-player-key="${row.playerKey}">
              <div class="sim-player-rank">${index+1}</div>
              <div class="sim-player-main">
                <div class="sim-player-name" title="${row.playerName||"\u0418\u0433\u0440\u043e\u043a"}">${row.playerName||"\u0418\u0433\u0440\u043e\u043a"}</div>
                <div class="sim-player-subline">
                  <span>${row.team?.shortName||row.team?.name||"\u2014"}</span>
                  <span>${formatIceTime(row.totalIceTime)}</span>
                </div>
              </div>
              ${row.isGoalie?`
                <div class="sim-player-stats">
                  <span class="sim-player-stat sim-player-stat-accent"><b>${row.saves||0}</b><small>SV</small></span>
                  <span class="sim-player-stat"><b>${formatSavePercentage(row.savePercentage)}</b><small>SV%</small></span>
                  <span class="sim-player-stat"><b>${row.goalsAgainst||0}</b><small>GA</small></span>
                  <span class="sim-player-stat"><b>${row.shotsAgainst||0}</b><small>SA</small></span>
                  <span class="sim-player-stat"><b>${row.shutout||0}</b><small>SO</small></span>
                </div>
              `:`
                <div class="sim-player-stats">
                  <span class="sim-player-stat sim-player-stat-accent"><b>${row.points||0}</b><small>\u041e</small></span>
                  <span class="sim-player-stat"><b>${row.goals||0}</b><small>\u0413</small></span>
                  <span class="sim-player-stat"><b>${row.assists||0}</b><small>\u041f</small></span>
                  <span class="sim-player-stat"><b>${row.shots||0}</b><small>\u0411\u0440</small></span>
                  <span class="sim-player-stat"><b>${row.penaltyMinutes||0}</b><small>\u0428\u041c</small></span>
                </div>
              `}
            </button>
          `).join("")||`<div class="muted">\u041d\u0435\u0442 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0438</div>`}
        </div>
      </section>
    `;
    const leaderRows=sortMatchStats(allStatsRows,"points").slice(0,3);
    const renderLeaderCard=(row,index)=>`
      <button type="button" class="sim-leader-card${row.playerKey===selectedPlayerKey?" is-selected":""}" data-action="sim-select-player" data-player-key="${row.playerKey}">
        <div class="sim-leader-rank">#${index+1}</div>
        <div class="sim-leader-main">
          <div class="sim-leader-name">${row.playerName||"\u0418\u0433\u0440\u043e\u043a"}</div>
          <div class="sim-leader-subline">
            ${row.team?.logoUrl?`<img class="sim-leader-logo" src="${row.team.logoUrl}" alt="${row.team.name}"/>`:""}
            <span>${row.team?.shortName||row.team?.name||"\u2014"}</span>
            <span>${formatIceTime(row.totalIceTime)}</span>
          </div>
        </div>
        <div class="sim-leader-points">
          <strong>${row.points||0}</strong>
          <span>\u041e\u0447\u043a\u0438</span>
        </div>
      </button>
    `;
    const renderSortButton=(key,label)=>`<button type="button" class="sim-stats-sort${statsSort===key?" is-active":""}" data-action="sim-stats-sort" data-sort="${key}">${label}</button>`;
    const detailPanel=selectedPlayer?`
      <aside class="sim-player-detail">
        <div class="sim-player-detail-head">
          <div class="sim-player-detail-team">
            ${selectedPlayer.team?.logoUrl?`<img class="sim-player-detail-logo" src="${selectedPlayer.team.logoUrl}" alt="${selectedPlayer.team.name}"/>`:""}
            <div>
              <div class="sim-player-detail-label">\u0414\u0435\u0442\u0430\u043b\u0438 \u0438\u0433\u0440\u043e\u043a\u0430</div>
              <div class="sim-player-detail-team-name">${selectedPlayer.team?.name||"\u2014"}</div>
            </div>
          </div>
          <div class="sim-player-detail-badge">${selectedPlayer.team?.shortName||"\u2014"}</div>
        </div>
        <div class="sim-player-detail-body">
          <div class="sim-player-detail-name">${selectedPlayer.playerName||"\u0418\u0433\u0440\u043e\u043a"}</div>
          <div class="sim-player-detail-meta">
            <span>${selectedPlayer.team?.shortName||selectedPlayer.team?.name||"\u2014"}</span>
            <span>${formatIceTime(selectedPlayer.totalIceTime)}</span>
          </div>
          ${selectedPlayer.isGoalie?`
            <div class="sim-player-detail-grid">
              <div class="sim-player-detail-stat sim-player-detail-stat--accent"><strong>${selectedPlayer.saves||0}</strong><span>\u0421\u0435\u0439\u0432\u044b</span></div>
              <div class="sim-player-detail-stat"><strong>${formatSavePercentage(selectedPlayer.savePercentage)}</strong><span>SV%</span></div>
              <div class="sim-player-detail-stat"><strong>${selectedPlayer.goalsAgainst||0}</strong><span>\u041f\u0440\u043e\u043f\u0443\u0449\u0435\u043d\u043e</span></div>
              <div class="sim-player-detail-stat"><strong>${selectedPlayer.shotsAgainst||0}</strong><span>\u0411\u0440\u043e\u0441\u043a\u0438 \u043f\u043e</span></div>
              <div class="sim-player-detail-stat"><strong>${selectedPlayer.qualityStart||0}</strong><span>Quality Start</span></div>
              <div class="sim-player-detail-stat"><strong>${formatIceTime(selectedPlayer.totalIceTime)}</strong><span>\u0410\u0439\u0441\u0442\u0430\u0439\u043c</span></div>
            </div>
          `:`
            <div class="sim-player-detail-grid">
              <div class="sim-player-detail-stat sim-player-detail-stat--accent"><strong>${selectedPlayer.points||0}</strong><span>\u041e\u0447\u043a\u0438</span></div>
              <div class="sim-player-detail-stat"><strong>${selectedPlayer.goals||0}</strong><span>\u0413\u043e\u043b\u044b</span></div>
              <div class="sim-player-detail-stat"><strong>${selectedPlayer.assists||0}</strong><span>\u041f\u0435\u0440\u0435\u0434\u0430\u0447\u0438</span></div>
              <div class="sim-player-detail-stat"><strong>${selectedPlayer.shots||0}</strong><span>\u0411\u0440\u043e\u0441\u043a\u0438</span></div>
              <div class="sim-player-detail-stat"><strong>${selectedPlayer.penaltyMinutes||0}</strong><span>\u0428\u0442\u0440. \u043c\u0438\u043d</span></div>
              <div class="sim-player-detail-stat"><strong>${formatIceTime(selectedPlayer.totalIceTime)}</strong><span>\u0410\u0439\u0441\u0442\u0430\u0439\u043c</span></div>
            </div>
          `}
        </div>
      </aside>
    `:`<aside class="sim-player-detail"><div class="muted">\u041d\u0435\u0442 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0438</div></aside>`;
    const statsTable=`<div class="sim-stats-table sim-stats-table-modern">
      <div class="sim-stats-shell">
        <div class="sim-stats-hero">
          <div class="sim-stats-hero-copy">
            <div class="sim-stats-hero-kicker">\u0420\u0430\u0437\u0431\u043e\u0440 \u043c\u0430\u0442\u0447\u0430</div>
            <div class="sim-stats-hero-title">\u041b\u0438\u0434\u0435\u0440\u044b \u0438 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u043f\u043e \u0438\u0433\u0440\u043e\u043a\u0430\u043c</div>
          </div>
          <div class="sim-stats-hero-chips">
            <span class="sim-stats-hero-chip"><b>${score.home}:${score.away}</b><small>\u0421\u0447\u0435\u0442</small></span>
            <span class="sim-stats-hero-chip"><b>${homeShots+awayShots}</b><small>\u0411\u0440\u043e\u0441\u043a\u0438</small></span>
            <span class="sim-stats-hero-chip"><b>${visibleHomePens+visibleAwayPens}</b><small>\u0423\u0434\u0430\u043b\u0435\u043d\u0438\u044f</small></span>
          </div>
        </div>
        <div class="sim-leader-strip">
          ${leaderRows.map((row,index)=>renderLeaderCard(row,index)).join("")||`<div class="muted">\u041d\u0435\u0442 \u043b\u0438\u0434\u0435\u0440\u043e\u0432</div>`}
        </div>
        <div class="sim-stats-toolbar">
          <div class="sim-stats-toolbar-label">\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u043c\u0430\u0442\u0447\u0430</div>
          <div class="sim-stats-toolbar-actions">
            ${renderSortButton("points","\u041e\u0447\u043a\u0438")}
            ${renderSortButton("iceTime","\u0412\u0440\u0435\u043c\u044f")}
            ${renderSortButton("shots","\u0411\u0440\u043e\u0441\u043a\u0438")}
            ${renderSortButton("goalie","\u0412\u0440\u0430\u0442\u0430\u0440\u0438")}
          </div>
        </div>
        <div class="sim-stats-layout">
          <div class="sim-stats-columns">
            ${renderStatsSection("\u0414\u043e\u043c\u0430\u0448\u043d\u044f\u044f \u043a\u043e\u043c\u0430\u043d\u0434\u0430",playback.match.home,homeStatsRows,score.home,homeShots,visibleHomePens)}
            ${renderStatsSection("\u0413\u043e\u0441\u0442\u0435\u0432\u0430\u044f \u043a\u043e\u043c\u0430\u043d\u0434\u0430",playback.match.away,awayStatsRows,score.away,awayShots,visibleAwayPens)}
          </div>
          ${detailPanel}
        </div>
      </div>
    </div>`;
    const overtimeFormat=playback.match.summary?.overtimeFormat||null;
    const periodsLabel=clock.period>=4
      ? (overtimeFormat==="playoffs"?`\u041e\u0422 ${clock.period-3} 5x5`:"\u041e\u0422 3x3")
      : "\u041f\u0435\u0440\u0438\u043e\u0434";
    const contentLabel=playback.view==="stats"?"\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u043c\u0430\u0442\u0447\u0430":"\u0421\u043e\u0431\u044b\u0442\u0438\u044f \u043c\u0430\u0442\u0447\u0430";
    const contentBody=playback.view==="stats"
      ? statsTable
      : `<div class="sim-timeline sim-timeline-eafc">${timeline||'<div class="muted">\u0421\u0438\u043c\u0443\u043b\u044f\u0446\u0438\u044f \u0438\u0434\u0435\u0442...</div>'}</div>`;
    const controls=playback.isFinished
      ? `<button class="btn secondary${playback.view==="events"?" active":""}" data-action="sim-view-events">\u0421\u043e\u0431\u044b\u0442\u0438\u044f</button><button class="btn secondary${playback.view==="stats"?" active":""}" data-action="sim-view-stats">\u0421\u0442\u0430\u0442\u0438\u043a\u0430 \u043c\u0430\u0442\u0447\u0430</button><button class="btn secondary" data-action="sim-close">\u0417\u0430\u043a\u0440\u044b\u0442\u044c</button>`
      : `<button class="btn secondary" data-action="sim-skip">\u041f\u0440\u043e\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u0441\u0438\u043c\u0443\u043b\u044f\u0446\u0438\u044e</button><button class="btn secondary" data-action="sim-close">\u0417\u0430\u043a\u0440\u044b\u0442\u044c</button>`;
    this.#teamEl.insertAdjacentHTML("beforeend",`<div class="modal sim-modal"><div class="sim-modal-card sim-eafc"><button type="button" class="sim-modal-close" data-action="sim-close" aria-label="\u0417\u0430\u043a\u0440\u044b\u0442\u044c">\u00d7</button><div class="sim-top-head"><div class="sim-top-team"><span class="sim-top-team-name">${playback.match.home.name}</span><img class="sim-team-logo" src="${playback.match.home.logoUrl}" alt="${playback.match.home.name}"/></div><div class="sim-top-center"><div class="sim-top-score">${score.home}:${score.away}</div><div class="sim-period">${periodsLabel}${clock.period>=4?"":" \u2022 "+clock.period+"/3"}</div><div class="sim-clock">${clock.label}</div></div><div class="sim-top-team sim-top-team-right"><img class="sim-team-logo" src="${playback.match.away.logoUrl}" alt="${playback.match.away.name}"/><span class="sim-top-team-name">${playback.match.away.name}</span></div></div><div class="sim-stage"><aside class="sim-side-panel"><div class="sim-side-stat"><div class="sim-side-label">\u0411\u0440\u043e\u0441\u043a\u0438</div><div class="sim-side-value">${homeShots}</div></div><div class="sim-side-stat"><div class="sim-side-label">\u0423\u0434\u0430\u043b\u0435\u043d\u0438\u044f</div><div class="sim-side-value">${visibleHomePens}</div></div><div class="sim-side-stat"><div class="sim-side-label">\u0413\u043e\u043b\u044b</div><div class="sim-side-value">${score.home}</div></div></aside><section class="sim-board"><div class="sim-board-overlay"></div><div class="sim-progress sim-progress-eafc"><span style="width:${Math.min(100,Math.round(progressRatio*100))}%"></span></div><div class="sim-timeline-header"><span>${contentLabel}</span><span>${playback.match.summary?.wentToOvertime?(overtimeFormat==="playoffs"?"\u041f\u043b\u0435\u0439-\u043e\u0444\u0444 \u041e\u0422":"\u0421 \u041e\u0422"):"\u041e\u0441\u043d\u043e\u0432\u043d\u043e\u0435 \u0432\u0440\u0435\u043c\u044f"}</span></div>${contentBody}<div class="sim-center-actions sim-center-actions-eafc">${controls}</div></section><aside class="sim-side-panel sim-side-panel-right"><div class="sim-side-stat"><div class="sim-side-label">\u0411\u0440\u043e\u0441\u043a\u0438</div><div class="sim-side-value">${awayShots}</div></div><div class="sim-side-stat"><div class="sim-side-label">\u0423\u0434\u0430\u043b\u0435\u043d\u0438\u044f</div><div class="sim-side-value">${visibleAwayPens}</div></div><div class="sim-side-stat"><div class="sim-side-label">\u0413\u043e\u043b\u044b</div><div class="sim-side-value">${score.away}</div></div></aside></div></div></div>`);
    const timelineEl=this.#teamEl.querySelector(".sim-timeline");
    if(timelineEl && playback.view!=="stats"){
      timelineEl.scrollTop=timelineEl.scrollHeight;
    }
  }
  renderMatch(match,stats){
    if(match===null){this.#matchEl.innerHTML=`<h2>\u041c\u0430\u0442\u0447</h2><div class="list">\u0421\u0435\u0433\u043e\u0434\u043d\u044f \u043e\u0442\u0434\u044b\u0445</div>`;return;}
    if(!match){this.#matchEl.innerHTML=`<h2>\u041c\u0430\u0442\u0447</h2><div class="list">\u0421\u0435\u0437\u043e\u043d \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d</div>`;return;}
    const events=(match.events||[]).map(event=>{
      if(event.type==="penalty")return `<div class="event">P${event.period} ${event.periodClock} ${event.team}: \u0443\u0434\u0430\u043b\u0435\u043d\u0438\u0435 (${event.player?.name||event.player})</div>`;
      const scorer=event.scorer?.name||event.scorer;
      const assists=(event.assists||[]).length?event.assists.join(", "):(event.assist||"");
      return `<div class="event">P${event.period||1} ${event.periodClock||`${event.minute}\'`}: ${event.team} \u2014 ${scorer}${assists?` (+${assists})`:""}</div>`;
    }).join("");
    const top=stats.slice(0,4).map(item=>`${item.name} ${item.goals}+${item.assists}`).join("<br/>");
    this.#matchEl.innerHTML=`<h2>\u041c\u0430\u0442\u0447</h2><div class="list">${match.home.name} ${match.homeGoals}:${match.awayGoals} ${match.away.name}</div><div class="list">${events||"\u0411\u0435\u0437 \u0433\u043e\u043b\u043e\u0432"}</div><div class="list">\u041b\u0438\u0434\u0435\u0440\u044b:<br/>${top||"\u041d\u0435\u0442"}</div>`;
  }
  #renderTabs(activeTab){
    const rosterClass=activeTab==="roster"?"tab active":"tab";
    const contractClass=activeTab==="contracts"?"tab active":"tab";
    return `<div class="tab-row"><button class="${rosterClass}" data-tab="roster">Состав</button><button class="${contractClass}" data-tab="contracts">Контракты</button></div>`;
  }
}
