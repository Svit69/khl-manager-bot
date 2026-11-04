import assert from "node:assert/strict";
import test from "node:test";
import { LoanTestFixture } from "./LoanTestFixture.mjs";
test("four young players allowed, fifth blocked independently in either direction", () => {
  const fixture = new LoanTestFixture(), base = fixture.history();
  for (const field of ["fromTeamId", "toTeamId"]) {
    for (const count of [3, 4]) {
      fixture.service.importRegistry(Array.from({ length: count }, (_, index) => ({ ...base,
        id: `loan${index}`, playerId: `p${index}`, status: "active", age: 22,
        fromTeamId: field === "fromTeamId" ? "owner" : `source${index}`,
        toTeamId: field === "toTeamId" ? "borrower" : `target${index}`,
        originalContract: { ...base.originalContract, teamId: field === "fromTeamId" ? "owner" : `source${index}` } })));
      assert.equal(fixture.service.evaluate(fixture.request, fixture.context).eligible, count === 3);
    }
  }
});
test("at most one age 23/24 player per direction; fourth young slot is flexible", () => {
  const fixture = new LoanTestFixture({ birthDate: "2002-01-01" }), base = fixture.history();
  fixture.service.importRegistry([{ ...base, id: "older", playerId: "other", status: "active", toTeamId: "third" }]);
  assert.ok(fixture.service.evaluate(fixture.request, fixture.context).reasons.includes("OUTGOING_LIMIT"));
});
test("pair quota counts returned loans, is directional and resets next season", () => {
  const fixture = new LoanTestFixture(), base = fixture.history();
  fixture.service.importRegistry([base, { ...base, id: "second" }]);
  assert.ok(fixture.service.evaluate(fixture.request, fixture.context).reasons.includes("PAIR_LIMIT"));
  fixture.service.importRegistry([base, { ...base, id: "reverse", fromTeamId: "borrower", toTeamId: "owner",
    originalContract: { ...base.originalContract, teamId: "borrower" } }]);
  assert.equal(fixture.service.evaluate(fixture.request, fixture.context).eligible, true);
  fixture.service.importRegistry([{ ...base, season: "2025/2026", endDate: "2026-05-31" }]);
  assert.equal(fixture.service.evaluate(fixture.request, fixture.context).eligible, true);
});
