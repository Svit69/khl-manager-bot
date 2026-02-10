export const parseSeasonStart=season=>Number((season||"0/0").split("/")[0])||0;
export const parseSeasonEnd=season=>Number((season||"0/0").split("/")[1])||0;
export const formatNextSeason=season=>{
  const start=parseSeasonStart(season);
  return `${start+1}/${start+2}`;
};
export const formatContractEndDate=season=>{
  const endYear=Number((season||"0/0").split("/")[1])||0;
  return endYear?`31.05.${endYear}`:null;
};
export const calculateAge=birthDate=>{
  const now=new Date(),birth=new Date(birthDate);
  let age=now.getUTCFullYear()-birth.getUTCFullYear();
  const hasBirthdayPassed=(now.getUTCMonth()>birth.getUTCMonth())||(now.getUTCMonth()===birth.getUTCMonth()&&now.getUTCDate()>=birth.getUTCDate());
  return hasBirthdayPassed?age:age-1;
};
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

