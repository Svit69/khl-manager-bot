import test from "node:test";
import assert from "node:assert/strict";
import { createSigningFixture, signFixturePlayer, renameSavedPlayerId } from "./FreeAgentPersistenceFixture.mjs";

test("signed free agents stay signed through fresh reloads and time progression", () => {
  let { state } = createSigningFixture();
  const player = signFixturePlayer(state);
  for (let reload = 0; reload < 3; reload++) {
    const saved = JSON.parse(JSON.stringify(state.exportState()));
    const fresh = createSigningFixture(); fresh.state.importState(saved); state = fresh.state;
    assert.equal(state.getAvailableFreeAgents().some(row => row.id === player.id), false);
    assert.equal(state.activeTeam.getRoster().filter(row => row.id === player.id).length, 1);
    assert.equal(state.submitFreeAgentSigning(player.id, { years: 1, salaryRub: 100000000 }), null);
    state.playDay();
  }
});
test("a database ID change cannot reintroduce a signed player as a fresh free agent", () => {
  const { state } = createSigningFixture(), player = signFixturePlayer(state);
  const saved = JSON.parse(JSON.stringify(state.exportState())), legacyId = "legacy-burdasov";
  renameSavedPlayerId(saved, player.id, legacyId);
  const restored = createSigningFixture().state;
  restored.importState(saved);
  assert.equal(restored.getAvailableFreeAgents().some(row => row.name === player.name), false);
  assert.equal(restored.activeTeam.getRoster().filter(row => row.name === player.name).length, 1);
  assert.equal(restored.submitFreeAgentSigning(player.id, { years: 1, salaryRub: 100000000 }), null);
});
