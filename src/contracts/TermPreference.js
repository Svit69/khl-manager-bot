const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalizePreference = (value) =>
  value === "short" || value === "neutral" || value === "long" ? value : "neutral";

export const getTermPreference = ({ age, declineRate, ufaStatus, fatigueScore, isInjured }) => {
  let score = 0;

  if (age <= 23) score -= 10;
  else if (age <= 27) score += 0;
  else if (age <= 31) score += 5;
  else score += 10;

  const rate = Number(declineRate);
  if (Number.isFinite(rate)) {
    if (rate >= 1.1) score += 10;
    if (rate <= 0.8) score -= 5;
  }

  if (ufaStatus === "NSA") score -= 5;
  if (ufaStatus === "OSA") score += 5;

  const fatigue = Number(fatigueScore);
  if (isInjured) score += 10;
  if (Number.isFinite(fatigue)) {
    if (fatigue >= 90) score += 10;
    else if (fatigue >= 80) score += 5;
  }

  const termPreference = score <= -5 ? "short" : score >= 5 ? "long" : "neutral";
  return { termScore: clamp(score, -50, 50), termPreference };
};

export const getTermMod = (offeredYears, termPreference) => {
  const preference = normalizePreference(termPreference);
  const years = Math.max(1, Number(offeredYears) || 1);

  if (years <= 2) {
    return preference === "short" ? 10 : -5;
  }
  if (years === 3) {
    return preference === "neutral" ? 5 : 0;
  }
  return preference === "long" ? 10 : -10;
};

export const termPreferenceLabel = (termPreference) => {
  const preference = normalizePreference(termPreference);
  if (preference === "short") return "короткий";
  if (preference === "long") return "длинный";
  return "нейтральный";
};
