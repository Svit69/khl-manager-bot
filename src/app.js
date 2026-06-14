import { createTeams } from "./data/seed.js";
import { createFreeAgents } from "./data/freeAgents.js";
import { createExternalPlayers } from "./data/externalPlayers.js";
import { createCoaches } from "./data/coaches/createCoaches.js";
import { teamsData } from "./data/teams.js";
import { playerContracts } from "./data/contracts.js";
import { SeasonCalendar } from "./calendar/SeasonCalendar.js";
import { parseSeasonStart } from "./contracts/SeasonUtils.js";
import { UserStore } from "./storage/UserStore.js";
import { Renderer } from "./ui/Renderer.js";
import { AppState } from "./state/AppState.js";
import { AppController } from "./ui/AppController.js";

const userStore=new UserStore();
const teams=createTeams(teamsData);
const freeAgents=createFreeAgents();
const externalPlayers=createExternalPlayers();
const coaches=createCoaches(teams);
const seasonStartYear=playerContracts.reduce((minYear,contract)=>{
  const year=parseSeasonStart(contract.season);
  return year?Math.min(minYear,year):minYear;
},Infinity);
const calendar=new SeasonCalendar(teams,Number.isFinite(seasonStartYear)?seasonStartYear:2025);
const state=new AppState(teams,calendar,playerContracts,freeAgents,externalPlayers,coaches);
state.importState(userStore.loadSave());

const renderer=new Renderer();
const controller=new AppController(state,calendar,teams,renderer,userStore);
controller.initialize();

if("serviceWorker" in navigator){
  const refreshKey="khl-sw-refresh-v158";
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(sessionStorage.getItem(refreshKey)==="1")return;
    sessionStorage.setItem(refreshKey,"1");
    window.location.reload();
  });
  navigator.serviceWorker.register("./sw.js").then(registration=>registration.update()).catch(()=>{});
}
