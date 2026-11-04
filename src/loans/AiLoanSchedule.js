export const aiLoanHash = (value) => [...String(value)].reduce(
  (hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);

// Nine 60% opportunities and three 5% winter opportunities: mean 5.55, no quota.
export const aiLoanCheckpoints = (seasonLabel) => {
  const year = Number(String(seasonLabel).split('/')[0]);
  if (!Number.isInteger(year) || year < 1900 || year > 9998) return [];
  return ['06-20', '07-12', '08-07', '08-20', '09-10', '09-28',
    '10-16', '11-03', '11-21', '12-15', '01-10', '01-25'].map((day, index) => ({
    date: `${index >= 10 ? year + 1 : year}-${day}`,
    chance: index < 9 ? 0.6 : 0.05,
  }));
};

export const advanceAiLoanSchedule = ({ seasonLabel, currentDate, planState, random, seed = "" }) => {
  const sameSeason = planState?.seasonLabel === seasonLabel;
  const state = { seasonLabel, processed: sameSeason ? [...(planState.processed || [])] : [],
    proposedPlayerIds: sameSeason ? [...(planState.proposedPlayerIds || [])] : [] };
  const parsed = currentDate == null ? new Date(NaN) : new Date(currentDate);
  if (!Number.isFinite(parsed.getTime())) return { state, checkpoint: null };
  const date = parsed.toISOString().slice(0, 10);
  const checkpoints = aiLoanCheckpoints(seasonLabel);
  const due = checkpoints.filter((entry) => entry.date <= date && !state.processed.includes(entry.date));
  state.processed.push(...due.map((entry) => entry.date));
  const latest = due.at(-1);
  const cutoff = checkpoints.at(-1)?.date;
  if (!latest || date > cutoff || Date.parse(date) - Date.parse(latest.date) > 14 * 86400000)
    return { state, checkpoint: null };
  const roll = random ? random() : aiLoanHash(`${seed ? `${seed}:` : ""}${seasonLabel}:${latest.date}:activity`) / 4294967296;
  return { state, checkpoint: Number.isFinite(roll) && roll >= 0 && roll < latest.chance ? latest.date : null };
};
