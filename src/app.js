import { createTeams } from "./data/seed.js";
import { teamsData } from "./data/teams.js";
import { SeasonCalendar } from "./calendar/SeasonCalendar.js";
import { UserStore } from "./storage/UserStore.js";
import { Renderer } from "./ui/Renderer.js";
import { AppState } from "./state/AppState.js";
import { AppController } from "./ui/AppController.js";
const userStore=new UserStore();
const teams=createTeams(teamsData);
const calendar=new SeasonCalendar(teams);
const state=new AppState(teams,calendar);
state.importState(userStore.loadSave());
const renderer=new Renderer();
const controller=new AppController(state,calendar,teams,renderer,userStore);
controller.initialize();
if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js")}
