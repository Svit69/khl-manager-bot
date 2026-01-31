import { generateUuid } from "../utils/uuid.js";
const buildTeam=(name,shortName,city,country,logoFile)=>({
  id:generateUuid(),
  name,
  shortName,
  city,
  country,
  logoUrl:`./khl-logo/${logoFile}`,
  isPlayable:true,
  createdAt:new Date().toISOString()
});
export const teamsData=[
  buildTeam("Авангард","AVG","Омск","RU","avangard.png"),
  buildTeam("Автомобилист","AVT","Екатеринбург","RU","avtomobilist.png"),
  buildTeam("Салават Юлаев","SYU","Уфа","RU","salavat-yulaev.png"),
  buildTeam("Трактор","TRK","Челябинск","RU","traktor.png")
];
