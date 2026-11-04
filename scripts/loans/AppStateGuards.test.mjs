import assert from "node:assert/strict";
import test from "node:test";
import { createFixture } from "./AppStateFixture.mjs";
test("borrower cannot trade, release or renew a loaned player", () => {
  const fixture = createFixture(); fixture.startLoan(); fixture.state.setActiveTeamId("borrower");
  const before = fixture.state.exportState().contracts;
  assert.equal(fixture.state.evaluateTradeWithTeam("owner", [fixture.player.id], []).isValid, false);
  assert.equal(fixture.state.submitTradeWithTeam("owner", [fixture.player.id], []).accepted, false);
  assert.equal(fixture.state.submitTradeWithTeam("owner", [`player:${fixture.player.id}`], []).accepted, false);
  assert.equal(fixture.state.applySalaryCapComplianceReleases([fixture.player.id]), false);
  assert.equal(fixture.state.submitActiveTeamNegotiation(fixture.player.id, { years: 2, salaryRub: 500000 }).accepted, false);
  assert.deepEqual(fixture.state.exportState().contracts, before);
  assert.equal(fixture.player.affiliation.teamId, "borrower");
});
test("loan start keeps both teams' user-selected line slots and reserve order", () => {
  const fixture = createFixture(), [owner, borrower] = fixture.teams;
  const line = owner.lines[0].players; [line[0], line[1]] = [line[1], line[0]];
  const ids = team => team.lines.map(row => row.players.map(player => player?.id || null));
  const ownerLines = ids(owner), borrowerLines = ids(borrower);
  const reserves = owner.reservePlayers.filter(row => row.id !== fixture.player.id).map(row => row.id);
  fixture.startLoan();
  assert.deepEqual(ids(owner), ownerLines); assert.deepEqual(ids(borrower), borrowerLines);
  assert.deepEqual(owner.reservePlayers.map(row => row.id), reserves);
  assert.equal(borrower.reservePlayers.at(-1), fixture.player);
});
