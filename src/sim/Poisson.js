export const poissonSample=lambda=>{
  let L=Math.exp(-lambda),k=0,p=1;
  do{k++;p*=Math.random()}while(p>L);
  return k-1;
};
