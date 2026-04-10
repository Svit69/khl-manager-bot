import { getNegotiationDecision } from "../contracts/ContractServiceNegotiation.js";

export const upsertCompetitiveOffer = (offers, nextOffer) => {
  const safeOffers = Array.isArray(offers) ? offers : [];
  if (!nextOffer?.playerId || !nextOffer?.teamId || !nextOffer?.offer) return safeOffers;
  const filtered = safeOffers.filter(
    (entry) =>
      !(entry.playerId === nextOffer.playerId && entry.teamId === nextOffer.teamId),
  );
  return [...filtered, nextOffer];
};

export const collectResolvableOfferGroups = (offers, decisionIndex) => {
  const grouped = new Map();
  (offers || [])
    .filter((entry) => Number(entry?.decisionIndex) === Number(decisionIndex))
    .forEach((entry) => {
      if (!grouped.has(entry.playerId)) grouped.set(entry.playerId, []);
      grouped.get(entry.playerId).push(entry);
    });
  return grouped;
};

export const scoreCompetitiveOffer = (preview, offerEntry) => {
  const chance = Number(preview?.state?.chance) || 0;
  const willingness = Number(preview?.willingness) || 0;
  const salaryRatio = Number(preview?.salaryRatio) || 0;
  const projectedRoleScore = Number(preview?.projectedRoleScore ?? preview?.roleScore) || 0;
  const teamStrengthAppeal = Number(preview?.teamStrengthAppeal) || 0;
  const aiSourcePenalty = offerEntry?.source === "ai" ? 0 : 0.15;
  const noise = ((stableOfferHash(offerEntry) % 11) - 5) * 0.12;
  return (
    willingness +
    chance * 0.22 +
    salaryRatio * 14 +
    projectedRoleScore * 1.8 +
    teamStrengthAppeal * 0.8 +
    aiSourcePenalty +
    noise
  );
};

export const shouldAcceptCompetitiveOffer = (preview, player) => {
  const willingness = Number(preview?.willingness) || 0;
  if (preview?.ufaStatus === "NSA" && willingness < 46) return false;
  if (willingness < 36) return false;
  const chance = Math.max(0, Math.min(100, Number(preview?.state?.chance) || 0));
  const rollThreshold = stableAcceptanceRoll(player, preview);
  return rollThreshold <= chance;
};

export const buildCompetitiveOfferDecision = ({ player, offerEntries, previewByTeamId }) => {
  const ranked = [...(offerEntries || [])]
    .map((entry) => ({
      entry,
      preview: previewByTeamId.get(entry.teamId) || null,
      score: scoreCompetitiveOffer(previewByTeamId.get(entry.teamId), entry),
    }))
    .filter((item) => item.preview)
    .sort((left, right) => right.score - left.score);

  const best = ranked[0] || null;
  if (!best) {
    return {
      decision: "reject",
      winningOffer: null,
      preview: null,
    };
  }

  const directDecision = getNegotiationDecision(best.preview, player);
  const accepted = directDecision === "accept" || (directDecision === "counter" && shouldAcceptCompetitiveOffer(best.preview, player));
  return {
    decision: accepted ? "accept" : "reject",
    winningOffer: best.entry,
    preview: best.preview,
  };
};

export const formatSalaryMillions = (salaryRub) => {
  const value = (Number(salaryRub) || 0) / 1000000;
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".0", "");
};

const stableOfferHash = (offerEntry) => {
  const source = `${offerEntry?.playerId || ""}:${offerEntry?.teamId || ""}:${offerEntry?.offer?.salaryRub || 0}:${offerEntry?.offer?.years || 0}`;
  let hash = 0;
  for (let index = 0; index < source.length; index++) {
    hash = (hash * 33 + source.charCodeAt(index)) % 104729;
  }
  return hash;
};

const stableAcceptanceRoll = (player, preview) => {
  const source = `${player?.id || player?.name || ""}:${preview?.offer?.salaryRub || 0}:${preview?.offer?.years || 0}:${preview?.teamId || ""}`;
  let hash = 0;
  for (let index = 0; index < source.length; index++) {
    hash = (hash * 31 + source.charCodeAt(index)) % 1000;
  }
  return hash / 10;
};
