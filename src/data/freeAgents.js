import { PlayerPosition } from "../models/PlayerPosition.js";
import { createSkater } from "./playerFactory.js";

const seasonId="season-1";
const freeAgentTeamInfo={id:null,name:"Свободные агенты"};

export const freeAgentProfiles=[
  {
    id:"fa-0001-4000-8000-000000000001",
    teamId:null,
    position:PlayerPosition.RW,
    identity:{
      firstName:"Антон",
      lastName:"Бурдасов",
      displayName:"Антон Бурдасов",
      birthDate:"1991-05-09",
      nationality:"RU",
      isGoalie:false,
      photoUrl:"./player-photo/burdasov.png",
      primaryPosition:PlayerPosition.RW,
      secondaryPositions:[]
    },
    attributes:{shot:77,speed:68,physical:73,defense:64,skill:73},
    potential:{potential:74,growthRate:0.3,peakAge:30,declineRate:0.5},
    condition:{fatigueScore:0,form:1.0,injuryUntilDay:null},
    career:{khlGamesPlayed:679,seasonsPlayed:17,reputation:100},
    affiliation:{teamId:null,contractId:null}
  },
  {
    id:"fa-0001-4000-8000-000000000002",
    teamId:null,
    position:PlayerPosition.LW,
    identity:{
      firstName:"Георгий",
      lastName:"Белоусов",
      displayName:"Георгий Белоусов",
      birthDate:"1990-12-26",
      nationality:"RU",
      isGoalie:false,
      photoUrl:"./player-photo/belousov.png",
      primaryPosition:PlayerPosition.LW,
      secondaryPositions:[]
    },
    attributes:{shot:65,speed:67,physical:72,defense:70,skill:72},
    potential:{potential:70,growthRate:0.3,peakAge:29,declineRate:0.3},
    condition:{fatigueScore:0,form:1.0,injuryUntilDay:null},
    career:{khlGamesPlayed:719,seasonsPlayed:17,reputation:100},
    affiliation:{teamId:null,contractId:null}
  },
  {
    id:"fa-0001-4000-8000-000000000003",
    teamId:null,
    position:PlayerPosition.RW,
    identity:{
      firstName:"Егор",
      lastName:"Фатеев",
      displayName:"Егор Фатеев",
      birthDate:"1997-11-03",
      nationality:"RU",
      isGoalie:false,
      photoUrl:"./player-photo/fateyev.png",
      primaryPosition:PlayerPosition.RW,
      secondaryPositions:[]
    },
    attributes:{shot:60,speed:64,physical:75,defense:68,skill:66},
    potential:{potential:73,growthRate:0.3,peakAge:28,declineRate:0.3},
    condition:{fatigueScore:0,form:1.0,injuryUntilDay:null},
    career:{khlGamesPlayed:204,seasonsPlayed:9,reputation:100},
    affiliation:{teamId:null,contractId:null}
  },
  {
    id:"fa-0001-4000-8000-000000000004",
    teamId:null,
    position:PlayerPosition.LW,
    identity:{
      firstName:"Сергей",
      lastName:"Шумаков",
      displayName:"Сергей Шумаков",
      birthDate:"1992-09-04",
      nationality:"RU",
      isGoalie:false,
      photoUrl:"./player-photo/shumakov.png",
      primaryPosition:PlayerPosition.LW,
      secondaryPositions:[]
    },
    attributes:{shot:70,speed:66,physical:68,defense:60,skill:72},
    potential:{potential:72,growthRate:0.3,peakAge:27,declineRate:0.3},
    condition:{fatigueScore:0,form:1.0,injuryUntilDay:null},
    career:{khlGamesPlayed:518,seasonsPlayed:14,reputation:100},
    affiliation:{teamId:null,contractId:null}
  }
];

export const createFreeAgents=()=>freeAgentProfiles.map(profile=>createSkater(
  freeAgentTeamInfo,
  profile.identity.firstName,
  profile.identity.lastName,
  profile.position,
  seasonId,
  profile
));
