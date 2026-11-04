import assert from "node:assert/strict";
import test from "node:test";
import { LoanTestFixture } from "./LoanTestFixture.mjs";
test("age is season year minus birth year, including January 1", () => {
  for (const [birthDate, age, eligible] of [["2004-01-01", 22, true], ["2002-12-31", 24, true],
    ["2001-12-31", 25, false], ["2004-02-30", NaN, false]]) {
    const fixture = new LoanTestFixture({ birthDate });
    const result = fixture.service.evaluate(fixture.request, fixture.context);
    assert.equal(result.age, age); assert.equal(result.eligible, eligible);
  }
});
test("Moscow deadline includes the final second and rejects the next instant", () => {
  const fixture = new LoanTestFixture();
  for (const [currentDate, eligible] of [["2027-01-25T20:59:59.999Z", true],
    ["2027-01-25T21:00:00Z", false], ["2027-01-25", true], ["2026-05-31", false]]) {
    assert.equal(fixture.service.evaluate({ ...fixture.request, currentDate }, fixture.context).eligible, eligible);
  }
});
test("consent, free terms, current owner, and next season contract are mandatory", () => {
  const fixture = new LoanTestFixture();
  for (const [change, reason] of [[{ consent: false }, "CONSENT_REQUIRED"],
    [{ feeRub: 1 }, "LOAN_MUST_BE_FREE"], [{ feeRub: "0" }, "LOAN_MUST_BE_FREE"]]) {
    assert.ok(fixture.service.evaluate({ ...fixture.request, ...change }, fixture.context).reasons.includes(reason));
  }
  fixture.contractService.reassignSeasonContract("player", "2027/2028", "another");
  assert.ok(fixture.service.evaluate(fixture.request, fixture.context).reasons.includes("NEXT_SEASON_CONTRACT_REQUIRED"));
});
