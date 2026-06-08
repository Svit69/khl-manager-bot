export class TeamRosterBuilder {
  #teamId;#positionByLabel;#nationalityByLabel;#contractTypeByLabel;#seasonByIndex;
  constructor({teamId,positionByLabel,nationalityByLabel,contractTypeByLabel,seasonByIndex}) {
    if (new.target===TeamRosterBuilder) throw new Error("TeamRosterBuilder is abstract");
    this.#teamId=teamId;this.#positionByLabel=positionByLabel;this.#nationalityByLabel=nationalityByLabel;
    this.#contractTypeByLabel=contractTypeByLabel;this.#seasonByIndex=seasonByIndex;
  }
  buildPlayerProfiles(records) { return records.map((record)=>this.buildPlayerProfile(record)); }
  buildPlayerContracts(records) {
    return records.flatMap((record)=>record.salaries.map((salary,seasonIndex)=>this.buildPlayerContract(record,salary,seasonIndex)));
  }
  buildPlayerProfile(record) {
    const position=this.resolvePosition(record.position);
    return {
      id:this.createPlayerId(record.slug),teamId:this.#teamId,lineIndex:null,position,
      identity:{
        firstName:record.firstName,lastName:record.lastName,displayName:`${record.firstName} ${record.lastName}`,
        birthDate:record.birthDate,nationality:this.resolveNationality(record.nationality),isGoalie:false,
        photoUrl:`./player-photo/${record.slug}.png`,primaryPosition:position,
        secondaryPositions:record.secondaryPositions.map((label)=>this.resolvePosition(label)).filter(Boolean),
      },
      attributes:{shot:record.shot,speed:record.speed,physical:record.physical,defense:record.defense,skill:record.skill},
      potential:{
        potential:record.potential,growthRate:this.calculateGrowthRate(record.birthDate),
        peakAge:this.calculatePeakAge(record.birthDate),declineRate:0.7,
      },
      condition:{fatigueScore:0,form:1.0,injuryUntilDay:null},
      career:{khlGamesPlayed:record.khlGamesPlayed,seasonsPlayed:record.seasonsPlayed,reputation:record.reputation},
      affiliation:{contractId:this.createContractId(record.slug,0)},
    };
  }
  buildPlayerContract(record,salary,seasonIndex) {
    return {
      id:this.createContractId(record.slug,seasonIndex),playerId:this.createPlayerId(record.slug),teamId:this.#teamId,
      season:this.#seasonByIndex[seasonIndex],salaryRub:Math.round(Number(salary)*1000000),
      type:this.resolveContractType(record.contractType),
    };
  }
  resolvePosition(label) { return this.#positionByLabel[label]; }
  resolveNationality(label) { return this.#nationalityByLabel[label]||"RU"; }
  resolveContractType(label) { return this.#contractTypeByLabel[label]||"one-way"; }
  calculatePeakAge(birthDate) { const year=Number(String(birthDate).slice(0,4))||1998; return year>=2004?27:year>=1999?28:year>=1994?29:31; }
  calculateGrowthRate(birthDate) { const year=Number(String(birthDate).slice(0,4))||1998; return year>=2006?1.15:year>=2003?1:year>=2000?0.85:0.55; }
  createPlayerId() { throw new Error("createPlayerId must be implemented"); }
  createContractId() { throw new Error("createContractId must be implemented"); }
}
