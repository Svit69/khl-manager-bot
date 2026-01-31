import { PlayerPosition } from "../models/PlayerPosition.js";
export const playerProfiles=[
  {
    id:"d3c1f6c9-6a1a-4d7a-bb6c-5b8c7d5a1b22",
    teamId:"a4b4f445-2c38-41c5-a2d2-3aee8a0f5d2a",
    lineIndex:1,
    position:PlayerPosition.CTR,
    identity:{
      firstName:"Стефан",
      lastName:"Да Коста",
      displayName:"Стефан Да Коста",
      birthDate:"1989-07-11",
      nationality:"FR",
      isGoalie:false,
      photoUrl:"./player-photo/da-costa.png",
      primaryPosition:PlayerPosition.CTR,
      secondaryPositions:[PlayerPosition.LW]
    },
    attributes:{shot:82,speed:75,physical:73,defense:70,skill:88},
    potential:{potential:83,growthRate:0.8,peakAge:32,declineRate:0.8},
    condition:{fatigueScore:0,form:1.0,injuryUntilDay:null},
    career:{khlGamesPlayed:522,seasonsPlayed:11,reputation:80},
    affiliation:{contractId:"c1f92a68-2f3a-4a54-bf2c-0f0f23c1e8a9"}
  },
  {
    id:"f2a6b8c9-7d4e-4a2b-9f3c-1e2d3c4b5a6f",
    teamId:"a4b4f445-2c38-41c5-a2d2-3aee8a0f5d2a",
    lineIndex:1,
    position:PlayerPosition.RW,
    identity:{
      firstName:"Анатолий",
      lastName:"Голышев",
      displayName:"Анатолий Голышев",
      birthDate:"1995-02-14",
      nationality:"RU",
      isGoalie:false,
      photoUrl:"./player-photo/golyshev.png",
      primaryPosition:PlayerPosition.RW,
      secondaryPositions:[]
    },
    attributes:{shot:80,speed:77,physical:73,defense:72,skill:83},
    potential:{potential:80,growthRate:0.8,peakAge:27,declineRate:0.7},
    condition:{fatigueScore:0,form:1.0,injuryUntilDay:null},
    career:{khlGamesPlayed:568,seasonsPlayed:13,reputation:87},
    affiliation:{contractId:"d1f4a2c8-5b6d-4e12-9c2a-7f1b2c3d4e5f"}
  }
];
export const findPlayerProfile=(teamId,lineIndex,position)=>playerProfiles
  .find(p=>p.teamId===teamId&&p.lineIndex===lineIndex&&p.position===position);
