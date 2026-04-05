const createMatchId = (roundIndex, matchIndex) => `round-${roundIndex + 1}-match-${matchIndex + 1}`;

const toResultSnapshot = (matchResult) => ({
  homeGoals: Number(matchResult?.homeGoals) || 0,
  awayGoals: Number(matchResult?.awayGoals) || 0,
  wentToOvertime: Boolean(matchResult?.summary?.wentToOvertime)
});

const buildRoundRobinPairings = (teams) => {
  const rotation = [...teams];
  const hasBye = rotation.length % 2 === 1;
  if(hasBye)rotation.push(null);

  const rounds = [];
  const halfSize = rotation.length / 2;
  for(let roundIndex = 0; roundIndex < rotation.length - 1; roundIndex++){
    const matches = [];
    for(let slotIndex = 0; slotIndex < halfSize; slotIndex++){
      const left = rotation[slotIndex];
      const right = rotation[rotation.length - 1 - slotIndex];
      if(!left || !right)continue;
      const shouldFlipHome = roundIndex % 2 === 1;
      const home = shouldFlipHome ? right : left;
      const away = shouldFlipHome ? left : right;
      matches.push({ home, away });
    }
    rounds.push(matches);

    const fixed = rotation[0];
    const moving = rotation.slice(1);
    moving.unshift(moving.pop());
    rotation.splice(0, rotation.length, fixed, ...moving);
  }
  return rounds;
};

export class SeasonCalendar{
  #days;
  #index = 0;

  constructor(teams){
    this.#days = this.#buildSchedule(teams);
  }

  get index(){return this.#index}
  set index(value){this.#index = Math.max(0, Math.min(this.#days.length, value))}
  get currentDay(){return Math.min(this.#index + 1, Math.max(1, this.#days.length))}
  getCurrent(){return this.#days[this.#index] || null}

  getScheduleRows(activeTeamId = null){
    return this.#days.map((day, index) => {
      const myMatch = activeTeamId
        ? day.matches.find((match) => match.home?.id === activeTeamId || match.away?.id === activeTeamId) || null
        : null;
      const playedMatches = day.matches.filter((match) => Boolean(match.result)).length;
      const previewMatches = day.matches.slice(0, 2).map((match) => ({
        id: match.id,
        home: { id: match.home.id, name: match.home.name, shortName: match.home.shortName },
        away: { id: match.away.id, name: match.away.name, shortName: match.away.shortName },
        result: match.result ? { ...match.result } : null
      }));
      return {
        day: day.day,
        isPlayed: day.matches.length > 0 && playedMatches === day.matches.length,
        isCurrent: index === this.#index,
        isMyMatch: Boolean(myMatch),
        isRestDay: day.matches.length === 0,
        matchCount: day.matches.length,
        playedMatchCount: playedMatches,
        matches: previewMatches,
        myMatch: myMatch ? {
          id: myMatch.id,
          home: { id: myMatch.home.id, name: myMatch.home.name, shortName: myMatch.home.shortName },
          away: { id: myMatch.away.id, name: myMatch.away.name, shortName: myMatch.away.shortName },
          result: myMatch.result ? { ...myMatch.result } : null
        } : null
      };
    });
  }

  getCurrentForTeam(teamId){
    if(!teamId)return this.getCurrent();
    for(let i = this.#index; i < this.#days.length; i++){
      const day = this.#days[i];
      if(day.matches.length === 0)return day;
      if(day.matches.some((match) => match.home?.id === teamId || match.away?.id === teamId)){
        return day;
      }
    }
    return null;
  }

  advanceDay(){
    if(this.#index < this.#days.length)this.#index++;
  }

  recordResult(dayNumber, matchId, matchResult){
    const day = this.#days.find((entry) => entry.day === dayNumber);
    if(!day || !matchId || !matchResult)return;
    const match = day.matches.find((entry) => entry.id === matchId);
    if(!match)return;
    match.result = toResultSnapshot(matchResult);
  }

  exportResults(){
    return this.#days.flatMap((day) => day.matches
      .filter((match) => match.result)
      .map((match) => ({
        day: day.day,
        matchId: match.id,
        ...match.result
      })));
  }

  importResults(results){
    const resultMap = new Map((results || []).map((entry) => [`${entry.day}:${entry.matchId}`, entry]));
    this.#days.forEach((day) => {
      day.matches.forEach((match) => {
        const snapshot = resultMap.get(`${day.day}:${match.id}`);
        match.result = snapshot ? {
          homeGoals: Number(snapshot.homeGoals) || 0,
          awayGoals: Number(snapshot.awayGoals) || 0,
          wentToOvertime: Boolean(snapshot.wentToOvertime)
        } : null;
      });
    });
  }

  isFinished(){return this.#index >= this.#days.length}

  #buildSchedule(teams){
    const firstLeg = buildRoundRobinPairings(teams);
    const secondLeg = firstLeg.map((round) => round.map((match) => ({
      home: match.away,
      away: match.home
    })));
    const rounds = [...firstLeg, ...secondLeg];
    return rounds.map((round, roundIndex) => ({
      day: roundIndex + 1,
      matches: round.map((match, matchIndex) => ({
        id: createMatchId(roundIndex, matchIndex),
        home: match.home,
        away: match.away,
        result: null
      }))
    }));
  }
}
