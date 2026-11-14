import test from "node:test";
import assert from "node:assert/strict";
import { createMcLeodSigningFixture } from "./McLeodSigningFixture.mjs";
import { createSigningFixture } from "./FreeAgentPersistenceFixture.mjs";

test("McLeod's canceled Avangard contract stays canceled after a new signing and reload", () => {
  const fixture = createMcLeodSigningFixture();
  let state = fixture.state;
  for (let reload = 0; reload < 3; reload++) {
    const fresh = createSigningFixture().state;
    fresh.importState(JSON.parse(JSON.stringify(state.exportState()))); state = fresh;
    assert.equal(state.exportState().contracts.releasedPlayerIds.includes(fixture.player.id), true);
    assert.equal(state.activeTeam.getRoster().filter(row => row.id === fixture.player.id).length, 1);
    assert.equal(state.getAvailableFreeAgents().some(row => row.id === fixture.player.id), false);
    assert.equal(state.submitFreeAgentSigning(fixture.player.id, { years: 1, salaryRub: 100000000 }), null);
    state.playDay();
  }
});
test("an affected save repairs canceled-contract markers and duplicate roster placements", () => {
  const { state, player, buyer } = createMcLeodSigningFixture();
  const saved = JSON.parse(JSON.stringify(state.exportState()));
  saved.contracts.releasedPlayerIds = saved.contracts.releasedPlayerIds.filter(id => id !== player.id);
  saved.rosters.find(row => row.teamId === buyer).reservePlayerIds.push(player.id);
  const snapshot = saved.players.find(row => row.id === player.id);
  snapshot.teamId = null; snapshot.contractId = null;
  const restored = createSigningFixture().state;
  restored.importState(saved);
  assert.equal(restored.exportState().contracts.releasedPlayerIds.includes(player.id), true);
  const occurrences = restored.teams.flatMap(team => team.getRoster()).filter(row => row.id === player.id);
  assert.equal(occurrences.length, 1);
  assert.equal(occurrences[0].affiliation.teamId, buyer);
  assert.equal(restored.getAvailableFreeAgents().some(row => row.id === player.id), false);
});
