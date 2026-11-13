import test from "node:test";
import assert from "node:assert/strict";
import { createContractImportFixture } from "../contracts/ContractImportTestFixture.mjs";
import { createPlayerSnapshots, restorePlayerSnapshots } from "../../src/state/AppStatePersistence.js";

test("Spartak photo filenames are unique and replace saved placeholders", () => {
  const { teams, all } = createContractImportFixture();
  const roster = teams.find(team => team.shortName === "SPM").getRoster();
  const assignments = [
    ["Уилл Райлли", "will-reilly"],
    ["Александр Брынцев", "alexander-bryntsev"],
    ["Иван Рябов", "ivan-ryabov"],
    ["Илья Котляров", "ilya-kotlyarov"],
    ["Николай Дронов", "nikolai-dronov"],
    ["Сергей Лукьянцев", "sergei-lukyantsev"],
    ["Силантий Кожушко", "silanty-kozhushko"],
    ["Демид Мансуров", "demid-mansurov"],
    ["Даниил Соболев", "daniil-sobolev"],
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
