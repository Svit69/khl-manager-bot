import { calculateAge } from "../contracts/SeasonUtils.js";
import {
  getAgeDevelopmentScore,
  getDevelopmentStepCount,
  getLeagueDevelopmentBonus,
  pickAttributeKey,
  stableUnit,
} from "./ExternalDevelopmentMath.js";

export class ExternalPlayerDevelopmentService {
  applyAnnualDevelopment(players, { seasonDate, seasonLabel } = {}) {
    return (players || []).flatMap((player) => this.#developPlayer(player, seasonDate, seasonLabel));
  }

  #developPlayer(player, seasonDate, seasonLabel) {
    const keys = Object.keys(player?.attributes?.attributesJson || {});
    if (!player?.externalCareer || !keys.length) return [];
    const age = calculateAge(player.identity?.birthDate, seasonDate);
    const potential = Number(player.potential?.potential) || Number(player.ovr) || 0;
    const oldOvr = player.ovr;
    const gap = potential - oldOvr;
    const score = this.#calculateDevelopmentScore(player, age, gap, seasonLabel);
    const direction = score >= 0 ? 1 : -1;
    const steps = getDevelopmentStepCount(score, gap);
    for (let step = 0; step < steps; step += 1) {
      const key = pickAttributeKey(keys, player.id, seasonLabel, step);
      player.attributes.applyAttributeDelta(key, direction);
    }
    return this.#buildDevelopmentEvent(player, oldOvr, direction);
  }

  #calculateDevelopmentScore(player, age, gap, seasonLabel) {
    const randomSwing = (stableUnit(`${player.id}:${seasonLabel}:external-dev`) - 0.5) * 0.18;
    return getAgeDevelopmentScore(age) +
      Math.max(-0.18, gap * 0.05) +
      getLeagueDevelopmentBonus(player.externalCareer.league) +
      randomSwing;
  }

  #buildDevelopmentEvent(player, oldOvr, direction) {
    if (oldOvr === player.ovr) return [];
    return [{ playerId: player.id, playerName: player.name, oldOvr, newOvr: player.ovr, type: direction > 0 ? "upgrade" : "downgrade" }];
  }
}
