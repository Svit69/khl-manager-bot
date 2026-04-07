export const parseSeasonStart=season=>Number((season||"0/0").split("/")[0])||0;
export const parseSeasonEnd=season=>Number((season||"0/0").split("/")[1])||0;
let seasonReferenceDate=null;
const normalizeDateInput=value=>{
  if(!value)return null;
  const date=value instanceof Date?new Date(value.getTime()):new Date(value);
  return Number.isNaN(date.getTime())?null:date;
};
export const formatNextSeason=season=>{
  const start=parseSeasonStart(season);
  return `${start+1}/${start+2}`;
};
export const formatContractEndDate=season=>{
  const endYear=Number((season||"0/0").split("/")[1])||0;
  return endYear?`31.05.${endYear}`:null;
};
export const setSeasonReferenceDate=value=>{
  seasonReferenceDate=normalizeDateInput(value);
  return seasonReferenceDate;
};
export const getSeasonReferenceDate=()=>normalizeDateInput(seasonReferenceDate)||new Date();
export const formatCalendarDate=(value,options={})=>{
  const date=normalizeDateInput(value);
  if(!date)return "";
  return new Intl.DateTimeFormat("ru-RU",{
    day:"numeric",
    month:"long",
    year:"numeric",
    ...options
  }).format(date);
};
export const calculateAge=(birthDate,referenceDate=null)=>{
  const now=normalizeDateInput(referenceDate)||getSeasonReferenceDate(),birth=normalizeDateInput(birthDate);
  if(!birth)return 0;
  let age=now.getUTCFullYear()-birth.getUTCFullYear();
  const hasBirthdayPassed=(now.getUTCMonth()>birth.getUTCMonth())||(now.getUTCMonth()===birth.getUTCMonth()&&now.getUTCDate()>=birth.getUTCDate());
  return hasBirthdayPassed?age:age-1;
};
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
