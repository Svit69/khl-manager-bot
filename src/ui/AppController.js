import { FantasyDraftService } from "../draft/FantasyDraftService.js";
export class AppController{
  #state;#calendar;#teams;#renderer;#userStore;#pendingTeamId=null;#activeTab="roster";
  #selectedNegotiationPlayerId=null;#offerByPlayerId=new Map();#outcomeByPlayerId=new Map();
  #draftState=null;
  constructor(state,calendar,teams,renderer,userStore){
    this.#state=state;this.#calendar=calendar;this.#teams=teams;this.#renderer=renderer;this.#userStore=userStore;
  }
  initialize(){
    this.#renderer.renderUser(this.#userStore.loadUser());
    this.#restoreDraftState();
    this.#renderScreen();
    document.addEventListener("click",event=>this.#handleClick(event));
  }
  #renderScreen(){
    const dayInfo=this.#calendar.getCurrent();
    if(this.#state.activeTeam){
      this.#renderer.renderTeam(this.#state.activeTeam,this.#activeTab);
      this.#renderer.renderCalendar(this.#calendar.currentDay,dayInfo,false);
      this.#renderer.renderResetButton();
      if(this.#activeTab==="contracts"){
        this.#renderer.renderContracts(this.#state.getActiveTeamContractRows(),this.#buildNegotiationState());
      }else{
        this.#renderer.renderMyTeamRoster(this.#state.activeTeam);
      }
      return;
    }
    if(this.#draftState){
      const selectedTeam=this.#teams.find(team=>team.id===this.#draftState.selectedTeamId);
      if(selectedTeam){
        const draftView=this.#draftState.service.getView(this.#draftState.sortBy,this.#draftState.filterPosition);
        draftView.selectedPlayerId=this.#draftState.selectedPlayerId;
        this.#renderer.renderFantasyDraft(draftView,selectedTeam);
      }
      this.#renderer.renderCalendar(this.#calendar.currentDay,dayInfo,true);
      this.#renderer.renderResetButton();
      return;
    }
    this.#renderer.renderTeamSelection(this.#teams,this.#state.activeTeamId);
    this.#renderer.renderCalendar(this.#calendar.currentDay,dayInfo,true);
    this.#renderer.renderResetButton();
    this.#renderer.renderMatch(this.#state.lastMatch,this.#state.seasonStats);
    if(this.#pendingTeamId){
      const team=this.#teams.find(item=>item.id===this.#pendingTeamId);
      if(team)this.#renderer.renderConfirmSelection(team);
    }
  }
  #buildNegotiationState(){
    if(!this.#selectedNegotiationPlayerId)return null;
    const offer=this.#offerByPlayerId.get(this.#selectedNegotiationPlayerId)||null;
    const preview=this.#state.getActiveTeamNegotiationPreview(this.#selectedNegotiationPlayerId,offer);
    if(!preview)return null;
    const outcome=this.#outcomeByPlayerId.get(this.#selectedNegotiationPlayerId)||null;
    this.#offerByPlayerId.set(this.#selectedNegotiationPlayerId,preview.offer);
    return {playerId:this.#selectedNegotiationPlayerId,preview,offer:preview.offer,outcome};
  }
  #handleClick(event){
    const clickable=event.target?.closest?.("[data-team-id],[data-tab],[data-action],#resetBtn,#playBtn");
    const teamId=clickable?.dataset?.teamId;
    if(teamId){this.#pendingTeamId=teamId;this.#renderScreen();return;}
    const tab=clickable?.dataset?.tab;
    if(tab){this.#activeTab=tab;this.#renderScreen();return;}
    const action=clickable?.dataset?.action;
    if(action==="open-negotiation"){
      this.#selectedNegotiationPlayerId=clickable.dataset.playerId;
      this.#outcomeByPlayerId.delete(this.#selectedNegotiationPlayerId);
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
      const preview=this.#state.getActiveTeamNegotiationPreview(playerId,this.#offerByPlayerId.get(playerId));
      if(preview){
        const salaryRub=Math.round(preview.marketSalary*multiplier);
        const current=this.#offerByPlayerId.get(playerId)||{years:1,salaryRub};
        this.#offerByPlayerId.set(playerId,{...current,salaryRub});
      }
      this.#renderScreen();
      return;
    }
    if(action==="submit-offer"){
      const playerId=clickable.dataset.playerId;
      const offer=this.#offerByPlayerId.get(playerId);
      const result=this.#state.submitActiveTeamNegotiation(playerId,offer);
      if(result){
        const label=result.decision==="accept"?"✅ Согласен":(result.decision==="counter"?"🟡 Просит больше":(result.decision==="locked"?"⛔ Контракт уже продлен":"❌ Отказывается"));
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
      this.#startFantasyDraft(this.#pendingTeamId);
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
    this.#state.playDay();
    this.#userStore.saveState(this.#state.exportState());
    this.#renderScreen();
  }
  #startFantasyDraft(selectedTeamId){
    const allPlayers=this.#state.getAllPlayers();
    const service=new FantasyDraftService(this.#teams,allPlayers,selectedTeamId,20);
    this.#draftState={service,selectedTeamId,sortBy:"ovr",filterPosition:"ALL",selectedPlayerId:null};
    this.#pendingTeamId=null;
    service.autoPickUntilUserTurn();
    this.#completeDraftIfReady();
    this.#persistDraftState();
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
    if(!this.#draftState){this.#userStore.clearDraft();return;}
    this.#userStore.saveDraft({
      selectedTeamId:this.#draftState.selectedTeamId,
      sortBy:this.#draftState.sortBy,
      filterPosition:this.#draftState.filterPosition,
      selectedPlayerId:this.#draftState.selectedPlayerId,
      service:this.#draftState.service.toSnapshot()
    });
  }
  #resetGame(){this.#userStore.clearSave();window.location.reload()}
}
