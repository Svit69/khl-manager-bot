const MINIMUM_DEPTH_SALARY_RUB = 500000;
const POSITION_RESERVE_WEIGHTS = Object.freeze({ FWD: 1, DEF: 1.15, G: 1.35 });

const countMissingPlayersAfterOffer = ({ positionTargets, counts, targetSize, rosterSize, group }) => {
  const projectedCounts = { ...counts, [group]: (counts[group] || 0) + 1 };
  const positionDeficit = Object.entries(positionTargets || {})
    .reduce((sum, [key, target]) => sum + Math.max(0, Number(target) - (projectedCounts[key] || 0)), 0);
  return Math.max(positionDeficit, targetSize - rosterSize - 1, 0);
};

const calculateWeightedReserveRub = ({ positionTargets, counts, group }) =>
  Object.entries(positionTargets || {}).reduce((sum, [key, target]) => {
    const signedOffset = key === group ? 1 : 0;
    const missing = Math.max(0, Number(target) - ((counts[key] || 0) + signedOffset));
    return sum + missing * MINIMUM_DEPTH_SALARY_RUB * (POSITION_RESERVE_WEIGHTS[key] || 1);
  }, 0);

export class AiRosterDepthBudgetGuard {
  canSubmitDepthOffer({ capEnabled, remainingCapRub, offerRub, positionTargets, counts, rosterSize, targetSize, group }) {
    if (!capEnabled) return true;
    const missingAfterOffer = countMissingPlayersAfterOffer({ positionTargets, counts, targetSize, rosterSize, group });
    const minimumReserveRub = Math.max(
      missingAfterOffer * MINIMUM_DEPTH_SALARY_RUB,
      calculateWeightedReserveRub({ positionTargets, counts, group }),
    );
    const projectedRemainingRub = Number(remainingCapRub) - Number(offerRub);
    return projectedRemainingRub >= minimumReserveRub;
  }
}
