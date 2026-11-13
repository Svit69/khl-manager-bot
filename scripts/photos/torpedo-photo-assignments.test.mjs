import test from "node:test";
import assert from "node:assert/strict";
import { createContractImportFixture } from "../contracts/ContractImportTestFixture.mjs";
import { createPlayerSnapshots, restorePlayerSnapshots } from "../../src/state/AppStatePersistence.js";

test("Torpedo photo filenames are unique and replace saved placeholders", () => {
  const { teams, all } = createContractImportFixture();
  const roster = teams.find(team => team.shortName === "TOR").getRoster();
  const assignments = [
    ["Дмитрий Бреус", "dmitry-breus"],
    ["Сергей Скворцов", "sergei-skvortsov"],
    ["Ян Мельников", "yan-melnikov"],
    ["Александр Пелевин", "alexander-pelevin"],
    ["Владислав Юсупов", "vladislav-yusupov"],
    ["Максим Агафонов", "maxim-agafonov"],
  ];
  for (const [name, filename] of assignments) {
    const player = roster.find(entry => entry.name === name);
    const expected = `./player-photo/${filename}.png`;
    assert.ok(player, name);
    assert.equal(player.identity.photoUrl, expected, name);
    assert.equal(all.filter(entry => entry.identity.photoUrl === expected).length, 1, filename);
    const snapshots = createPlayerSnapshots([player]);
    snapshots[0].identity.photoUrl = "./player-photo/default.png";
    snapshots[0].photoUrl = "./player-photo/default.png";
    restorePlayerSnapshots([player], snapshots);
    assert.equal(player.identity.photoUrl, expected, name);
  }
});
