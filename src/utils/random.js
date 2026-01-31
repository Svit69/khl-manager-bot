export const randomInt=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
export const randomFloat=(min,max,decimals=2)=>{
  const value=min+Math.random()*(max-min);
  const factor=10**decimals;
  return Math.round(value*factor)/factor;
};
export const randomBirthDate=()=>{
  const year=randomInt(1990,2002),month=randomInt(0,11),day=randomInt(1,28);
  return new Date(Date.UTC(year,month,day)).toISOString().slice(0,10);
};
