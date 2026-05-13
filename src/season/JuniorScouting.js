const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getHash = (source) => {
  let value = 0;
  for (let index = 0; index < source.length; index += 1) {
    value = (value * 31 + source.charCodeAt(index)) % 1000003;
  }
  return value;
};

export const getJuniorPracticeProfile = (player) => {
  const khlGames = Number(player?.seasonStats?.games) || 0;
  const careerGames = Number(player?.career?.khlGamesPlayed) || 0;
  const score = clamp(Math.round(khlGames * 4 + Math.min(30, careerGames) * 0.5), 0, 100);
  if (khlGames >= 20) return { khlGames, careerGames, score, label: "Практика основы" };
  if (khlGames >= 8) return { khlGames, careerGames, score, label: "Ротация основы" };
  if (khlGames > 0) return { khlGames, careerGames, score, label: "Эпизоды" };
  return { khlGames, careerGames, score, label: "Молодежка" };
};

export const getScoutedPotential = (player, seasonLabel) => {
  const potential = Number(player?.potential?.potential) || Number(player?.ovr) || 0;
  const age = Number(player?.juniorSeasonAge) || 18;
  const practice = getJuniorPracticeProfile(player);
  const baseUncertainty = age <= 16 ? 8 : age === 17 ? 7 : age === 18 ? 6 : age === 19 ? 5 : 4;
  const practiceReduction = practice.khlGames >= 20 ? 3 : practice.khlGames >= 8 ? 2 : practice.khlGames > 0 ? 1 : 0;
  const reputationReduction = Number(player?.career?.reputation) >= 30 ? 1 : 0;
  const uncertainty = clamp(baseUncertainty - practiceReduction - reputationReduction, 2, 9);
  const offset = (getHash(`${player?.id || player?.name}:${seasonLabel}:scout`) % 5) - 2;
  const low = clamp(potential - uncertainty + Math.min(0, offset), 45, 99);
  const high = clamp(potential + uncertainty + Math.max(0, offset), low, 99);
  const confidence = uncertainty <= 3 ? "Высокая" : uncertainty <= 5 ? "Средняя" : "Низкая";
  return { low, high, label: `${low}-${high}`, confidence, uncertainty };
};
