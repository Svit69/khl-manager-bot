import { poissonSample } from "./Poisson.js";
export class MatchSimulator{
  simulateMatch(home,away){
    const homeXg=1.2+home.getStrength()/400,awayXg=1.1+away.getStrength()/420;
    const homeGoals=poissonSample(homeXg),awayGoals=poissonSample(awayXg);
    const events=[...this.#buildEvents(home,homeGoals),...this.#buildEvents(away,awayGoals)].sort((a,b)=>a.minute-b.minute);
    return {home,away,homeGoals,awayGoals,events};
  }
  #buildEvents(team,goals){
    const events=[];
    for(let i=0;i<goals;i++){
      const line=this.#pickLine(team.lines);const [scorer,assist]=this.#pickScorers(line.players);
      events.push({minute:Math.floor(Math.random()*60)+1,team:team.name,scorer:scorer.name,assist:assist.name});
    }
    return events;
  }
  #pickLine(lines){
    const total=lines.reduce((a,l)=>a+l.weight,0);let r=Math.random()*total;
    return lines.find(l=>(r-=l.weight)<=0)||lines[0];
  }
  #pickScorers(players){
    const shuffled=[...players].sort(()=>0.5-Math.random());
    return [shuffled[0],shuffled[1]||shuffled[0]];
  }
}
