import test from "node:test";
import assert from "node:assert/strict";
import { createFixture } from "./AppStateFixture.mjs";
import { LoanUiController } from "../../src/ui/LoanUiController.js";
import { renderLoanSection } from "../../src/ui/LoanSectionRenderer.js";
import { TeamSidebarRenderer } from "../../src/ui/TeamSidebarRenderer.js";
import { ContractTabRenderer } from "../../src/ui/ContractTabRenderer.js";

test("loans have a dedicated optional navigation item, not a contract panel", () => {
  const sidebar = new TeamSidebarRenderer();
  assert.match(sidebar.render(null, "loans"), /data-tab="loans"/);
  assert.doesNotMatch(sidebar.render(null, "contracts", { loansEnabled: false }), /data-tab="loans"/);
  assert.doesNotMatch(new ContractTabRenderer().render([], null), /loan-section|loan-submit/);
});
test("market displays player selection and terms without the old contract dropdown form", () => {
  const { state } = createFixture({ activeTeamId: "borrower" });
  const html = renderLoanSection(new LoanUiController().view(state));
  assert.match(html, /data-action="loan-select-team"/);
  assert.match(html, /data-action="loan-select-player"/);
  assert.match(html, /data-action="loan-submit"/);
  assert.match(html, /Возврат/);
  assert.doesNotMatch(html, /<select/);
});
test("empty market preserves the agreements area and omits a submit action", () => {
  const { state } = createFixture({ loansEnabled: false });
  const html = renderLoanSection(new LoanUiController().view(state));
  assert.match(html, /Аренды отключены/);
  assert.match(html, /Взяты в аренду/);
  assert.doesNotMatch(html, /data-action="loan-submit"/);
});
