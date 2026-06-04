import { createTeams } from "./data/seed.js";
import { createFreeAgents } from "./data/freeAgents.js";
import { createExternalPlayers } from "./data/externalPlayers.js";
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
const seasonStartYear=playerContracts.reduce((minYear,contract)=>{
  const year=parseSeasonStart(contract.season);
  return year?Math.min(minYear,year):minYear;
},Infinity);
const calendar=new SeasonCalendar(teams,Number.isFinite(seasonStartYear)?seasonStartYear:2025);
const state=new AppState(teams,calendar,playerContracts,freeAgents,externalPlayers);
state.importState(userStore.loadSave());

const renderer=new Renderer();
const controller=new AppController(state,calendar,teams,renderer,userStore);
controller.initialize();

if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js")}
