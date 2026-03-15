import { getTermMod, getTermPreference, termPreferenceLabel } from "./TermPreference.js";
import { calculateAge, clamp } from "./SeasonUtils.js";

const MIN_GAMES_FOR_ROLE_EVAL=5;
const MIN_GAMES_FOR_IMPACT_EVAL=5;
const MIN_TEAM_GAMES_FOR_PERFORMANCE=5;
const FORWARD_POSITIONS=new Set(["ЛНП","ЦТР","ПНП"]);

const isDomesticNationality=nationality=>{
  const normalized=String(nationality||"").trim().toLowerCase();
  return normalized==="россия" || normalized==="ru" || normalized==="rus" || normalized==="russia";
};

const isLegioner=player=>!isDomesticNationality(player?.identity?.nationality);
const average=values=>values.length?values.reduce((total,value)=>total+value,0)/values.length:0;
const roundToTenth=value=>Math.round(value*10)/10;

const getLineInfo=(team,player)=>{
  for(let index=0;index<(team?.lines||[]).length;index++){
    const line=team.lines[index];
    const slotIndex=(line.players||[]).indexOf(player);
    if(slotIndex!==-1){
      return {
        lineIndex:index+1,
        slotPosition:line.positions?.[slotIndex]||null
      };
    }
  }
  return {lineIndex:null,slotPosition:null};
};

const getPositionGroup=position=>{
  if(position==="ЗАЩ")return "D";
  if(position==="ВРТ")return "G";
  if(FORWARD_POSITIONS.has(position))return "F";
  return "SKATER";
};

const roleFitScore=(player,team,reasons,context)=>{
  if(context?.isFreeAgent){
    reasons.push({text:"Роль в команде будет определена после подписания",value:0});
    return 0;
  }
  const games=player.seasonStats?.games||0;
  if(games<MIN_GAMES_FOR_ROLE_EVAL){
    reasons.push({text:`Недостаточно матчей для оценки роли (нужно ${MIN_GAMES_FOR_ROLE_EVAL})`,value:0});
    return 0;
  }

  const expectedLine=player.expectedLineIndex||null;
  const {lineIndex,slotPosition}=getLineInfo(team,player);
  const secondaryPositions=player.identity?.secondaryPositions||[];
  let score=0;

  if(!lineIndex){
    score-=12;
    reasons.push({text:"Игрок вне основной обоймы команды",value:-12});
  }else if(expectedLine){
    if(lineIndex===expectedLine){
      score+=10;
      reasons.push({text:`Играет в ожидаемом звене (${lineIndex})`,value:10});
    }else if(lineIndex<expectedLine){
      score+=6;
      reasons.push({text:`Получает роль выше ожиданий (${lineIndex} звено вместо ${expectedLine})`,value:6});
    }else{
      score-=10;
      reasons.push({text:`Играет ниже ожиданий (${lineIndex} звено вместо ${expectedLine})`,value:-10});
    }
  }else if(lineIndex<=2){
    score+=5;
    reasons.push({text:`Закреплен в верхних звеньях (${lineIndex})`,value:5});
  }

  if(slotPosition){
    if(slotPosition===player.identity?.primaryPosition){
      score+=3;
      reasons.push({text:"Используется на основной позиции",value:3});
    }else if(secondaryPositions.includes(slotPosition)){
      score-=4;
      reasons.push({text:"Стабильно играет на дополнительной позиции",value:-4});
    }else{
      score-=10;
      reasons.push({text:"Регулярно используется вне профильной позиции",value:-10});
    }
  }

  return clamp(score,-15,15);
};

