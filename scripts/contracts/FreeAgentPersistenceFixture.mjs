import assert from "node:assert/strict";
import { AppState } from "../../src/state/AppState.js";
import { SeasonCalendar } from "../../src/calendar/SeasonCalendar.js";
import { createContractImportFixture } from "./ContractImportTestFixture.mjs";

export const createSigningFixture = () => {
  const data = createContractImportFixture(), calendar = new SeasonCalendar(data.teams, 2025);
  const state = new AppState(data.teams, calendar, data.contracts, data.freeAgents, data.externalPlayers);
  state.updateGameSettings({ salaryCapEnabled: false, coachesEnabled: false });
  state.setActiveTeamId(data.teams.find(team => team.shortName === "SCH").id);
  return { state, calendar };
};
export const signFixturePlayer = state => {
  const player = state.getAvailableFreeAgents().find(row => row.id === "fa-0001-4000-8000-000000000001");
  const random = Math.random;
  try {
    Math.random = () => 0;
    for (const years of [1, 2, 3, 4]) {
      const result = state.submitFreeAgentSigning(player.id, { years, salaryRub: 100000000 });
      if (result?.decision === "accept") return player;
    }
  } finally { Math.random = random; }
  assert.fail("Fixture player should accept a competitive offer");
};
export const renameSavedPlayerId = (saved, previous, next) => {
  saved.players.find(row => row.id === previous).id = next;
  for (const key of ["contracts", "createdContracts"]) {
    saved.contracts[key].filter(row => row.playerId === previous).forEach(row => { row.playerId = next; });
  }
  saved.contracts.releasedPlayerIds = saved.contracts.releasedPlayerIds.map(id => id === previous ? next : id);
  for (const roster of saved.rosters) {
    roster.linePlayerIds = roster.linePlayerIds.map(line => line.map(id => id === previous ? next : id));
    for (const key of ["reservePlayerIds", "juniorPlayerIds"]) roster[key] = roster[key].map(id => id === previous ? next : id);
  }
};
