export const generateUuid=()=>{
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
  const s=()=>Math.floor((1+Math.random())*0x10000).toString(16).slice(1);
  return `${s()}${s()}-${s()}-${s()}-${s()}-${s()}${s()}${s()}`;
};