const teamPerformanceScore=(context,reasons)=>{
  const teamGamesPlayed=context?.teamGamesPlayed??0;
  if(teamGamesPlayed<MIN_TEAM_GAMES_FOR_PERFORMANCE){
    reasons.push({text:`Недостаточно командных матчей для оценки таблицы (нужно ${MIN_TEAM_GAMES_FOR_PERFORMANCE})`,value:0});
    return 0;
  }
  const rank=context?.teamRank??null;
  if(rank===null){
    reasons.push({text:"Нет данных по месту команды",value:0});
    return 0;
  }
  if(rank<=4){
    reasons.push({text:`Команда идет очень высоко (${rank} место)`,value:10});
    return 10;
  }
  if(rank<=8){
    reasons.push({text:`Команда в зоне плей-офф (${rank} место)`,value:7});
    return 7;
  }
  const penalty=rank>=(context?.teamsCount||0)-1?-10:-7;
  reasons.push({text:`Команда вне топ-8 (${rank} место)`,value:penalty});
  return penalty;
};

const personalPerformanceScore=(player,context,reasons)=>{
  const games=player.seasonStats?.games||0;
  if(games<MIN_GAMES_FOR_IMPACT_EVAL){
    reasons.push({text:`Недостаточно матчей для оценки импакта (нужно ${MIN_GAMES_FOR_IMPACT_EVAL})`,value:0});
    return 0;
  }

  const teamRoster=context?.teamRoster||[];
  const group=getPositionGroup(player.identity?.primaryPosition);
  const comparablePlayers=teamRoster.filter(candidate=>
    candidate.id!==player.id
    && (candidate.seasonStats?.games||0)>=MIN_GAMES_FOR_IMPACT_EVAL
    && getPositionGroup(candidate.identity?.primaryPosition)===group
  );

  const points=player.seasonStats?.points??((player.seasonStats?.goals||0)+(player.seasonStats?.assists||0));
  const shots=player.seasonStats?.shots||0;
  const playerPpg=points/games;
  const playerShotsPerGame=shots/games;
  const avgIceTime=games>0?(player.seasonStats?.totalIceTime||0)/games:0;

  if(!comparablePlayers.length){
    reasons.push({text:`Импакт: ${roundToTenth(playerPpg)} очка за матч, но мало сопоставимых игроков`,value:0});
    return 0;
  }

  const comparablePpg=comparablePlayers.map(candidate=>{
    const candidatePoints=candidate.seasonStats?.points??((candidate.seasonStats?.goals||0)+(candidate.seasonStats?.assists||0));
    return candidatePoints/Math.max(1,candidate.seasonStats?.games||1);
  });
  const comparableShotsPerGame=comparablePlayers
    .filter(candidate=>(candidate.seasonStats?.shots||0)>0)
    .map(candidate=>(candidate.seasonStats?.shots||0)/Math.max(1,candidate.seasonStats?.games||1));

  const ppgGap=playerPpg-average(comparablePpg);
  const shotsGap=comparableShotsPerGame.length?playerShotsPerGame-average(comparableShotsPerGame):0;
  let score=0;

  if(ppgGap>=0.25){
    score+=6;
    reasons.push({text:`Высокий результативный импакт: ${roundToTenth(playerPpg)} очка за матч`,value:6});
  }else if(ppgGap<=-0.2){
    score-=6;
    reasons.push({text:`Результативность ниже конкурентов по роли (${roundToTenth(playerPpg)} очка за матч)`,value:-6});
  }else{
    reasons.push({text:`Результативность соответствует роли (${roundToTenth(playerPpg)} очка за матч)`,value:0});
  }

  if(shotsGap>=0.8){
    score+=2;
    reasons.push({text:`Создает больше моментов, чем игроки его роли (${roundToTenth(playerShotsPerGame)} броска за матч)`,value:2});
  }else if(shotsGap<=-0.8){
    score-=2;
    reasons.push({text:"Создает меньше моментов, чем игроки его роли",value:-2});
  }

  if(avgIceTime>0){
    const minutes=roundToTenth(avgIceTime/60);
    if(minutes>=18){
      score+=2;
      reasons.push({text:`Большая нагрузка: ${minutes} мин в среднем`,value:2});
    }else if(minutes<=11){
      score-=2;
      reasons.push({text:`Ограниченная роль по айстайму: ${minutes} мин в среднем`,value:-2});
    }
  }

  return clamp(score,-10,10);
};

