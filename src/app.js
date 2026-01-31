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
renderer.renderTeam(teams[0]);
const render=()=>{
  const dayInfo=calendar.getCurrent();
  renderer.renderCalendar(calendar.currentDay,dayInfo);
  renderer.renderMatch(state.lastMatch, state.seasonStats);
};
render();
document.addEventListener("click",e=>{
  if(e.target?.id!=="playBtn")return;
  if(calendar.isFinished())return;
  state.playDay();
  userStore.saveState(state.exportState());
  render();
});
if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js")}
