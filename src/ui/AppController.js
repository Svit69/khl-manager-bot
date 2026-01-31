import { AppState } from "../state/AppState.js";
export class AppController{
  #state;#calendar;#teams;#renderer;#userStore;#pendingTeamId=null;
  constructor(state,calendar,teams,renderer,userStore){
    this.#state=state;this.#calendar=calendar;this.#teams=teams;this.#renderer=renderer;this.#userStore=userStore;
  }
  initialize(){
    this.#renderer.renderUser(this.#userStore.loadUser());
    this.#renderScreen();
    document.addEventListener("click",e=>this.#handleClick(e));
  }
  #renderScreen(){
    const dayInfo=this.#calendar.getCurrent();
    if(this.#state.activeTeam){
      this.#renderer.renderTeam(this.#state.activeTeam);
      this.#renderer.renderCalendar(this.#calendar.currentDay,dayInfo,false);
      this.#renderer.renderResetButton();
      this.#renderer.renderMatch(this.#state.lastMatch,this.#state.seasonStats);
      this.#renderer.renderMyTeamRoster(this.#state.activeTeam);
      return;
    }
    this.#renderer.renderTeamSelection(this.#teams,this.#state.activeTeamId);
    this.#renderer.renderCalendar(this.#calendar.currentDay,dayInfo,true);
    this.#renderer.renderResetButton();
    this.#renderer.renderMatch(this.#state.lastMatch,this.#state.seasonStats);
    if(this.#pendingTeamId){
      const team=this.#teams.find(t=>t.id===this.#pendingTeamId);
      if(team)this.#renderer.renderConfirmSelection(team);
    }
  }
  #handleClick(e){
    const teamId=e.target?.dataset?.teamId;
    if(teamId){this.#pendingTeamId=teamId;this.#renderScreen();return;}
    const action=e.target?.dataset?.action;
    if(action==="confirm-team" && this.#pendingTeamId){
      this.#state.setActiveTeamId(this.#pendingTeamId);this.#pendingTeamId=null;
      this.#userStore.saveState(this.#state.exportState());this.#renderScreen();return;
    }
    if(action==="cancel-team"){this.#pendingTeamId=null;this.#renderScreen();return;}
    if(e.target?.id==="resetBtn"){this.#resetGame();return;}
    if(e.target?.id!=="playBtn"||this.#calendar.isFinished()||!this.#state.activeTeamId)return;
    this.#state.playDay();this.#userStore.saveState(this.#state.exportState());this.#renderScreen();
  }
  #resetGame(){
    this.#userStore.clearSave();
    window.location.reload();
  }
}
