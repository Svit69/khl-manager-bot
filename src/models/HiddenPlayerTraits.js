import { PlayerPosition } from "./PlayerPosition.js";

export const HiddenPlayerTrait = Object.freeze({
  PLAYOFF_CHOKER: "playoff_choker",
  UNDISCIPLINED: "undisciplined",
  ATTACK_SUPPRESSOR: "attack_suppressor",
  POWER_PLAY_SPECIALIST: "power_play_specialist",
  PENALTY_KILL_SPECIALIST: "penalty_kill_specialist",
  PLAYMAKER: "playmaker",
  IRON_LUNGS: "iron_lungs",
});

export const normalizeHiddenTraits = (traits = []) =>
  [...new Set((Array.isArray(traits) ? traits : []).filter((trait) => Object.values(HiddenPlayerTrait).includes(trait)))];

export const hasHiddenTrait = (player, trait) =>
  normalizeHiddenTraits(player?.hiddenTraits).includes(trait);

export const getJuniorHiddenTraits = ({ position, seed, talentRoll }) => {
  const traits = [];
  const roll = (salt) => Math.abs(hash(`${seed}:${salt}`)) % 1000;
  const eliteBonus = Number(talentRoll) >= 90 ? 18 : Number(talentRoll) >= 70 ? 8 : 0;

  if (roll("trait-any") >= 210 + eliteBonus) return traits;

  if (position === PlayerPosition.DEF) {
    if (roll("def-trait") < 360) traits.push(HiddenPlayerTrait.ATTACK_SUPPRESSOR);
    else if (roll("pk-trait") < 610) traits.push(HiddenPlayerTrait.PENALTY_KILL_SPECIALIST);
  } else if (position !== PlayerPosition.G) {
    if (roll("fwd-trait") < 280) traits.push(HiddenPlayerTrait.PLAYMAKER);
    else if (roll("pp-trait") < 520) traits.push(HiddenPlayerTrait.POWER_PLAY_SPECIALIST);
  }

  if (roll("iron-lungs") < 155 + eliteBonus) traits.push(HiddenPlayerTrait.IRON_LUNGS);
  if (roll("undisciplined") < 65) traits.push(HiddenPlayerTrait.UNDISCIPLINED);
  if (roll("playoff-choker") < 45) traits.push(HiddenPlayerTrait.PLAYOFF_CHOKER);

  return normalizeHiddenTraits(traits).slice(0, Number(talentRoll) >= 90 ? 2 : 1);
};

const hash = (source) => {
  let value = 0;
  for (let index = 0; index < String(source).length; index++) {
    value = (value * 31 + String(source).charCodeAt(index)) % 1000003;
  }
  return value;
};
