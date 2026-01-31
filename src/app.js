import { createTeams } from "./data/seed.js";
import { teamsData } from "./data/teams.js";
import { SeasonCalendar } from "./calendar/SeasonCalendar.js";
import { UserStore } from "./storage/UserStore.js";
import { Renderer } from "./ui/Renderer.js";
import { AppState } from "./state/AppState.js";
const userStore=new UserStore();
const user=userStore.loadUser();
const teams=createTeams(teamsData);
const calendar=new SeasonCalendar(teams);
const state=new AppState(teams,calendar);
state.importState(userStore.loadSave());
const renderer=new Renderer();
renderer.renderUser(user);
const render=()=>{
  const dayInfo=calendar.getCurrent();
  if(state.activeTeam)renderer.renderTeam(state.activeTeam);
  else renderer.renderTeamSelection(teams,state.activeTeamId);
  renderer.renderCalendar(calendar.currentDay,dayInfo,!state.activeTeamId);
  renderer.renderMatch(state.lastMatch, state.seasonStats);
};
render();
document.addEventListener("click",e=>{
  const teamId=e.target?.dataset?.teamId;
  if(teamId){
    state.setActiveTeamId(teamId);
    userStore.saveState(state.exportState());
    render();
    return;
  }
  if(e.target?.id!=="playBtn")return;
  if(calendar.isFinished())return;
  if(!state.activeTeamId)return;
  state.playDay();
  userStore.saveState(state.exportState());
  render();
});
if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js")}
