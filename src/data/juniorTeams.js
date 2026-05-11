const JUNIOR_TEAM_BY_PARENT_SHORT_NAME = Object.freeze({
  AVG: { name: "Омские Ястребы", shortName: "OMY" },
  CSK: { name: "Красная Армия", shortName: "KRA" },
  SYU: { name: "Толпар", shortName: "TLP" },
  AVT: { name: "Авто", shortName: "AVT-M" },
  TOR: { name: "Чайка", shortName: "CHA" },
  AKB: { name: "Ирбис", shortName: "IRB" },
  DYN: { name: "МХК Динамо", shortName: "MHKD" },
  DMN: { name: "Динамо-Шинник", shortName: "DSH" },
  TRK: { name: "Белые Медведи", shortName: "BMD" },
  MMG: { name: "Стальные Лисы", shortName: "STL" },
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
