import { FantasyDraftService } from "../draft/FantasyDraftService.js";
export class AppController{
  #state;#calendar;#teams;#renderer;#userStore;#pendingTeamId=null;#activeTab="roster";
  #selectedNegotiationPlayerId=null;#offerByPlayerId=new Map();#outcomeByPlayerId=new Map();
  #tradeTeamId=null;#tradeGivePlayerIds=new Set();#tradeReceivePlayerIds=new Set();#tradeMessage="";
  #activeRosterUnit="1";
  #draftIntroTeamId=null;
  #draftState=null;
  #dragRosterSlot=null;
  #matchPlayback=null;
  #matchPlaybackTimer=null;
  #calendarPanelTab="standings";
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
    if(this.#state.activeTeam){
      this.#renderer.renderTeam(this.#state.activeTeam,this.#activeTab,this.#activeRosterUnit);
      this.#renderer.renderCalendar(dayInfo?.day||this.#calendar.currentDay,dayInfo,false,{
        tab:this.#calendarPanelTab,
        standings:this.#state.getStandingsTable(),
        scorers:this.#state.getTopScorers(10),
        schedule:this.#state.getCalendarScheduleRows()
      });
      this.#renderer.renderResetButton();
      if(this.#activeTab==="contracts"){
        this.#renderer.renderContracts(this.#state.getActiveTeamContractRows(),this.#buildNegotiationState());
      }else if(this.#activeTab==="freeAgents"){
        this.#renderer.renderFreeAgents(this.#state.getActiveTeamFreeAgentRows(),this.#buildNegotiationState());
      }else if(this.#activeTab==="trades"){
        this.#renderer.renderTrades(this.#buildTradeState());
      }else{
        this.#renderer.renderMyTeamRoster(this.#state.activeTeam);
      }
      if(this.#matchPlayback)this.#renderer.renderMatchSimulationPopup(this.#matchPlayback);
      return;
    }
    if(this.#draftState){
      const selectedTeam=this.#teams.find(team=>team.id===this.#draftState.selectedTeamId);
      if(selectedTeam){
        const draftView=this.#draftState.service.getView(this.#draftState.sortBy,this.#draftState.filterPosition);
        draftView.selectedPlayerId=this.#draftState.selectedPlayerId;
        this.#renderer.renderFantasyDraft(draftView,selectedTeam);
      }
      this.#renderer.renderCalendar(this.#calendar.currentDay,dayInfo,true,{
        tab:this.#calendarPanelTab,
        standings:this.#state.getStandingsTable(),
        scorers:this.#state.getTopScorers(10),
        schedule:this.#state.getCalendarScheduleRows()
      });
      this.#renderer.renderResetButton();
      return;
    }
    if(this.#draftIntroTeamId){
      const selectedTeam=this.#teams.find(team=>team.id===this.#draftIntroTeamId);
      if(selectedTeam)this.#renderer.renderFantasyDraftIntro(selectedTeam);
      this.#renderer.renderCalendar(this.#calendar.currentDay,dayInfo,true,{
        tab:this.#calendarPanelTab,
        standings:this.#state.getStandingsTable(),
        scorers:this.#state.getTopScorers(10),
        schedule:this.#state.getCalendarScheduleRows()
      });
      this.#renderer.renderResetButton();
      return;
    }
    this.#renderer.renderTeamSelection(this.#teams,this.#state.activeTeamId,this.#pendingTeamId);
    this.#renderer.renderCalendar(this.#calendar.currentDay,dayInfo,true,{
      tab:this.#calendarPanelTab,
      standings:this.#state.getStandingsTable(),
      scorers:this.#state.getTopScorers(10),
      schedule:this.#state.getCalendarScheduleRows()
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
  #buildTradeState(){
    const partners=this.#state.getTradePartnerTeams();
    const selectedTeam=partners.find(team=>team.id===this.#tradeTeamId)||null;
    const giveCandidates=this.#state.activeTeam?.getRoster()||[];
    const receiveCandidates=selectedTeam?.getRoster()||[];
    const giveIds=[...this.#tradeGivePlayerIds];
    const receiveIds=[...this.#tradeReceivePlayerIds];
    const evaluation=selectedTeam?this.#state.evaluateTradeWithTeam(selectedTeam.id,giveIds,receiveIds):null;
    return {
      partners,
      selectedTeamId:selectedTeam?.id||"",
      selectedTeam,
      giveCandidates,
      receiveCandidates,
      giveSelectedIds:this.#tradeGivePlayerIds,
      receiveSelectedIds:this.#tradeReceivePlayerIds,
      evaluation,
      message:this.#tradeMessage
    };
  }
  #handleClick(event){
    const clickable=event.target?.closest?.("[data-team-id],[data-tab],[data-action],#resetBtn,#playBtn");
    const teamId=clickable?.dataset?.teamId;
    if(teamId){this.#pendingTeamId=teamId;this.#renderScreen();return;}
    const tab=clickable?.dataset?.tab;
    if(tab){
      this.#activeTab=tab;
      if(tab!=="trades"){this.#tradeMessage="";}
      this.#selectedNegotiationPlayerId=null;
      this.#renderScreen();
      return;
    }
    const action=clickable?.dataset?.action;
    if(action==="calendar-tab"){
      this.#calendarPanelTab=clickable.dataset.value||"standings";
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
      const playerId=clickable.dataset.playerId;
      if(!playerId)return;
      if(this.#tradeGivePlayerIds.has(playerId))this.#tradeGivePlayerIds.delete(playerId);
      else this.#tradeGivePlayerIds.add(playerId);
      this.#tradeMessage="";
      this.#renderScreen();
      return;
    }
    if(action==="trade-toggle-receive"){
      const playerId=clickable.dataset.playerId;
      if(!playerId)return;
      if(this.#tradeReceivePlayerIds.has(playerId))this.#tradeReceivePlayerIds.delete(playerId);
      else this.#tradeReceivePlayerIds.add(playerId);
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
        const label=result.decision==="accept"
          ?"\u2705 \u0421\u043e\u0433\u043b\u0430\u0441\u0435\u043d"
          :(result.decision==="counter"
            ?`\ud83d\udfe1 ${result.counter?.summary||"\u0425\u043e\u0447\u0435\u0442 \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0443\u0441\u043b\u043e\u0432\u0438\u044f"}`
            :(result.decision==="locked"
              ?"\u26d4 \u041a\u043e\u043d\u0442\u0440\u0430\u043a\u0442 \u0443\u0436\u0435 \u043f\u0440\u043e\u0434\u043b\u0435\u043d"
              :"\u274c \u041e\u0442\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442\u0441\u044f"));
        this.#outcomeByPlayerId.set(playerId,label);
        this.#userStore.saveState(this.#state.exportState());
        if(result.decision==="accept"||result.decision==="locked"){
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
      this.#persistDraftState();
      this.#renderScreen();
      return;
    }
    if(action==="draft-confirm-pick" && this.#draftState){
      const selectedPlayerId=this.#draftState.selectedPlayerId;
      if(!selectedPlayerId || !this.#draftState.service.hasAvailablePlayer(selectedPlayerId))return;
      const picked=this.#draftState.service.pickPlayer(selectedPlayerId);
      if(picked){
        this.#draftState.selectedPlayerId=null;
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
      this.#state.setActiveTeamId(this.#pendingTeamId);
      this.#pendingTeamId=null;
      this.#userStore.saveState(this.#state.exportState());
      this.#renderScreen();
      return;
    }
    if(action==="cancel-team"){this.#pendingTeamId=null;this.#renderScreen();return;}
    if(clickable?.id==="resetBtn"){this.#resetGame();return;}
    if(clickable?.id!=="playBtn"||this.#calendar.isFinished()||!this.#state.activeTeamId)return;
    if(this.#matchPlayback)return;
    const day=this.#state.activeTeam?this.#state.getVisibleCalendarDay():this.#calendar.getCurrent();
    this.#state.activeTeam?this.#state.playDayForActiveTeam():this.#state.playDay();
    this.#userStore.saveState(this.#state.exportState());
    if(day?.match && this.#state.lastMatch)this.#startMatchPlayback(this.#state.lastMatch);
    this.#renderScreen();
  }
  #startFantasyDraft(selectedTeamId){
    const allPlayers=this.#state.getAllPlayers();
    const service=new FantasyDraftService(this.#teams,allPlayers,selectedTeamId,20);
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
        this.#draftIntroTeamId=saved.selectedTeamId;
        return;
      }
      this.#userStore.clearDraft();
      return;
    }
    const selectedTeam=this.#teams.find(team=>team.id===saved.selectedTeamId);
    if(!selectedTeam){this.#userStore.clearDraft();return;}
    const allPlayers=this.#state.getAllPlayers();
    const service=FantasyDraftService.fromSnapshot(this.#teams,allPlayers,saved.service);
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
        selectedTeamId:this.#draftIntroTeamId
      });
      return;
    }
    if(!this.#draftState){this.#userStore.clearDraft();return;}
    this.#userStore.saveDraft({
      stage:"live",
      selectedTeamId:this.#draftState.selectedTeamId,
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
  #parseSalaryMillions(rawValue){
    const normalized=String(rawValue??"").trim().replace(",",".");
    const millions=Number(normalized);
    if(!Number.isFinite(millions)||millions<=0)return null;
    return this.#roundSalaryRub(millions*1000000);
  }
  #roundSalaryRub(value){
    return Math.max(500000,Math.round((Number(value)||0)/500000)*500000);
  }
  #resetGame(){this.#userStore.clearSave();window.location.reload()}
}
