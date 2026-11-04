import test from "node:test";
import assert from "node:assert/strict";
import { LoanBudgetPolicy } from "../../src/loans/LoanBudgetPolicy.js";
import { createFixture } from "./AppStateFixture.mjs";

const evaluate = (change = {}) => {
  const fixture = createFixture(), contracts = fixture.state.exportState().contracts.contracts;
  return new LoanBudgetPolicy().evaluate({ player: fixture.player, fromTeam: fixture.teams[0], toTeam: fixture.teams[1],
    teams: fixture.teams, contracts, season: "2026/2027", capFor: () => 500000000, capEnabled: true, activeTeamId: "owner", ...change });
};
test("loans enforce borrower salary cap even for a user club", () => {
  assert.equal(evaluate().eligible, true);
  assert.ok(evaluate({ capFor: () => 1000000, activeTeamId: "borrower" }).reasons.includes("RECEIVER_SALARY_CAP"));
});
test("owner returning-player payroll and missing future positions remain budgeted", () => {
  const fixture = createFixture(), contracts = fixture.state.exportState().contracts.contracts;
  const future = contracts.filter(row => row.teamId === "owner" && row.season === "2027/2028");
  const sparse = contracts.filter(row => !future.includes(row) || row.playerId === fixture.player.id);
  sparse.find(row => row.playerId === fixture.player.id && row.season === "2027/2028").salaryRub = 499000000;
  assert.ok(evaluate({ contracts: sparse, activeTeamId: "borrower" }).reasons.includes("OWNER_FUTURE_ROSTER_BUDGET"));
  sparse.find(row => row.playerId === fixture.player.id && row.season === "2027/2028").salaryRub = 501000000;
  assert.ok(evaluate({ contracts: sparse, activeTeamId: "borrower" }).reasons.includes("OWNER_FUTURE_SALARY_CAP"));
});
test("disabling salary cap removes financial restrictions but not domain rules", () => {
  assert.equal(evaluate({ capFor: () => 1, capEnabled: false }).eligible, true);
});
