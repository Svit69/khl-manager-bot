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
  buildTeam("9f3f9b9a-6c57-49c6-a64d-2fa6e376a7b1","Ак Барс","AKB","Казань","RU","ak-bars.png"),
  buildTeam("d7f7d3be-4b8d-4a5c-9d2f-1ddbd9970b4d","Авангард","AVG","Омск","RU","avangard.png"),
  buildTeam("a4b4f445-2c38-41c5-a2d2-3aee8a0f5d2a","Автомобилист","AVT","Екатеринбург","RU","avtomobilist.png"),
  buildTeam("8a8b6a2c-9d03-4f74-a3f1-c84410f84d27","Динамо М","DYN","Москва","RU","dynamo-moscow.png"),
  buildTeam("6b9a4d2c-5f18-41d4-9b65-3d71d8a4f2c0","Динамо Мн","DMN","Минск","BY","dinamo-minsk.png"),
  buildTeam("1f9e53f8-c6b1-4d2d-8ae8-6f1fd72f3f62","ЦСКА","CSK","Москва","RU","cska.png"),
  buildTeam("3a2d2d4a-7b2b-4a2f-8a5c-8e8e8f9e0c0b","Салават Юлаев","SYU","Уфа","RU","salavat-yulaev.png"),
  buildTeam("4c9c3c3a-8f7a-4f5e-9c9a-6d6b6a5e4f3d","Трактор","TRK","Челябинск","RU","traktor.png"),
  buildTeam("7d4e3f2a-1b6c-4a9d-8e5f-2c3b4a5d6e7f","Металлург","MMG","Магнитогорск","RU","metallurg.png"),
  buildTeam("2fd1e77d-8a6f-47fd-8d2b-5f2035f21f90","\u0422\u043e\u0440\u043f\u0435\u0434\u043e","TOR","\u041d\u0438\u0436\u043d\u0438\u0439 \u041d\u043e\u0432\u0433\u043e\u0440\u043e\u0434","RU","torpedo.png")
];
