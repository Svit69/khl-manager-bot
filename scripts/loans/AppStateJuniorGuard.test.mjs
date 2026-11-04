import assert from "node:assert/strict";
import test from "node:test";
import { createFixture } from "./AppStateFixture.mjs";
test("borrower can use juniors without rewriting a loan player's future owner contract", () => {
  const fixture = createFixture(), saved = JSON.parse(JSON.stringify(fixture.state.exportState()));
  saved.players.find(row => row.id === fixture.player.id).identity.birthDate = "2006-01-01";
  saved.contracts.contracts.filter(row => row.playerId === fixture.player.id).forEach(row => { row.type = "three-way"; });
  fixture.state.importState(saved);
  fixture.startLoan(); fixture.state.setActiveTeamId("borrower");
  const before = fixture.state.exportState().contracts;
  assert.equal(fixture.state.sendPlayerToJunior(fixture.player.id), true);
  assert.equal(fixture.state.signJuniorPlayerToMain(fixture.player.id), null);
  assert.deepEqual(fixture.state.exportState().contracts, before);
  assert.equal(fixture.teams[1].juniorPlayers.some(row => row.id === fixture.player.id), true);
});
