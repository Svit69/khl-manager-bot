import assert from "node:assert/strict";
import { createSigningFixture } from "./FreeAgentPersistenceFixture.mjs";

export const createMcLeodSigningFixture = () => {
  const fixture = createSigningFixture(), { state } = fixture;
  const buyer = state.activeTeamId, owner = state.teams.find(team => team.shortName === "AVG").id;
  state.setActiveTeamId(owner);
  const saved = state.exportState();
  saved.gameSettings.salaryCapEnabled = true;
  saved.gameSettings.salaryCapBaseRub = 2000000000;
  state.importState(saved);
  const player = state.activeTeam.getRoster().find(row => row.id === "f0a1b2c3-d4e5-4f6a-8b7c-9d0e1f2a3b4d");
  assert.equal(state.applySalaryCapComplianceReleases([player.id]), true);
  state.setActiveTeamId(buyer);
  const random = Math.random;
  let result;
  try {
    Math.random = () => 0;
    result = state.submitFreeAgentSigning(player.id, { years: 1, salaryRub: 100000000 });
  } finally { Math.random = random; }
  assert.equal(result?.decision, "accept");
  return { ...fixture, player, owner, buyer };
};
