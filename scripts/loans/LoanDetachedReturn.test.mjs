import test from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./AppStateFixture.mjs";

test("an old save with a loan player detached into free agents returns him without duplicates", () => {
  const fixture = createFixture(), agreement = fixture.startLoan();
  const saved = JSON.parse(JSON.stringify(fixture.state.exportState()));
  const player = saved.players.find(row => row.id === fixture.player.id);
  player.teamId = null;
  player.contractId = null;
  for (const roster of saved.rosters) {
    roster.reservePlayerIds = roster.reservePlayerIds.filter(id => id !== player.id);
    roster.juniorPlayerIds = roster.juniorPlayerIds.filter(id => id !== player.id);
    roster.linePlayerIds = roster.linePlayerIds.map(line => line.map(id => id === player.id ? null : id));
  }
  fixture.state.importState(saved);
  assert.ok(fixture.state.getAvailableFreeAgents().some(row => row.id === player.id));
  fixture.calendar.index = Number.MAX_SAFE_INTEGER;
  assert.ok(fixture.state.advanceToNextSeason());
  assert.equal(fixture.player.affiliation.teamId, "owner");
  assert.equal(fixture.state.getAvailableFreeAgents().some(row => row.id === player.id), false);
  assert.equal(fixture.teams.flatMap(team => team.getRoster()).filter(row => row.id === player.id).length, 1);
  assert.equal(fixture.state.exportState().loans.agreements.find(row => row.id === agreement.id).status, "returned");
});
