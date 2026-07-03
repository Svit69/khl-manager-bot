const JUNIOR_TEAM_BY_PARENT_SHORT_NAME = Object.freeze({
  AVG: { name: "Омские Ястребы", shortName: "OMY" },
  ADM: { name: "Тайфун", shortName: "TYF" },
  AMR: { name: "Амурские тигры", shortName: "AMT" },
  CSK: { name: "Красная Армия", shortName: "KRA" },
  SYU: { name: "Толпар", shortName: "TLP" },
  AVT: { name: "Авто", shortName: "AVT-M" },
  TOR: { name: "Чайка", shortName: "CHA" },
  AKB: { name: "Ирбис", shortName: "IRB" },
  DYN: { name: "МХК Динамо", shortName: "MHKD" },
  DMN: { name: "Динамо-Шинник", shortName: "DSH" },
  TRK: { name: "Белые Медведи", shortName: "BMD" },
  MMG: { name: "Стальные Лисы", shortName: "STL" },
  LOK: { name: "Локо", shortName: "LOKO" },
  SIB: { name: "Сибирские снайперы", shortName: "SNP" },
  BAR: { name: "Снежные Барсы", shortName: "SNB" },
  SKA: { name: "СКА-1946", shortName: "SKA46" },
  SPM: { name: "МХК Спартак", shortName: "MHKSP" },
  SEV: { name: "Алмаз", shortName: "ALM" },
  NFK: { name: "Реактор", shortName: "RKT" },
});

export const createJuniorTeamInfo = (parentTeam) => {
  const info = JUNIOR_TEAM_BY_PARENT_SHORT_NAME[parentTeam?.shortName];
  if (!info) return null;
  return {
    id: `${parentTeam.id}-junior`,
    parentTeamId: parentTeam.id,
    name: info.name,
    shortName: info.shortName,
    city: parentTeam.city,
    country: parentTeam.country,
    logoUrl: parentTeam.logoUrl,
  };
};
