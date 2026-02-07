export class AppController{
  #state;#calendar;#teams;#renderer;#userStore;#pendingTeamId=null;#activeTab="roster";#selectedNegotiationPlayerId=null;
  constructor(state,calendar,teams,renderer,userStore){
    this.#state=state;this.#calendar=calendar;this.#teams=teams;this.#renderer=renderer;this.#userStore=userStore;
  }
  initialize(){this.#renderer.renderUser(this.#userStore.loadUser());this.#renderScreen();document.addEventListener("click",e=>this.#handleClick(e));}
  #renderScreen(){
    const dayInfo=this.#calendar.getCurrent();
    if(this.#state.activeTeam){
      this.#renderer.renderTeam(this.#state.activeTeam,this.#activeTab);this.#renderer.renderCalendar(this.#calendar.currentDay,dayInfo,false);
      this.#renderer.renderResetButton();
      if(this.#activeTab==="contracts")this.#renderer.renderContracts(this.#state.getActiveTeamContractRows(),this.#selectedNegotiationPlayerId);
      else this.#renderer.renderMyTeamRoster(this.#state.activeTeam);
      return;
    }
    this.#renderer.renderTeamSelection(this.#teams,this.#state.activeTeamId);this.#renderer.renderCalendar(this.#calendar.currentDay,dayInfo,true);
    this.#renderer.renderResetButton();this.#renderer.renderMatch(this.#state.lastMatch,this.#state.seasonStats);
    if(this.#pendingTeamId){const team=this.#teams.find(t=>t.id===this.#pendingTeamId);if(team)this.#renderer.renderConfirmSelection(team);}
  }
  #handleClick(e){
    const clickable=e.target?.closest?.("[data-team-id],[data-tab],[data-action],#resetBtn,#playBtn");
    const teamId=clickable?.dataset?.teamId;if(teamId){this.#pendingTeamId=teamId;this.#renderScreen();return;}
    const tab=clickable?.dataset?.tab;if(tab){this.#activeTab=tab;this.#selectedNegotiationPlayerId=null;this.#renderScreen();return;}
    const action=clickable?.dataset?.action;
    if(action==="open-negotiation"){this.#selectedNegotiationPlayerId=clickable.dataset.playerId;this.#renderScreen();return;}
    if(action==="negotiate-extend"){
      this.#state.extendActiveTeamPlayerContract(clickable.dataset.playerId,clickable.dataset.mode);
      this.#userStore.saveState(this.#state.exportState());this.#renderScreen();return;
    }
    if(action==="confirm-team" && this.#pendingTeamId){this.#state.setActiveTeamId(this.#pendingTeamId);this.#pendingTeamId=null;this.#userStore.saveState(this.#state.exportState());this.#renderScreen();return;}
    if(action==="cancel-team"){this.#pendingTeamId=null;this.#renderScreen();return;}
    if(clickable?.id==="resetBtn"){this.#resetGame();return;}
    if(clickable?.id!=="playBtn"||this.#calendar.isFinished()||!this.#state.activeTeamId)return;
    this.#state.playDay();this.#userStore.saveState(this.#state.exportState());this.#renderScreen();
  }
  #resetGame(){this.#userStore.clearSave();window.location.reload()}
}
