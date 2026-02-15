const buildTeam=(id,name,shortName,city,country,logoFile)=>(
  {
    id,
    name,
    shortName,
    city,
    country,
    logoUrl:`./khl-logo/${logoFile}`,
    isPlayable:true,
    createdAt:"2026-01-31T00:00:00.000Z"
  }
);
export const teamsData=[
  buildTeam("d7f7d3be-4b8d-4a5c-9d2f-1ddbd9970b4d","Авангард","AVG","Омск","RU","avangard.png"),
  buildTeam("a4b4f445-2c38-41c5-a2d2-3aee8a0f5d2a","Автомобилист","AVT","Екатеринбург","RU","avtomobilist.png"),
  buildTeam("3a2d2d4a-7b2b-4a2f-8a5c-8e8e8f9e0c0b","Салават Юлаев","SYU","Уфа","RU","salavat-yulaev.png"),
  buildTeam("4c9c3c3a-8f7a-4f5e-9c9a-6d6b6a5e4f3d","Трактор","TRK","Челябинск","RU","traktor.png"),
  buildTeam("7d4e3f2a-1b6c-4a9d-8e5f-2c3b4a5d6e7f","Металлург","MMG","Магнитогорск","RU","metallurg.png")
];
