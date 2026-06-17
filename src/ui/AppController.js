import { FantasyDraftService } from "../draft/FantasyDraftService.js";
import { JuniorPhotoPool } from "../utils/JuniorPhotoPool.js";
export class AppController{
  #state;#calendar;#teams;#renderer;#userStore;#pendingTeamId=null;#activeTab="roster";
  #selectedNegotiationPlayerId=null;#offerByPlayerId=new Map();#outcomeByPlayerId=new Map();
  #tradeTeamId=null;#tradeGivePlayerIds=new Set();#tradeReceivePlayerIds=new Set();#tradeMessage="";
  #activeRosterUnit="1";
  #teamStatsSort="points";
  #teamStatsTeamId=null;
  #transferTeamId=null;
  #coachMessage="";
  #draftIntroTeamId=null;
  #draftState=null;
  #draftMessage="";
  #dragRosterSlot=null;
  #matchPlayback=null;
  #matchPlaybackTimer=null;
  #calendarPanelTab="standings";
  #notificationVisibleCount=6;
  #newGameSettings={restrictedFreeAgencyEnabled:true,salaryCapEnabled:true,salaryCapBaseRub:900000000,salaryCapGrowthRub:50000000,coachesEnabled:true};
  #capComplianceOpen=false;
  #capReleasePlayerIds=new Set();
  #seasonContractDecisionOpen=false;
  #seasonContractDecisionFilter="pending";
  #seasonContractDecisionSelectedPlayerId=null;
  #seasonContractDecisionSelectedRowKey=null;
  #seasonContractReleasePlayerIds=new Set();
  #seasonContractQualifiedPlayerIds=new Set();
  #seasonExternalOfferPlayerIds=new Set();
  #seasonContractOutcomes=new Map();
  #dismissedOfferSheetPopupIds=new Set();
  #juniorPhotoStatusById=new Map();
  #juniorPhotoErrorById=new Map();
  #juniorPhotoPool=new JuniorPhotoPool();
  #juniorPositionFilter="all";
  constructor(state,calendar,teams,renderer,userStore){
    this.#state=state;this.#calendar=calendar;this.#teams=teams;this.#renderer=renderer;this.#userStore=userStore;
  }
  initialize(){
    this.#renderer.renderUser(this.#userStore.loadUser());
    this.#restoreDraftState();
    this.#renderScreen();
    document.addEventListener("click",event=>this.#handleClick(event));
    document.addEventListener("change",event=>this.#handleChange(event));
    document.addEventListener("dragstart",event=>this.#handleDragStart(event));
    document.addEventListener("dragover",event=>this.#handleDragOver(event));
    document.addEventListener("drop",event=>this.#handleDrop(event));
    document.addEventListener("dragend",event=>{this.#dragRosterSlot=null;event.target?.classList?.remove?.("is-dragging");});
  }
  #renderScreen(){
    const dayInfo=this.#state.activeTeam?this.#state.getVisibleCalendarDay():this.#calendar.getCurrent();
    const seasonState=this.#state.getSeasonState();
    const calendarDateLabel=seasonState?.phase==="preseason"&&seasonState?.preseasonOpen
      ? this.#state.currentSeasonDateLabel
      : (dayInfo?.dateLabel||this.#state.currentSeasonDateLabel);
    if(this.#state.activeTeam){
      const needsCapCompliance=this.#state.needsSalaryCapCompliance();
      if(needsCapCompliance)this.#capComplianceOpen=true;
      if(this.#capComplianceOpen && !needsCapCompliance)this.#capComplianceOpen=false;
      this.#renderer.renderTeam(this.#state.activeTeam,this.#activeTab,this.#activeRosterUnit,null,{
        unreadCount:this.#state.getUnreadNotificationCount(),
        unreadItems:this.#state.getUnreadNotifications(this.#notificationVisibleCount),
        totalUnread:this.#state.getUnreadNotificationTotal()
      },this.#state.gameSettings);
      if(this.#capComplianceOpen){
        this.#renderer.renderSalaryCapCompliance(this.#state.getSalaryCapComplianceView([...this.#capReleasePlayerIds]));
        this.#renderer.renderCalendar(calendarDateLabel,dayInfo,true,{
          tab:this.#calendarPanelTab,
          activeTeamId:this.#state.activeTeamId,
          standings:this.#state.getStandingsTable(),
          scorers:this.#state.getTopScorers(10),
          schedule:this.#state.getCalendarScheduleRows(),
          playoffs:this.#state.getPlayoffBracketData(),
          seasonState
        });
        this.#renderer.renderResetButton();
        return;
      }
      this.#renderer.renderCalendar(calendarDateLabel,dayInfo,false,{
        tab:this.#calendarPanelTab,
        activeTeamId:this.#state.activeTeamId,
        standings:this.#state.getStandingsTable(),
        scorers:this.#state.getTopScorers(10),
        schedule:this.#state.getCalendarScheduleRows(),
        playoffs:this.#state.getPlayoffBracketData(),
        seasonState
      });
      this.#renderer.renderResetButton();
      if(this.#activeTab==="contracts"){
        this.#renderer.renderContracts(
          this.#state.getActiveTeamContractRows(),
          this.#buildNegotiationState(),
          this.#buildRestrictedRightsState(),
          this.#state.getExternalPlayerRows(),
          this.#state.getSalaryCapSummary()
        );
      }else if(this.#activeTab==="coach"){
        const coachView=this.#state.getActiveTeamCoachView();
        if(coachView)coachView.message=this.#coachMessage;
        this.#renderer.renderCoach(coachView);
      }else if(this.#activeTab==="teamStats"){
        const selectedTeamId=this.#teamStatsTeamId||this.#state.activeTeamId;
        this.#renderer.renderTeamStatistics(
          this.#state.getTeamStatisticsRows(selectedTeamId,this.#teamStatsSort),
          this.#teamStatsSort,
          selectedTeamId,
          this.#teams,
          this.#state.activeTeamId
        );
      }else if(this.#activeTab==="freeAgents"){
        this.#renderer.renderFreeAgents(this.#state.getActiveTeamFreeAgentRows(),this.#buildNegotiationState(),this.#state.getSalaryCapSummary());
      }else if(this.#activeTab==="trades"){
        this.#renderer.renderTrades(this.#buildTradeState());
      }else if(this.#activeTab==="transfers"){
        this.#renderer.renderTransfers(this.#state.getTeamTransferView(this.#transferTeamId||this.#state.activeTeamId));
      }else if(this.#activeTab==="legacy"){
        this.#renderer.renderLegacy(this.#state.getActiveTeamLegacyView());
      }else if(this.#activeTab==="junior"){
        const juniorView=this.#state.getActiveTeamJuniorView();
        if(juniorView){
          juniorView.photoStatusById=this.#juniorPhotoStatusById;
          juniorView.photoErrorById=this.#juniorPhotoErrorById;
          juniorView.positionFilter=this.#juniorPositionFilter;
        }
        this.#renderer.renderJuniorTeam(juniorView);
      }else{
        this.#renderer.renderMyTeamRoster(this.#state.activeTeam);
      }
      this.#renderer.renderSeasonContractDecision(this.#buildSeasonContractDecisionView());
      this.#renderer.renderOfferSheetPopup(this.#buildOfferSheetPopupView());
      if(this.#matchPlayback)this.#renderer.renderMatchSimulationPopup(this.#matchPlayback);
      return;
    }
    if(this.#draftState){
      const selectedTeam=this.#teams.find(team=>team.id===this.#draftState.selectedTeamId);
      if(selectedTeam){
        const draftView=this.#draftState.service.getView(this.#draftState.sortBy,this.#draftState.filterPosition);
        draftView.selectedPlayerId=this.#draftState.selectedPlayerId;
        draftView.message=this.#draftMessage;
        this.#renderer.renderFantasyDraft(draftView,selectedTeam);
      }
      this.#renderer.renderCalendar(calendarDateLabel,dayInfo,true,{
        tab:this.#calendarPanelTab,
        activeTeamId:this.#state.activeTeamId,
        standings:this.#state.getStandingsTable(),
        scorers:this.#state.getTopScorers(10),
        schedule:this.#state.getCalendarScheduleRows(),
        playoffs:this.#state.getPlayoffBracketData(),
        seasonState
      });
      this.#renderer.renderResetButton();
      return;
    }
    if(this.#draftIntroTeamId){
      const selectedTeam=this.#teams.find(team=>team.id===this.#draftIntroTeamId);
      if(selectedTeam)this.#renderer.renderFantasyDraftIntro(selectedTeam,this.#newGameSettings);
      this.#renderer.renderCalendar(calendarDateLabel,dayInfo,true,{
        tab:this.#calendarPanelTab,
        activeTeamId:this.#state.activeTeamId,
        standings:this.#state.getStandingsTable(),
        scorers:this.#state.getTopScorers(10),
        schedule:this.#state.getCalendarScheduleRows(),
        playoffs:this.#state.getPlayoffBracketData(),
        seasonState
      });
      this.#renderer.renderResetButton();
      return;
    }
    this.#renderer.renderTeamSelection(this.#teams,this.#state.activeTeamId,this.#pendingTeamId,this.#newGameSettings);
    this.#renderer.renderCalendar(calendarDateLabel,dayInfo,true,{
      tab:this.#calendarPanelTab,
      activeTeamId:this.#state.activeTeamId,
      standings:this.#state.getStandingsTable(),
      scorers:this.#state.getTopScorers(10),
      schedule:this.#state.getCalendarScheduleRows(),
      playoffs:this.#state.getPlayoffBracketData(),
      seasonState
    });
    this.#renderer.renderResetButton();
    this.#renderer.renderMatch(this.#state.lastMatch,this.#state.seasonStats);
  }
  #handleChange(event){
    const changed=event.target?.closest?.("[data-action]");
    const action=changed?.dataset?.action;
    if(action==="trade-select-team"){
      const teamId=changed.value||"";
      this.#tradeTeamId=teamId||null;
      this.#tradeGivePlayerIds.clear();
      this.#tradeReceivePlayerIds.clear();
      this.#tradeMessage="";
      this.#renderScreen();
      return;
    }
    if(action==="set-offer-salary-input"){
      const playerId=changed.dataset.playerId;
      const salaryRub=this.#parseSalaryMillions(changed.value);
      if(!playerId||!salaryRub)return;
      const current=this.#offerByPlayerId.get(playerId)||{years:1,salaryRub};
      this.#offerByPlayerId.set(playerId,{...current,salaryRub});
      this.#renderScreen();
      return;
    }
    if(action==="set-osa-salary-input"){
      const offerId=changed.dataset.offerId;
      const salaryRub=this.#parseSalaryMillions(changed.value);
      if(!offerId||!salaryRub)return;
      const current=this.#offerByPlayerId.get(offerId)||{years:1,salaryRub};
      this.#offerByPlayerId.set(offerId,{...current,salaryRub});
      this.#renderScreen();
      return;
    }
    if(action==="team-stats-team-select"){
      this.#teamStatsTeamId=changed.value||this.#state.activeTeamId;
      this.#renderScreen();
    }
    if(action==="transfer-team-select"){
      this.#transferTeamId=changed.value||this.#state.activeTeamId;
      this.#renderScreen();
    }
    if(action==="junior-position-filter"){
      this.#juniorPositionFilter=changed.value||"all";
      this.#renderScreen();
    }
    if(action==="new-game-cap-base"){
      const millions=Math.max(500,Number(changed.value)||900);
      this.#newGameSettings={...this.#newGameSettings,salaryCapBaseRub:Math.round(millions*1000000)};
      this.#state.updateGameSettings(this.#newGameSettings);
      this.#renderScreen();
    }
    if(action==="new-game-cap-growth"){
      this.#newGameSettings={...this.#newGameSettings,salaryCapGrowthRub:Number(changed.value)||0};
      this.#state.updateGameSettings(this.#newGameSettings);
      this.#renderScreen();
    }
    if(action==="season-contract-salary-input"){
      const playerId=changed.dataset.playerId;
      const salaryRub=this.#parseSalaryMillions(changed.value);
      if(!playerId||!salaryRub)return;
      const current=this.#offerByPlayerId.get(playerId)||this.#getSeasonContractDefaultOffer(playerId)||{years:1,salaryRub};
      this.#offerByPlayerId.set(playerId,{...current,salaryRub});
      this.#seasonContractReleasePlayerIds.delete(playerId);
      this.#seasonContractQualifiedPlayerIds.delete(playerId);
      this.#renderScreen();
    }
  }
  #buildNegotiationState(){
    if(!this.#selectedNegotiationPlayerId)return null;
    const offer=this.#offerByPlayerId.get(this.#selectedNegotiationPlayerId)||null;
    const preview=this.#activeTab==="freeAgents"
      ? this.#state.getFreeAgentSigningPreview(this.#selectedNegotiationPlayerId,offer)
      : this.#state.getActiveTeamNegotiationPreview(this.#selectedNegotiationPlayerId,offer);
    if(!preview)return null;
    const outcome=this.#outcomeByPlayerId.get(this.#selectedNegotiationPlayerId)||null;
    this.#offerByPlayerId.set(this.#selectedNegotiationPlayerId,preview.offer);
    return {playerId:this.#selectedNegotiationPlayerId,preview,offer:preview.offer,outcome};
  }
  #buildRestrictedRightsState(){
    return this.#state.getActiveTeamRestrictedRightsRows().map(row=>{
      const current=this.#offerByPlayerId.get(row.id)||row.offer;
      this.#offerByPlayerId.set(row.id,current);
      return {...row,userOffer:current};
    });
  }
  #buildTradeState(){
    const partners=this.#state.getTradePartnerTeams();
    const selectedTeam=partners.find(team=>team.id===this.#tradeTeamId)||null;
    const giveCandidates=[
      ...(this.#state.activeTeam?.getRoster()||[]),
      ...this.#state.getExternalRightsPlayers(this.#state.activeTeamId)
    ];
    const receiveCandidates=selectedTeam
      ? [...selectedTeam.getRoster(),...this.#state.getExternalRightsPlayers(selectedTeam.id)]
      : [];
    const giveIds=[...this.#tradeGivePlayerIds];
    const receiveIds=[...this.#tradeReceivePlayerIds];
    const evaluation=selectedTeam?this.#state.evaluateTradeWithTeam(selectedTeam.id,giveIds,receiveIds):null;
    const salaryCap=selectedTeam?this.#state.getTradeSalaryCapPreview(selectedTeam.id,giveIds,receiveIds):null;
    return {
      partners,
      selectedTeamId:selectedTeam?.id||"",
      selectedTeam,
      giveCandidates:this.#decorateTradeCandidates(giveCandidates),
      receiveCandidates:this.#decorateTradeCandidates(receiveCandidates),
      giveSelectedIds:this.#tradeGivePlayerIds,
      receiveSelectedIds:this.#tradeReceivePlayerIds,
      evaluation,
      salaryCap,
      message:this.#tradeMessage
    };
  }
  #decorateTradeCandidates(players){
    return (players||[]).map(player=>{
      player.tradeSalaryRub=player.externalCareer&&!player.affiliation?.teamId?null:this.#state.getTradePlayerSalaryRub(player.id);
      return player;
    });
  }
  #buildSeasonContractDecisionView(){
    if(!this.#seasonContractDecisionOpen || !this.#state.activeTeam)return {isOpen:false};
    const offersByPlayerId=Object.fromEntries(this.#offerByPlayerId);
    const rows=this.#getSeasonDecisionRows(offersByPlayerId);
    const pendingRows=rows.filter(row=>row.rowType==="khl"&&!row.hasFutureContract&&!row.isRenewalLocked&&!this.#seasonContractReleasePlayerIds.has(row.playerId)&&!this.#seasonContractQualifiedPlayerIds.has(row.playerId));
    const visibleRows=rows.filter(row=>{
      if(this.#seasonContractDecisionFilter==="pending")return row.rowType==="khl"&&!row.hasFutureContract&&!row.isRenewalLocked&&!this.#seasonContractReleasePlayerIds.has(row.playerId)&&!this.#seasonContractQualifiedPlayerIds.has(row.playerId);
      if(this.#seasonContractDecisionFilter==="external")return row.rowType==="external";
      if(this.#seasonContractDecisionFilter==="osa")return row.ufaStatus==="OSA"||row.ufaStatus==="ОСА";
      if(this.#seasonContractDecisionFilter==="nsa")return row.ufaStatus==="NSA"||row.ufaStatus==="НСА";
      if(this.#seasonContractDecisionFilter==="renewed")return row.hasFutureContract;
      if(this.#seasonContractDecisionFilter==="release")return this.#seasonContractReleasePlayerIds.has(row.playerId);
      return true;
    });
    const selectedRow=visibleRows.find(row=>(row.rowKey||row.playerId)===this.#seasonContractDecisionSelectedRowKey) || visibleRows[0] || rows.find(row=>row.playerId===this.#seasonContractDecisionSelectedPlayerId) || rows[0] || null;
    if(selectedRow?.preview&&!this.#offerByPlayerId.has(selectedRow.playerId)){
      this.#offerByPlayerId.set(selectedRow.playerId,selectedRow.preview.offer);
    }
    return {
      isOpen:true,
      rows,
      filteredRows:visibleRows,
      selectedRow,
      selectedPlayerId:selectedRow?.playerId||null,
      selectedRowKey:selectedRow?.rowKey||selectedRow?.playerId||null,
      filter:this.#seasonContractDecisionFilter,
      releasePlayerIds:this.#seasonContractReleasePlayerIds,
      qualifiedPlayerIds:this.#seasonContractQualifiedPlayerIds,
      externalOfferPlayerIds:this.#seasonExternalOfferPlayerIds,
      offersByPlayerId:Object.fromEntries(this.#offerByPlayerId),
      outcomesByPlayerId:Object.fromEntries(this.#seasonContractOutcomes),
      totalCount:rows.length,
      resolvedCount:rows.filter(row=>row.rowType==="external"?this.#seasonExternalOfferPlayerIds.has(row.playerId):(row.hasFutureContract||row.isRenewalLocked||this.#seasonContractReleasePlayerIds.has(row.playerId)||this.#seasonContractQualifiedPlayerIds.has(row.playerId))).length,
      pendingCount:pendingRows.length,
      osaCount:rows.filter(row=>row.ufaStatus==="OSA"||row.ufaStatus==="ОСА").length
    };
  }
  #getSeasonContractDefaultOffer(playerId){
    const offers=Object.fromEntries(this.#offerByPlayerId);
    const rows=this.#getSeasonDecisionRows(offers);
    return rows.find(row=>row.playerId===playerId)?.preview?.offer||null;
  }
  #getSeasonDecisionRows(offersByPlayerId){
    return [
      ...this.#state.getSeasonContractDecisionRows(offersByPlayerId),
      ...this.#state.getSeasonExternalRightsDecisionRows(offersByPlayerId)
    ];
  }
  #buildOfferSheetPopupView(){
    const row=this.#state.getActiveTeamRestrictedRightsRows().find(candidate=>!this.#dismissedOfferSheetPopupIds.has(candidate.id))||null;
    return {row};
  }
  async #handleClick(event){
    const clickable=event.target?.closest?.("[data-team-id],[data-tab],[data-action],#resetBtn,#playBtn");
    const tab=clickable?.dataset?.tab;
    const action=clickable?.dataset?.action;
    const teamId=clickable?.dataset?.teamId;
    if(teamId && !action){this.#pendingTeamId=teamId;this.#renderScreen();return;}
    if(tab){
      this.#activeTab=tab;
      if(tab!=="teamStats")this.#teamStatsSort="points";
      if(tab==="teamStats"&&!this.#teamStatsTeamId)this.#teamStatsTeamId=this.#state.activeTeamId;
      if(tab!=="trades"){this.#tradeMessage="";}
      if(tab!=="coach"){this.#coachMessage="";}
      this.#selectedNegotiationPlayerId=null;
      this.#renderScreen();
      return;
    }
    if(action==="team-stats-sort"){
      this.#teamStatsSort=clickable.dataset.sort||"points";
      this.#renderScreen();
      return;
    }
    if(action==="team-stats-select-team"){
      this.#teamStatsTeamId=clickable.dataset.teamId||this.#state.activeTeamId;
      this.#renderScreen();
      return;
    }
    if(action==="calendar-tab"){
      this.#calendarPanelTab=clickable.dataset.value||"standings";
      this.#renderScreen();
      return;
    }
    if(action==="new-game-rfa-toggle"){
      this.#newGameSettings={...this.#newGameSettings,restrictedFreeAgencyEnabled:clickable.checked};
      this.#state.updateGameSettings(this.#newGameSettings);
      this.#renderScreen();
      return;
    }
    if(action==="new-game-cap-toggle"){
      this.#newGameSettings={...this.#newGameSettings,salaryCapEnabled:clickable.checked};
      this.#state.updateGameSettings(this.#newGameSettings);
      this.#renderScreen();
      return;
    }
    if(action==="new-game-coaches-toggle"){
      this.#newGameSettings={...this.#newGameSettings,coachesEnabled:clickable.checked};
      this.#state.updateGameSettings(this.#newGameSettings);
      this.#renderScreen();
      return;
    }
    if(action==="cap-release-toggle"){
      const playerId=clickable.dataset.playerId;
      if(this.#capReleasePlayerIds.has(playerId))this.#capReleasePlayerIds.delete(playerId);
      else if(playerId)this.#capReleasePlayerIds.add(playerId);
      this.#renderScreen();
      return;
    }
    if(action==="cap-release-auto"){
      this.#capReleasePlayerIds.clear();
      const view=this.#state.getSalaryCapComplianceView();
      let projected=view?.payrollRub||0;
      (view?.rows||[]).sort((left,right)=>right.score-left.score).forEach(row=>{
        if(projected<=view.capRub)return;
        this.#capReleasePlayerIds.add(row.player.id);
        projected-=row.salaryRub;
      });
      this.#renderScreen();
      return;
    }
    if(action==="cap-release-confirm"){
      if(this.#state.applySalaryCapComplianceReleases([...this.#capReleasePlayerIds])){
        this.#capComplianceOpen=false;
        this.#capReleasePlayerIds.clear();
        this.#userStore.saveState(this.#state.exportState());
      }
      this.#renderScreen();
      return;
    }
    if(action==="mark-notifications-read"){
      if(this.#state.markNotificationsRead()){
        this.#notificationVisibleCount=6;
        this.#userStore.saveState(this.#state.exportState());
        this.#renderScreen();
      }
      return;
    }
    if(action==="show-more-notifications"){
      this.#notificationVisibleCount+=10;
      this.#renderScreen();
      return;
    }
    if(action==="offer-sheet-popup-dismiss"){
      const offerId=clickable.dataset.offerId;
      if(offerId)this.#dismissedOfferSheetPopupIds.add(offerId);
      this.#renderScreen();
      return;
    }
    if(action==="season-contract-close"){
      this.#seasonContractDecisionOpen=false;
      this.#renderScreen();
      return;
    }
    if(action==="season-contract-filter"){
      this.#seasonContractDecisionFilter=clickable.dataset.filter||"pending";
      this.#renderScreen();
      return;
    }
    if(action==="season-contract-select"){
      this.#seasonContractDecisionSelectedPlayerId=clickable.dataset.playerId||null;
      this.#seasonContractDecisionSelectedRowKey=clickable.dataset.rowKey||this.#seasonContractDecisionSelectedPlayerId;
      this.#renderScreen();
      return;
    }
    if(action==="season-contract-years"){
      const playerId=clickable.dataset.playerId;
      const years=Number(clickable.dataset.years)||1;
      const current=this.#offerByPlayerId.get(playerId)||this.#getSeasonContractDefaultOffer(playerId)||{years:1,salaryRub:0};
      this.#offerByPlayerId.set(playerId,{...current,years});
      this.#seasonContractReleasePlayerIds.delete(playerId);
      this.#seasonContractQualifiedPlayerIds.delete(playerId);
      this.#renderScreen();
      return;
    }
    if(action==="season-contract-adjust-salary"){
      const playerId=clickable.dataset.playerId;
      const deltaMillion=Number(clickable.dataset.deltaMillion)||0;
      const current=this.#offerByPlayerId.get(playerId)||this.#getSeasonContractDefaultOffer(playerId);
      if(!playerId||!current)return;
      this.#offerByPlayerId.set(playerId,{...current,salaryRub:this.#roundSalaryRub(current.salaryRub+Math.round(deltaMillion*1000000))});
      this.#seasonContractReleasePlayerIds.delete(playerId);
      this.#seasonContractQualifiedPlayerIds.delete(playerId);
      this.#renderScreen();
      return;
    }
    if(action==="season-contract-market-salary"||action==="season-contract-demand-salary"){
      const playerId=clickable.dataset.playerId;
      const preview=this.#getSeasonDecisionRows(Object.fromEntries(this.#offerByPlayerId)).find(row=>row.playerId===playerId)?.preview;
      if(preview){
        const current=this.#offerByPlayerId.get(playerId)||preview.offer;
        const salaryRub=action==="season-contract-market-salary"?preview.marketSalary:preview.teamAdjustedDemand;
        this.#offerByPlayerId.set(playerId,{...current,salaryRub:this.#roundSalaryRub(salaryRub)});
        this.#seasonContractReleasePlayerIds.delete(playerId);
        this.#seasonContractQualifiedPlayerIds.delete(playerId);
      }
      this.#renderScreen();
      return;
    }
    if(action==="season-contract-submit-offer"){
      const playerId=clickable.dataset.playerId;
      const row=this.#buildSeasonContractDecisionView().rows.find(candidate=>candidate.playerId===playerId);
      const result=row?.rowType==="external"
        ? this.#state.queueExternalRightsOffer(playerId,this.#offerByPlayerId.get(playerId))
        : this.#state.submitActiveTeamNegotiation(playerId,this.#offerByPlayerId.get(playerId));
      if(result){
        if(result.decision==="salaryCap"){
          this.#seasonContractOutcomes.set(playerId,result.message);
          this.#renderScreen();
          return;
        }
        const label=result.decision==="accept"
          ?"Игрок согласился и продлен"
          :(result.decision==="counter"
            ?`Игрок просит изменить условия: ${result.counter?.summary||"контрпредложение"}`
            :(result.decision==="locked"?(result.reason||"Контракт уже продлен"):"Игрок отказался от предложения"));
        this.#seasonContractOutcomes.set(playerId,result.decision==="queued"?`Оффер отправлен. Ответ придет ${result.resolvesOn||"на следующей дате"}.`:label);
        if(result.decision==="counter"&&result.counter)this.#offerByPlayerId.set(playerId,result.counter);
        if(result.decision==="queued")this.#seasonExternalOfferPlayerIds.add(playerId);
        if(result.decision==="accept"||result.decision==="locked"||result.decision==="queued"){
          this.#seasonContractReleasePlayerIds.delete(playerId);
          this.#seasonContractQualifiedPlayerIds.delete(playerId);
          this.#userStore.saveState(this.#state.exportState());
        }
      }
      this.#renderScreen();
      return;
    }
    if(action==="season-contract-release"){
      const playerId=clickable.dataset.playerId;
      if(playerId){
        const row=this.#buildSeasonContractDecisionView().rows.find(candidate=>candidate.playerId===playerId);
        this.#seasonContractReleasePlayerIds.add(playerId);
        this.#seasonContractQualifiedPlayerIds.delete(playerId);
        this.#seasonContractOutcomes.set(playerId,(row?.ufaStatus==="OSA"||row?.ufaStatus==="ОСА")?"Игрок не будет квалифицирован и выйдет на рынок без компенсации.":"Игрок будет отпущен после окончания сезона");
      }
      this.#renderScreen();
      return;
    }
    if(action==="season-contract-undo-release"){
      const playerId=clickable.dataset.playerId;
      if(playerId){
        this.#seasonContractReleasePlayerIds.delete(playerId);
        this.#seasonContractQualifiedPlayerIds.delete(playerId);
      }
      this.#renderScreen();
      return;
    }
    if(action==="season-contract-qualify"){
      const playerId=clickable.dataset.playerId;
      if(playerId){
        this.#seasonContractQualifiedPlayerIds.add(playerId);
        this.#seasonContractReleasePlayerIds.delete(playerId);
        this.#seasonContractOutcomes.set(playerId,"Квалификационное предложение сделано. Права ОСА сохранятся.");
      }
      this.#renderScreen();
      return;
    }
    if(action==="season-contract-qualify-pending-osa"){
      const offers=Object.fromEntries(this.#offerByPlayerId);
      this.#state.getSeasonContractDecisionRows(offers)
        .filter(row=>!row.hasFutureContract&&!row.isRenewalLocked&&(row.ufaStatus==="OSA"||row.ufaStatus==="ОСА"))
        .forEach(row=>{
          this.#seasonContractQualifiedPlayerIds.add(row.playerId);
          this.#seasonContractReleasePlayerIds.delete(row.playerId);
        });
      this.#renderScreen();
      return;
    }
    if(action==="season-contract-release-pending"){
      const offers=Object.fromEntries(this.#offerByPlayerId);
      this.#state.getSeasonContractDecisionRows(offers)
        .filter(row=>!row.hasFutureContract&&!row.isRenewalLocked&&!this.#seasonContractQualifiedPlayerIds.has(row.playerId))
        .forEach(row=>{
          this.#seasonContractReleasePlayerIds.add(row.playerId);
          this.#seasonContractQualifiedPlayerIds.delete(row.playerId);
        });
      this.#renderScreen();
      return;
    }
    if(action==="season-contract-confirm"){
      const view=this.#buildSeasonContractDecisionView();
      if(view.pendingCount>0)return;
      this.#seasonContractDecisionOpen=false;
      const externalRightsOffers=[...this.#seasonExternalOfferPlayerIds].map(playerId=>({playerId,offer:this.#offerByPlayerId.get(playerId)})).filter(entry=>entry.offer);
      this.#state.advanceToNextSeason({releaseRightsPlayerIds:[...this.#seasonContractReleasePlayerIds],externalRightsOffers});
      this.#seasonContractReleasePlayerIds.clear();
      this.#seasonContractQualifiedPlayerIds.clear();
      this.#seasonExternalOfferPlayerIds.clear();
      this.#seasonContractOutcomes.clear();
      this.#userStore.saveState(this.#state.exportState());
      this.#renderScreen();
      return;
    }
    if(action==="sim-skip" && this.#matchPlayback){
      this.#matchPlayback.currentSecond=this.#matchPlayback.match.summary?.durationSeconds||3600;
      this.#matchPlayback.visibleEvents=[...(this.#matchPlayback.match.events||[])];
      this.#matchPlayback.isFinished=true;
      this.#stopMatchPlaybackTimer();
      this.#renderScreen();
      return;
    }
    if(action==="sim-close" && this.#matchPlayback){
      this.#stopMatchPlaybackTimer();
      this.#matchPlayback=null;
      this.#renderScreen();
      return;
    }
    if(action==="sim-view-stats" && this.#matchPlayback){
      this.#matchPlayback.view="stats";
      this.#matchPlayback.statsSort=this.#matchPlayback.statsSort||"points";
      this.#renderScreen();
      return;
    }
    if(action==="sim-view-events" && this.#matchPlayback){
      this.#matchPlayback.view="events";
      this.#renderScreen();
      return;
    }
    if(action==="sim-stats-sort" && this.#matchPlayback){
      this.#matchPlayback.view="stats";
      this.#matchPlayback.statsSort=clickable.dataset.sort||"points";
      this.#renderScreen();
      return;
    }
    if(action==="sim-select-player" && this.#matchPlayback){
      this.#matchPlayback.view="stats";
      this.#matchPlayback.selectedStatPlayerKey=clickable.dataset.playerKey||null;
      this.#renderScreen();
      return;
    }
    if(action==="open-negotiation"){
      this.#selectedNegotiationPlayerId=clickable.dataset.playerId;
      this.#outcomeByPlayerId.delete(this.#selectedNegotiationPlayerId);
      this.#renderScreen();
      return;
    }
    if(action==="trade-toggle-give"){
      const assetKey=clickable.dataset.assetKey||clickable.dataset.playerId;
      if(!assetKey)return;
      if(this.#tradeGivePlayerIds.has(assetKey))this.#tradeGivePlayerIds.delete(assetKey);
      else this.#tradeGivePlayerIds.add(assetKey);
      this.#tradeMessage="";
      this.#renderScreen();
      return;
    }
    if(action==="trade-select-team"){
      const teamId=clickable.dataset.teamId||"";
      this.#tradeTeamId=teamId||null;
      this.#tradeGivePlayerIds.clear();
      this.#tradeReceivePlayerIds.clear();
      this.#tradeMessage="";
      this.#renderScreen();
      return;
    }
    if(action==="trade-toggle-receive"){
      const assetKey=clickable.dataset.assetKey||clickable.dataset.playerId;
      if(!assetKey)return;
      if(this.#tradeReceivePlayerIds.has(assetKey))this.#tradeReceivePlayerIds.delete(assetKey);
      else this.#tradeReceivePlayerIds.add(assetKey);
      this.#tradeMessage="";
      this.#renderScreen();
      return;
    }
    if(action==="trade-clear"){
      this.#tradeGivePlayerIds.clear();
      this.#tradeReceivePlayerIds.clear();
      this.#tradeMessage="";
      this.#renderScreen();
      return;
    }
    if(action==="trade-submit" && this.#tradeTeamId){
      const result=this.#state.submitTradeWithTeam(this.#tradeTeamId,[...this.#tradeGivePlayerIds],[...this.#tradeReceivePlayerIds]);
      this.#tradeMessage=result?.message||"Не удалось обработать обмен.";
      if(result?.accepted){
        this.#tradeGivePlayerIds.clear();
        this.#tradeReceivePlayerIds.clear();
        this.#userStore.saveState(this.#state.exportState());
      }
      this.#renderScreen();
      return;
    }
    if(action==="coach-renew"){
      const result=this.#state.renewActiveTeamCoach(Number(clickable.dataset.years)||1,Number(clickable.dataset.factor)||1);
      this.#coachMessage=result?.message||"Не удалось продлить контракт тренера.";
      if(result?.accepted)this.#userStore.saveState(this.#state.exportState());
      this.#renderScreen();
      return;
    }
    if(action==="coach-terminate"){
      const result=this.#state.terminateActiveTeamCoach();
      this.#coachMessage=result?.message||"Не удалось расторгнуть контракт тренера.";
      if(result?.accepted)this.#userStore.saveState(this.#state.exportState());
      this.#renderScreen();
      return;
    }
    if(action==="coach-sign"){
      const result=this.#state.signFreeCoach(clickable.dataset.coachId,2,Number(clickable.dataset.factor)||1.05);
      this.#coachMessage=result?.message||"Не удалось подписать тренера.";
      if(result?.accepted)this.#userStore.saveState(this.#state.exportState());
      this.#renderScreen();
      return;
    }
    if(action==="select-roster-unit"){
      this.#activeRosterUnit=clickable.dataset.unit||"1";
      this.#renderScreen();
      return;
    }
    if(action==="move-to-reserve"){
      const lineIndex=Number(clickable.dataset.lineIndex);
      const slotIndex=Number(clickable.dataset.slotIndex);
      const moved=this.#state.moveActiveTeamLinePlayerToReserve(lineIndex,slotIndex);
      if(!moved)return;
      this.#userStore.saveState(this.#state.exportState());
      this.#renderScreen();
      return;
    }
    if(action==="close-negotiation"){
      this.#selectedNegotiationPlayerId=null;
      this.#renderScreen();
      return;
    }
    if(action==="set-offer-years"){
      const playerId=clickable.dataset.playerId;
      const years=Number(clickable.dataset.years)||1;
      const current=this.#offerByPlayerId.get(playerId)||{years:1,salaryRub:0};
      this.#offerByPlayerId.set(playerId,{...current,years});
      this.#renderScreen();
      return;
    }
    if(action==="send-to-junior"){
      const playerId=clickable.dataset.playerId;
      if(this.#state.sendPlayerToJunior(playerId)){
        this.#userStore.saveState(this.#state.exportState());
      }
      this.#renderScreen();
      return;
    }
    if(action==="promote-junior"){
      const playerId=clickable.dataset.playerId;
      if(this.#state.promoteJuniorPlayer(playerId)){
        this.#userStore.saveState(this.#state.exportState());
      }
      this.#renderScreen();
      return;
    }
    if(action==="sign-junior-main"){
      const playerId=clickable.dataset.playerId;
      if(this.#state.signJuniorPlayerToMain(playerId)){
        this.#userStore.saveState(this.#state.exportState());
      }
      this.#renderScreen();
      return;
    }
    if(action==="generate-junior-photo"){
      const playerId=clickable.dataset.playerId;
      await this.#generateJuniorPhoto(playerId);
      return;
    }
    if(action==="set-osa-years"){
      const offerId=clickable.dataset.offerId;
      const years=Number(clickable.dataset.years)||1;
      const current=this.#offerByPlayerId.get(offerId)||{years:1,salaryRub:0};
      this.#offerByPlayerId.set(offerId,{...current,years});
      this.#renderScreen();
      return;
    }
    if(action==="adjust-osa-salary"){
      const offerId=clickable.dataset.offerId;
      const deltaMillion=Number(clickable.dataset.deltaMillion)||0;
      if(!offerId||!deltaMillion)return;
      const current=this.#offerByPlayerId.get(offerId)||{years:1,salaryRub:0};
      const salaryRub=this.#roundSalaryRub(Math.max(500000,current.salaryRub+Math.round(deltaMillion*1000000)));
      this.#offerByPlayerId.set(offerId,{...current,salaryRub});
      this.#renderScreen();
      return;
    }
    if(action==="match-osa-offer"){
      const offerId=clickable.dataset.offerId;
      const result=this.#state.matchRestrictedRightsOffer(offerId,this.#offerByPlayerId.get(offerId));
      if(result?.accepted){
        this.#offerByPlayerId.delete(offerId);
        this.#dismissedOfferSheetPopupIds.delete(offerId);
        this.#userStore.saveState(this.#state.exportState());
      }
      this.#renderScreen();
      return;
    }
    if(action==="release-osa-rights"){
      const offerId=clickable.dataset.offerId;
      const result=this.#state.releaseRestrictedRightsOffer(offerId);
      if(result?.accepted){
        this.#offerByPlayerId.delete(offerId);
        this.#dismissedOfferSheetPopupIds.delete(offerId);
        this.#userStore.saveState(this.#state.exportState());
      }
      this.#renderScreen();
      return;
    }
    if(action==="set-offer-salary"){
      const playerId=clickable.dataset.playerId;
      const multiplier=Number(clickable.dataset.multiplier)||1;
      const preview=this.#activeTab==="freeAgents"
        ? this.#state.getFreeAgentSigningPreview(playerId,this.#offerByPlayerId.get(playerId))
        : this.#state.getActiveTeamNegotiationPreview(playerId,this.#offerByPlayerId.get(playerId));
      if(preview){
        const baseSalary=preview.teamAdjustedDemand||preview.marketSalary;
        const salaryRub=this.#roundSalaryRub(baseSalary*multiplier);
        const current=this.#offerByPlayerId.get(playerId)||{years:1,salaryRub};
        this.#offerByPlayerId.set(playerId,{...current,salaryRub});
      }
      this.#renderScreen();
      return;
    }
    if(action==="set-offer-demand-salary"){
      const playerId=clickable.dataset.playerId;
      const preview=this.#activeTab==="freeAgents"
        ? this.#state.getFreeAgentSigningPreview(playerId,this.#offerByPlayerId.get(playerId))
        : this.#state.getActiveTeamNegotiationPreview(playerId,this.#offerByPlayerId.get(playerId));
      if(preview){
        const demandSalary=preview.teamAdjustedDemand||preview.marketSalary;
        const current=this.#offerByPlayerId.get(playerId)||{years:1,salaryRub:demandSalary};
        this.#offerByPlayerId.set(playerId,{...current,salaryRub:this.#roundSalaryRub(demandSalary)});
      }
      this.#renderScreen();
      return;
    }
    if(action==="set-offer-market-salary"){
      const playerId=clickable.dataset.playerId;
      const preview=this.#activeTab==="freeAgents"
        ? this.#state.getFreeAgentSigningPreview(playerId,this.#offerByPlayerId.get(playerId))
        : this.#state.getActiveTeamNegotiationPreview(playerId,this.#offerByPlayerId.get(playerId));
      if(preview){
        const current=this.#offerByPlayerId.get(playerId)||{years:1,salaryRub:preview.marketSalary};
        this.#offerByPlayerId.set(playerId,{...current,salaryRub:this.#roundSalaryRub(preview.marketSalary)});
      }
      this.#renderScreen();
      return;
    }
    if(action==="adjust-offer-salary"){
      const playerId=clickable.dataset.playerId;
      const deltaMillion=Number(clickable.dataset.deltaMillion)||0;
      if(!playerId||!deltaMillion)return;
      const preview=this.#activeTab==="freeAgents"
        ? this.#state.getFreeAgentSigningPreview(playerId,this.#offerByPlayerId.get(playerId))
        : this.#state.getActiveTeamNegotiationPreview(playerId,this.#offerByPlayerId.get(playerId));
      if(preview){
        const baseSalary=preview.teamAdjustedDemand||preview.marketSalary;
        const current=this.#offerByPlayerId.get(playerId)||{years:1,salaryRub:baseSalary};
        const salaryRub=this.#roundSalaryRub(Math.max(500000,current.salaryRub+Math.round(deltaMillion*1000000)));
        this.#offerByPlayerId.set(playerId,{...current,salaryRub});
      }
      this.#renderScreen();
      return;
    }
    if(action==="submit-offer"){
      const playerId=clickable.dataset.playerId;
      const offer=this.#offerByPlayerId.get(playerId);
      const result=this.#activeTab==="freeAgents"
        ? this.#state.submitFreeAgentSigning(playerId,offer)
        : this.#state.submitActiveTeamNegotiation(playerId,offer);
      if(result){
        if(result.decision==="salaryCap"){
          this.#outcomeByPlayerId.set(playerId,result.message);
          this.#renderScreen();
          return;
        }
        const label=result.decision==="accept"
          ?"\u2705 \u0421\u043e\u0433\u043b\u0430\u0441\u0435\u043d"
          :(result.decision==="queued"
            ?`\ud83d\udfe6 \u041e\u0444\u0444\u0435\u0440 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d${result.resolvesOn?`: \u0440\u0435\u0448\u0435\u043d\u0438\u0435 ${result.resolvesOn}`:""}`
          :(result.decision==="counter"
            ?`\ud83d\udfe1 ${result.counter?.summary||"\u0425\u043e\u0447\u0435\u0442 \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0443\u0441\u043b\u043e\u0432\u0438\u044f"}`
            :(result.decision==="locked"
              ?"\u26d4 \u041a\u043e\u043d\u0442\u0440\u0430\u043a\u0442 \u0443\u0436\u0435 \u043f\u0440\u043e\u0434\u043b\u0435\u043d"
              :"\u274c \u041e\u0442\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442\u0441\u044f")));
        this.#outcomeByPlayerId.set(playerId,label);
        this.#userStore.saveState(this.#state.exportState());
        if(result.decision==="accept"||result.decision==="locked"||result.decision==="queued"){
          this.#selectedNegotiationPlayerId=null;
        }
      }
      this.#renderScreen();
      return;
    }
    if(action==="start-fantasy-draft" && this.#pendingTeamId){
      this.#draftIntroTeamId=this.#pendingTeamId;
      this.#persistDraftState();
      this.#renderScreen();
      return;
    }
    if(action==="draft-intro-start" && this.#draftIntroTeamId){
      this.#state.updateGameSettings(this.#newGameSettings);
      this.#startFantasyDraft(this.#draftIntroTeamId);
      this.#persistDraftState();
      this.#renderScreen();
      return;
    }
    if(action==="draft-intro-back"){
      this.#draftIntroTeamId=null;
      this.#userStore.clearDraft();
      this.#renderScreen();
      return;
    }
    if(action==="draft-sort" && this.#draftState){
      this.#draftState.sortBy=clickable.dataset.sort||"ovr";
      this.#persistDraftState();
      this.#renderScreen();
      return;
    }
    if(action==="draft-filter" && this.#draftState){
      this.#draftState.filterPosition=clickable.dataset.position||"ALL";
      this.#draftState.selectedPlayerId=null;
      this.#persistDraftState();
      this.#renderScreen();
      return;
    }
    if(action==="draft-select" && this.#draftState){
      const playerId=clickable.dataset.playerId;
      this.#draftState.selectedPlayerId=this.#draftState.selectedPlayerId===playerId?null:playerId;
      this.#draftMessage="";
      this.#persistDraftState();
      this.#renderScreen();
      return;
    }
    if(action==="draft-confirm-pick" && this.#draftState){
      const selectedPlayerId=this.#draftState.selectedPlayerId;
      if(!selectedPlayerId || !this.#draftState.service.hasAvailablePlayer(selectedPlayerId))return;
      const picked=this.#draftState.service.pickPlayer(selectedPlayerId);
      if(picked?.rejected){
        this.#draftMessage="Игрок не помещается под потолок зарплат. Выберите более дешевый вариант.";
      }else if(picked){
        this.#draftState.selectedPlayerId=null;
        this.#draftMessage="";
        this.#draftState.service.autoPickUntilUserTurn();
        this.#completeDraftIfReady();
        this.#persistDraftState();
      }
      this.#renderScreen();
      return;
    }
    if(action==="draft-cancel" && this.#draftState){
      this.#draftState=null;
      this.#draftIntroTeamId=null;
      this.#pendingTeamId=null;
      this.#userStore.clearDraft();
      this.#renderScreen();
      return;
    }
    if(action==="confirm-team" && this.#pendingTeamId){
      this.#state.updateGameSettings(this.#newGameSettings);
      this.#state.setActiveTeamId(this.#pendingTeamId);
      this.#teamStatsTeamId=this.#pendingTeamId;
      this.#pendingTeamId=null;
      this.#capReleasePlayerIds.clear();
      this.#capComplianceOpen=this.#state.needsSalaryCapCompliance();
      this.#userStore.saveState(this.#state.exportState());
      this.#renderScreen();
      return;
    }
    if(action==="cancel-team"){this.#pendingTeamId=null;this.#renderScreen();return;}
    if(clickable?.id==="resetBtn"){this.#resetGame();return;}
    if(clickable?.id!=="playBtn"||!this.#state.activeTeamId)return;
    if(this.#capComplianceOpen){
      this.#renderScreen();
      return;
    }
    if(this.#state.canAdvanceToNextSeason()){
      const offersByPlayerId=Object.fromEntries(this.#offerByPlayerId);
      const rows=this.#getSeasonDecisionRows(offersByPlayerId);
      if(rows.some(row=>!row.hasFutureContract)){
        const pendingKhlRow=rows.find(row=>row.rowType==="khl"&&!row.hasFutureContract&&!row.isRenewalLocked);
        const externalRow=rows.find(row=>row.rowType==="external");
        this.#seasonContractDecisionOpen=true;
        this.#seasonContractDecisionFilter=pendingKhlRow?"pending":"external";
        this.#seasonContractDecisionSelectedPlayerId=(pendingKhlRow||externalRow||rows[0])?.playerId||null;
        this.#renderScreen();
        return;
      }
      this.#state.advanceToNextSeason();
      this.#userStore.saveState(this.#state.exportState());
      this.#renderScreen();
      return;
    }
    if(this.#state.canAdvancePreseasonDay()){
      this.#state.advancePreseasonDay();
      this.#userStore.saveState(this.#state.exportState());
      this.#renderScreen();
      return;
    }
    if(this.#state.canStartSeason()){
      this.#state.startSeason();
      this.#userStore.saveState(this.#state.exportState());
      this.#renderScreen();
      return;
    }
    if(this.#matchPlayback)return;
    const day=this.#state.activeTeam?this.#state.getVisibleCalendarDay():this.#calendar.getCurrent();
    this.#state.activeTeam?this.#state.playDayForActiveTeam():this.#state.playDay();
    this.#userStore.saveState(this.#state.exportState());
    if(this.#state.lastMatch)this.#startMatchPlayback(this.#state.lastMatch);
    this.#renderScreen();
  }
  #startFantasyDraft(selectedTeamId){
    const allPlayers=this.#state.getFantasyDraftPlayerPool();
    const service=new FantasyDraftService(this.#teams,allPlayers,selectedTeamId,undefined,this.#state.getFantasyDraftSalaryCapOptions());
    this.#draftState={service,selectedTeamId,sortBy:"ovr",filterPosition:"ALL",selectedPlayerId:null};
    this.#draftIntroTeamId=null;
    this.#pendingTeamId=null;
    service.autoPickUntilUserTurn();
    this.#completeDraftIfReady();
  }
  #completeDraftIfReady(){
    if(!this.#draftState?.service.isComplete)return;
    const assignments=this.#draftState.service.getAssignments();
    this.#state.applyFantasyDraft(assignments);
    this.#state.setActiveTeamId(this.#draftState.selectedTeamId);
    this.#teamStatsTeamId=this.#draftState.selectedTeamId;
    this.#draftState=null;
    this.#userStore.saveState(this.#state.exportState());
    this.#userStore.clearDraft();
  }
  #restoreDraftState(){
    if(this.#state.activeTeamId)return;
    const saved=this.#userStore.loadDraft();
    if(!saved)return;
    if(saved.stage==="intro" && saved.selectedTeamId){
      const selectedTeam=this.#teams.find(team=>team.id===saved.selectedTeamId);
      if(selectedTeam){
        this.#newGameSettings={...this.#newGameSettings,...(saved.gameSettings||{})};
        this.#draftIntroTeamId=saved.selectedTeamId;
        return;
      }
      this.#userStore.clearDraft();
      return;
    }
    const selectedTeam=this.#teams.find(team=>team.id===saved.selectedTeamId);
    if(!selectedTeam){this.#userStore.clearDraft();return;}
    this.#newGameSettings={...this.#newGameSettings,...(saved.gameSettings||{})};
    this.#state.updateGameSettings(this.#newGameSettings);
    const allPlayers=this.#state.getAllPlayers();
    const service=FantasyDraftService.fromSnapshot(this.#teams,allPlayers,saved.service,this.#state.getFantasyDraftSalaryCapOptions());
    if(!service){this.#userStore.clearDraft();return;}
    this.#draftState={
      service,
      selectedTeamId:saved.selectedTeamId,
      sortBy:saved.sortBy||"ovr",
      filterPosition:saved.filterPosition||"ALL",
      selectedPlayerId:saved.selectedPlayerId||null
    };
    this.#completeDraftIfReady();
  }
  #persistDraftState(){
    if(this.#draftIntroTeamId){
      this.#userStore.saveDraft({
        stage:"intro",
        selectedTeamId:this.#draftIntroTeamId,
        gameSettings:this.#newGameSettings
      });
      return;
    }
    if(!this.#draftState){this.#userStore.clearDraft();return;}
    this.#userStore.saveDraft({
      stage:"live",
      selectedTeamId:this.#draftState.selectedTeamId,
      gameSettings:this.#newGameSettings,
      sortBy:this.#draftState.sortBy,
      filterPosition:this.#draftState.filterPosition,
      selectedPlayerId:this.#draftState.selectedPlayerId,
      service:this.#draftState.service.toSnapshot()
    });
  }
  #startMatchPlayback(match){
    this.#stopMatchPlaybackTimer();
    this.#matchPlayback={
      match,
      currentSecond:0,
      visibleEvents:[],
      eventIndex:0,
      isFinished:false,
      view:"events"
    };
    this.#matchPlaybackTimer=setInterval(()=>this.#tickMatchPlayback(),120);
  }
  #tickMatchPlayback(){
    if(!this.#matchPlayback)return;
    const duration=this.#matchPlayback.match.summary?.durationSeconds||3600;
    this.#matchPlayback.currentSecond=Math.min(duration,this.#matchPlayback.currentSecond+20);
    const events=this.#matchPlayback.match.events||[];
    while(this.#matchPlayback.eventIndex<events.length && (events[this.#matchPlayback.eventIndex].gameSecond??0)<=this.#matchPlayback.currentSecond){
      this.#matchPlayback.visibleEvents.push(events[this.#matchPlayback.eventIndex]);
      this.#matchPlayback.eventIndex++;
    }
    if(this.#matchPlayback.currentSecond>=duration){
      this.#matchPlayback.isFinished=true;
      this.#stopMatchPlaybackTimer();
    }
    this.#renderScreen();
  }
  #stopMatchPlaybackTimer(){
    if(this.#matchPlaybackTimer){
      clearInterval(this.#matchPlaybackTimer);
      this.#matchPlaybackTimer=null;
    }
  }
  #handleDragStart(event){
    if(!this.#state.activeTeam || this.#activeTab!=="roster")return;
    const draggable=event.target?.closest?.("[data-roster-slot='1']");
    if(!draggable)return;
    const slot=this.#readRosterSlotDataset(draggable.dataset);
    if(!slot)return;
    this.#dragRosterSlot=slot;
    if(event.dataTransfer){
      event.dataTransfer.effectAllowed="move";
      event.dataTransfer.setData("text/plain",JSON.stringify(slot));
    }
    draggable.classList.add("is-dragging");
  }
  #handleDragOver(event){
    if(!this.#dragRosterSlot)return;
    const target=event.target?.closest?.("[data-roster-slot='1'],[data-empty-slot='1']");
    if(!target)return;
    event.preventDefault();
    if(event.dataTransfer)event.dataTransfer.dropEffect="move";
  }
  #handleDrop(event){
    if(!this.#dragRosterSlot || !this.#state.activeTeam || this.#activeTab!=="roster")return;
    const targetEl=event.target?.closest?.("[data-roster-slot='1'],[data-empty-slot='1']");
    if(!targetEl)return;
    event.preventDefault();
    const targetSlot=this.#readRosterSlotDataset(targetEl.dataset);
    if(!targetSlot)return;
    const moved=this.#state.swapActiveTeamRosterSlots(this.#dragRosterSlot,targetSlot);
    this.#dragRosterSlot=null;
    if(!moved)return;
    this.#userStore.saveState(this.#state.exportState());
    this.#renderScreen();
  }
  #readRosterSlotDataset(dataset){
    if(!dataset)return null;
    if(dataset.emptySlot==="1"){
      const lineIndex=Number(dataset.lineIndex);
      const slotIndex=Number(dataset.slotIndex);
      if(!Number.isInteger(lineIndex)||!Number.isInteger(slotIndex))return null;
      return {kind:"line",lineIndex,slotIndex};
    }
    if(!dataset.rosterKind)return null;
    if(dataset.rosterKind==="reserve"){
      const index=Number(dataset.reserveIndex);
      return Number.isInteger(index)?{kind:"reserve",index}:null;
    }
    if(dataset.rosterKind==="line"){
      const lineIndex=Number(dataset.lineIndex);
      const slotIndex=Number(dataset.slotIndex);
      if(!Number.isInteger(lineIndex)||!Number.isInteger(slotIndex))return null;
      return {kind:"line",lineIndex,slotIndex};
    }
    return null;
  }
  async #generateJuniorPhoto(playerId){
    if(!playerId || this.#juniorPhotoStatusById.get(playerId)==="loading")return;
    const player=this.#state.getJuniorPhotoRequest(playerId);
    if(!player)return;
    const localPhotoUrl=this.#juniorPhotoPool.selectAvailablePhoto(player,this.#state.getUsedPlayerPhotoUrls());
    if(localPhotoUrl){
      this.#state.setJuniorPlayerPhoto(playerId,localPhotoUrl);
      this.#userStore.saveState(this.#state.exportState());
      this.#juniorPhotoStatusById.set(playerId,"ready");
      this.#juniorPhotoErrorById.delete(playerId);
      this.#renderScreen();
      return;
    }
    if(String(player.nationality||"").toUpperCase()==="RU"){
      this.#juniorPhotoStatusById.set(playerId,"error");
      this.#juniorPhotoErrorById.set(playerId,"Фото в базе закончились.");
      this.#renderScreen();
      return;
    }
    this.#juniorPhotoStatusById.set(playerId,"loading");
    this.#juniorPhotoErrorById.delete(playerId);
    this.#renderScreen();
    try{
      const response=await fetch("/api/junior-photo",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({player})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok || !data.photoUrl)throw new Error(data.error||"Не удалось сгенерировать фото.");
      if(this.#state.setJuniorPlayerPhoto(playerId,data.photoUrl)){
        this.#userStore.saveState(this.#state.exportState());
        this.#juniorPhotoStatusById.set(playerId,"ready");
        this.#juniorPhotoErrorById.delete(playerId);
      }else{
        this.#juniorPhotoStatusById.set(playerId,"error");
        this.#juniorPhotoErrorById.set(playerId,"Фото получено, но игрок уже не найден в молодежке.");
      }
    }catch(error){
      console.error(error);
      this.#juniorPhotoStatusById.set(playerId,"error");
      this.#juniorPhotoErrorById.set(playerId,error?.message||"Не удалось сгенерировать фото.");
    }
    this.#renderScreen();
  }
  #parseSalaryMillions(rawValue){
    const normalized=String(rawValue??"").trim().replace(",",".");
    const millions=Number(normalized);
    if(!Number.isFinite(millions)||millions<=0)return null;
    return this.#roundSalaryRub(millions*1000000);
  }
  #roundSalaryRub(value){
    const salary=Math.max(500000,Number(value)||0);
    const step=salary<=10000000?500000:1000000;
    return Math.round(salary/step)*step;
  }
  #resetGame(){this.#userStore.clearSave();window.location.reload()}
}
