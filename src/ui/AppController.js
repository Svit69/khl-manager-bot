export class AppController{
  #state;#calendar;#teams;#renderer;#userStore;#pendingTeamId=null;#activeTab="roster";
  #selectedNegotiationPlayerId=null;#offerByPlayerId=new Map();#outcomeByPlayerId=new Map();
  constructor(state,calendar,teams,renderer,userStore){
    this.#state=state;this.#calendar=calendar;this.#teams=teams;this.#renderer=renderer;this.#userStore=userStore;
  }
  initialize(){this.#renderer.renderUser(this.#userStore.loadUser());this.#renderScreen();document.addEventListener("click",e=>this.#handleClick(e));}
  #renderScreen(){
    const dayInfo=this.#calendar.getCurrent();
    if(this.#state.activeTeam){
      this.#renderer.renderTeam(this.#state.activeTeam,this.#activeTab);this.#renderer.renderCalendar(this.#calendar.currentDay,dayInfo,false);
      this.#renderer.renderResetButton();
      if(this.#activeTab==="contracts"){
        const negotiation=this.#buildNegotiationState();
        this.#renderer.renderContracts(this.#state.getActiveTeamContractRows(),negotiation);
      } else {
        this.#renderer.renderMyTeamRoster(this.#state.activeTeam);
      }
      return;
    }
    this.#renderer.renderTeamSelection(this.#teams,this.#state.activeTeamId);this.#renderer.renderCalendar(this.#calendar.currentDay,dayInfo,true);
    this.#renderer.renderResetButton();this.#renderer.renderMatch(this.#state.lastMatch,this.#state.seasonStats);
    if(this.#pendingTeamId){const team=this.#teams.find(t=>t.id===this.#pendingTeamId);if(team)this.#renderer.renderConfirmSelection(team);}
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
  #handleClick(e){
    const clickable=e.target?.closest?.("[data-team-id],[data-tab],[data-action],#resetBtn,#playBtn");
    const teamId=clickable?.dataset?.teamId;if(teamId){this.#pendingTeamId=teamId;this.#renderScreen();return;}
    const tab=clickable?.dataset?.tab;if(tab){this.#activeTab=tab;this.#renderScreen();return;}
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
        const current=this.#offerByPlayerId.get(playerId)||{years:1,salaryRub:salaryRub};
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
        const label=result.decision==="accept"?"✅ Согласен":(result.decision==="counter"?"🟡 Просит больше":"❌ Отказывается");
        this.#outcomeByPlayerId.set(playerId,label);
        this.#userStore.saveState(this.#state.exportState());
      }
      this.#renderScreen();
      return;
    }
    if(action==="confirm-team" && this.#pendingTeamId){this.#state.setActiveTeamId(this.#pendingTeamId);this.#pendingTeamId=null;this.#userStore.saveState(this.#state.exportState());this.#renderScreen();return;}
    if(action==="cancel-team"){this.#pendingTeamId=null;this.#renderScreen();return;}
    if(clickable?.id==="resetBtn"){this.#resetGame();return;}
    if(clickable?.id!=="playBtn"||this.#calendar.isFinished()||!this.#state.activeTeamId)return;
    this.#state.playDay();this.#userStore.saveState(this.#state.exportState());this.#renderScreen();
  }
  #resetGame(){this.#userStore.clearSave();window.location.reload()}
}
