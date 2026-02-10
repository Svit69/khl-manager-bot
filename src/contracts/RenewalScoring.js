import { getTermMod, getTermPreference, termPreferenceLabel } from "./TermPreference.js";
import { calculateAge, clamp } from "./SeasonUtils.js";
const MIN_GAMES_FOR_ROLE_EVAL=5;
const MIN_TEAM_GAMES_FOR_PERFORMANCE=5;
const isDomesticNationality=n=>{
  const s=String(n||"").trim().toLowerCase();
  return s==="россия"||s==="ru"||s==="rus"||s==="russia";
};
const isLegioner=player=>!isDomesticNationality(player?.identity?.nationality);
const getLineInfo=(team,player)=>{
  for(let i=0;i<team.lines.length;i++){
    const line=team.lines[i];
    const idx=line.players.indexOf(player);
    if(idx!==-1){
      return {lineIndex:i+1,slotPosition:line.positions?.[idx]||null};
    }
  }
  return {lineIndex:null,slotPosition:null};
};
const roleFitScore=(player,team,reasons)=>{
  const playerGames=player.seasonStats?.games||0;
  if(playerGames<MIN_GAMES_FOR_ROLE_EVAL){
    reasons.push({text:`Недостаточно матчей для оценки роли (нужно ${MIN_GAMES_FOR_ROLE_EVAL})`,value:0});
    return 0;
  }
  let score=0;
  const expected=player.expectedLineIndex||null;
  const {lineIndex,slotPosition}=getLineInfo(team,player);
  if(expected&&lineIndex){
    if(lineIndex===expected){score+=10;reasons.push({text:"Играет в ожидаемом звене",value:10});}
    else if(lineIndex>expected){score-=10;reasons.push({text:"Играет ниже ожиданий",value:-10});}
    else {score+=5;reasons.push({text:"Играет выше ожиданий",value:5});}
  }
  if(slotPosition && slotPosition!==player.identity?.primaryPosition){
    const secondary=player.identity?.secondaryPositions||[];
    if(secondary.includes(slotPosition)){score-=5;reasons.push({text:"Стабильно на доп. позиции",value:-5});}
  }
  return score;
};
const teamPerformanceScore=(context,reasons)=>{
  const teamGamesPlayed=context?.teamGamesPlayed??0;
  if(teamGamesPlayed<MIN_TEAM_GAMES_FOR_PERFORMANCE){
    reasons.push({text:`Недостаточно командных матчей для оценки таблицы (нужно ${MIN_TEAM_GAMES_FOR_PERFORMANCE})`,value:0});
    return 0;
  }
  const rank=context?.teamRank??null;
  if(rank===null){reasons.push({text:"Нет данных по таблице",value:0});return 0;}
  if(rank<=8){reasons.push({text:`Команда в топ-8 (место ${rank})`,value:8});return 8;}
  reasons.push({text:`Команда вне топ-8 (место ${rank})`,value:-8});
  return -8;
};
const personalPerformanceScore=(player,reasons)=>{
  const games=player.seasonStats?.games||0;
  if(games<5){reasons.push({text:"Недостаточно матчей для оценки",value:0});return 0;}
  const points=(player.seasonStats?.goals||0)+(player.seasonStats?.assists||0);
  const ppg=points/games;
  const expected=player.ovr/120;
  if(ppg>=expected+0.2){reasons.push({text:"Превышает ожидания роли",value:8});return 8;}
  if(ppg<=expected-0.2){reasons.push({text:"Ниже ожиданий роли",value:-8});return -8;}
  reasons.push({text:"Уровень игры соответствует роли",value:0});
  return 0;
};
const ageMotivationScore=(age,reasons)=>{
  if(age<=24){reasons.push({text:"Молодой возраст — мотивация расти в клубе",value:5});return 5;}
  if(age>=34){reasons.push({text:"Возраст снижает мотивацию к долгому контракту",value:-10});return -10;}
  if(age>=30){reasons.push({text:"Возраст снижает мотивацию к долгому контракту",value:-5});return -5;}
  reasons.push({text:"Возраст нейтрален",value:0});
  return 0;
};
const salarySatisfactionScore=(offerSalary,marketSalary,reasons)=>{
  const delta=offerSalary/marketSalary;
  let score=0;
  if(delta>=1.15)score=20;
  else if(delta>=1.0)score=10;
  else if(delta>=0.9)score=0;
  else if(delta>=0.8)score=-10;
  else score=-20;
  const text=`Соотношение зарплаты к рынку: ${delta.toFixed(2)}`;
  reasons.push({text,value:score});
  return score;
};
export const getUfaStatus=(age,khlGamesPlayed)=>{
  if(age>=29)return "NSA";
  if(age>=28 && (khlGamesPlayed||0)>=250)return "NSA";
  return "OSA";
};
export const estimateMarketSalary=(player,lastContract)=>{
  if(lastContract?.salaryRub)return lastContract.salaryRub;
  return Math.max(1000000,Math.round(player.ovr*1000000));
};
export const willingnessState=w=>{
  if(w>=75)return {label:"Хочет продлевать",emoji:"🟢",chance:clamp(Math.round(w*0.9),55,95)};
  if(w>=45)return {label:"Сомневается",emoji:"🟡",chance:clamp(Math.round(w*0.7),25,85)};
  return {label:"Не хочет",emoji:"🔴",chance:clamp(Math.round(w*0.5),5,60)};
};
export const evaluateRenewalWillingness=({player,team,offer,context,lastContract})=>{
  let marketSalary=estimateMarketSalary(player,lastContract);
  const years=clamp(offer?.years||1,1,4);
  const offerSalary=offer?.salaryRub||marketSalary;
  const reasons=[];
  let willingness=50;
  willingness+=roleFitScore(player,team,reasons);
  willingness+=teamPerformanceScore(context,reasons);
  willingness+=personalPerformanceScore(player,reasons);
  const teamOutsideTop8=Boolean(context?.teamRank) && context.teamRank>8;
  if(teamOutsideTop8 && isLegioner(player)){
    marketSalary=Math.round(marketSalary*1.1);
    reasons.push({text:"Легионер вне топ-8 — ожидание +10% к рынку",value:0});
    const shortTermBias=(years<=2)?5:((years>=3)?-5:0);
    willingness+=shortTermBias;
    reasons.push({text:"Легионер вне топ-8 — предпочитает короткий срок",value:shortTermBias});
  }
  willingness+=salarySatisfactionScore(offerSalary,marketSalary,reasons);
  const age=calculateAge(player.identity.birthDate);
  willingness+=ageMotivationScore(age,reasons);
  const ufaStatus=getUfaStatus(age,player.career?.khlGamesPlayed||0);
  if(ufaStatus==="OSA"){
    willingness+=10;
    reasons.push({text:"ОСА — более высокая терпимость",value:10});
  }
  const isInjured=player.condition?.fatigueStatus==="injured"||Boolean(player.condition?.injuryUntilDay);
  const {termPreference}=getTermPreference({
    age,
    declineRate:player.potential?.declineRate,
    ufaStatus,
    fatigueScore:player.fatigueScore,
    isInjured
  });
  const termMod=getTermMod(years,termPreference);
  willingness+=termMod;
  reasons.push({text:`Срок ${years} г. • Предпочтение: ${termPreferenceLabel(termPreference)}`,value:termMod});
  if(ufaStatus==="OSA")willingness=Math.max(willingness,30);
  willingness=clamp(Math.round(willingness),0,100);
  return {
    offer:{years,salaryRub:offerSalary},
    marketSalary,
    willingness,
    state:willingnessState(willingness),
    ufaStatus,
    reasons,
    termPreference
  };
};

