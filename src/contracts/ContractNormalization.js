export const createContractNormalizer=ContractType=>{
  const normalizeType=type=>Object.values(ContractType).includes(type)?type:ContractType.ONE_WAY;
  const normalizeContract=contract=>{
    if(!contract||!contract.id||!contract.season||(!contract.playerId&&!contract.teamId))return null;
    return {...contract,type:normalizeType(contract.type)};
  };
  return {normalizeType,normalizeContract};
};

