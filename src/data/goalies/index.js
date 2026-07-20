import { goalieRecordsA } from "./GoalieRecordsA.js";
import { goalieRecordsB } from "./GoalieRecordsB.js";
import { goalieRecordsC } from "./GoalieRecordsC.js";
import { goalieRecordsD } from "./GoalieRecordsD.js";
import { createGoalieContracts } from "./GoalieContractFactory.js";
import { createGoalieProfile } from "./GoalieProfileFactory.js";

const goalieRecords = [...goalieRecordsA, ...goalieRecordsB, ...goalieRecordsC, ...goalieRecordsD];

export const goaliePlayerProfiles = goalieRecords.map(createGoalieProfile);
export const goaliePlayerContracts = goalieRecords.flatMap(createGoalieContracts);
