import { goalieContractId, goaliePlayerId } from "./GoalieProfileFactory.js";
import { goalieSeasons, readGoalieRecord } from "./GoalieRecordSchema.js";

const salaryRub = (millions) => Math.round(Number(millions) * 1000000);

export const createGoalieContracts = (row) => {
  const record = readGoalieRecord(row);
  return record.salaries.map((salary, seasonIndex) => ({
    id: goalieContractId(record.slug, seasonIndex),
    playerId: goaliePlayerId(record.slug),
    teamId: record.teamId,
    season: goalieSeasons[seasonIndex],
    salaryRub: salaryRub(salary),
    type: record.contractType,
  }));
};
