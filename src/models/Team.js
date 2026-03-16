export class Team{
  #id;#name;#shortName;#city;#country;#logoUrl;#isPlayable;#createdAt;#lines;#reservePlayers;
  constructor(info,lines,reservePlayers=[]){
    this.#id=info.id;this.#name=info.name;this.#shortName=info.shortName;this.#city=info.city;
    this.#country=info.country;this.#logoUrl=info.logoUrl;this.#isPlayable=info.isPlayable;
    this.#createdAt=info.createdAt;this.#lines=lines;this.#reservePlayers=reservePlayers;
  }
  get id(){return this.#id}
  get name(){return this.#name}
  get shortName(){return this.#shortName}
  get city(){return this.#city}
  get country(){return this.#country}
  get logoUrl(){return this.#logoUrl}
  get isPlayable(){return this.#isPlayable}
  get createdAt(){return this.#createdAt}
  get lines(){return this.#lines}
  get reservePlayers(){return this.#reservePlayers}
  getStrength(){return this.#lines.reduce((a,l)=>a+l.getStrength(),0)}
  getRoster(){return [...this.#lines.flatMap(l=>l.players).filter(Boolean),...this.#reservePlayers.filter(Boolean)]}
  swapRosterSlots(source,target){
    const sourceRef=this.#resolveRosterSlot(source);
    const targetRef=this.#resolveRosterSlot(target);
    if(!sourceRef||!targetRef)return false;
    if(sourceRef.array===targetRef.array && sourceRef.index===targetRef.index)return false;
    const sourceValue=sourceRef.array[sourceRef.index]??null;
    const targetValue=targetRef.array[targetRef.index]??null;
    if(sourceRef.kind==="reserve" && targetRef.kind==="line" && !targetValue){
      targetRef.array[targetRef.index]=sourceValue;
      sourceRef.array.splice(sourceRef.index,1);
      return true;
    }
    if(sourceRef.kind==="line" && targetRef.kind==="reserve" && !sourceValue)return false;
    [sourceRef.array[sourceRef.index],targetRef.array[targetRef.index]]=[targetRef.array[targetRef.index],sourceRef.array[sourceRef.index]];
    return true;
  }
  moveLinePlayerToReserve(lineIndex,slotIndex){
    const line=this.#lines[Number(lineIndex)];
    const index=Number(slotIndex);
    if(!line||!Number.isInteger(index)||index<0||index>=line.players.length)return false;
    const player=line.players[index];
    if(!player)return false;
    line.players[index]=null;
    this.#reservePlayers.push(player);
    return true;
  }
  #resolveRosterSlot(slot){
    if(!slot)return null;
    if(slot.kind==="reserve"){
      const index=Number(slot.index);
      if(!Number.isInteger(index)||index<0||index>=this.#reservePlayers.length)return null;
      return {array:this.#reservePlayers,index,kind:"reserve"};
    }
    if(slot.kind==="line"){
      const lineIndex=Number(slot.lineIndex);
      const slotIndex=Number(slot.slotIndex);
      const line=this.#lines[lineIndex];
      if(!line||!Number.isInteger(slotIndex)||slotIndex<0||slotIndex>=line.players.length)return null;
      return {array:line.players,index:slotIndex,kind:"line"};
    }
    return null;
  }
}