const ageMotivationScore=(age,reasons)=>{
  if(age<=24){
    reasons.push({text:"Молодой возраст повышает готовность расти в клубе",value:5});
    return 5;
  }
  if(age>=34){
    reasons.push({text:"Возраст делает игрока осторожнее по долгому контракту",value:-10});
    return -10;
  }
  if(age>=30){
    reasons.push({text:"Возраст снижает мотивацию к долгому контракту",value:-5});
    return -5;
  }
  reasons.push({text:"Возраст нейтрален",value:0});
  return 0;
};

const salarySatisfactionScore=(offerSalary,marketSalary,reasons)=>{
  const delta=offerSalary/Math.max(1,marketSalary);
  let score=0;
  if(delta>=1.15)score=20;
  else if(delta>=1.0)score=10;
  else if(delta>=0.9)score=0;
  else if(delta>=0.8)score=-10;
  else score=-20;
  reasons.push({text:`Соотношение зарплаты к рынку: ${delta.toFixed(2)}`,value:score});
  return score;
};

export const getUfaStatus=(age,khlGamesPlayed)=>{
  if(age>=29)return "NSA";
  if(age>=28 && (khlGamesPlayed||0)>=250)return "NSA";
  return "OSA";
};

export const estimateMarketSalary=(player,lastContract,marketSalaryOverride=null)=>{
  if(Number.isFinite(marketSalaryOverride) && marketSalaryOverride>0)return marketSalaryOverride;
  if(lastContract?.salaryRub)return lastContract.salaryRub;
  return Math.max(1000000,Math.round(player.ovr*1000000));
};

export const willingnessState=willingness=>{
  if(willingness>=75){
    return {label:"Хочет продлевать",emoji:"🟢",chance:clamp(Math.round(willingness*0.9),55,95)};
  }
  if(willingness>=45){
    return {label:"Сомневается",emoji:"🟡",chance:clamp(Math.round(willingness*0.7),25,85)};
  }
  return {label:"Не хочет",emoji:"🔴",chance:clamp(Math.round(willingness*0.5),5,60)};
};

export const evaluateRenewalWillingness=({player,team,offer,context,lastContract,marketSalary:marketSalaryOverride=null})=>{
  let marketSalary=estimateMarketSalary(player,lastContract,marketSalaryOverride);
  const years=clamp(offer?.years||1,1,4);
  const offerSalary=offer?.salaryRub||marketSalary;
  const reasons=[];
  let willingness=50;

  willingness+=roleFitScore(player,team,reasons,context);
  willingness+=teamPerformanceScore(context,reasons);
  willingness+=personalPerformanceScore(player,context,reasons);

  if(context?.isFreeAgent){
    willingness+=10;
    reasons.push({text:"Свободный агент открыт к полноценному предложению",value:10});
  }

  const teamOutsideTop8=Boolean(context?.teamRank) && context.teamRank>8;
  if(teamOutsideTop8 && isLegioner(player)){
    marketSalary=Math.round(marketSalary*1.1);
    reasons.push({text:"Легионер вне топ-8 ждет надбавку к рыночной цене",value:0});
    const shortTermBias=years<=2?5:(years>=3?-5:0);
    willingness+=shortTermBias;
    reasons.push({text:"Легионер вне топ-8 охотнее соглашается на короткий срок",value:shortTermBias});
  }

  willingness+=salarySatisfactionScore(offerSalary,marketSalary,reasons);

  const age=calculateAge(player.identity.birthDate);
  willingness+=ageMotivationScore(age,reasons);

  const ufaStatus=getUfaStatus(age,player.career?.khlGamesPlayed||0);
  if(ufaStatus==="OSA"){
    willingness+=10;
    reasons.push({text:"ОСА легче удержать при адекватном предложении",value:10});
  }

  const isInjured=player.condition?.fatigueStatus==="injured" || Boolean(player.condition?.injuryUntilDay);
  const {termPreference}=getTermPreference({
    age,
    declineRate:player.potential?.declineRate,
    ufaStatus,
    fatigueScore:player.condition?.fatigueScore??player.fatigueScore,
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
