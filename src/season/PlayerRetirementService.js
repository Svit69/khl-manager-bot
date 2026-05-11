import { calculateAge, clamp } from "../contracts/SeasonUtils.js";

const getAverageIceMinutes = (player) => {
  const games = Math.max(1, Number(player?.seasonStats?.games) || 0);
  return ((Number(player?.seasonStats?.totalIceTime) || 0) / 60) / games;
};

const getRetirementChance = ({ player, age, hasNextContract }) => {
  const ovr = Number(player?.ovr) || 0;
  const games = Number(player?.seasonStats?.games) || 0;
  const avgIce = getAverageIceMinutes(player);
  const declineRate = Number(player?.potential?.declineRate) || 0.5;
  const reputation = Number(player?.career?.reputation) || 0;
  const seasonsPlayed = Number(player?.career?.seasonsPlayed) || 0;
  const lineIndex = Number(player?.expectedLineIndex) || null;
  const isFreeAgent = !player?.affiliation?.teamId;

  if (age < 33) return 0;
  if (age < 35 && ovr >= 72 && games >= 20) return 0;

  let chance = 0;
  if (age >= 42) chance += 0.92;
  else if (age >= 40) chance += 0.62;
  else if (age >= 38) chance += 0.38;
  else if (age >= 36) chance += 0.18;
  else if (age >= 34) chance += 0.07;

  if (ovr < 66) chance += 0.28;
  else if (ovr < 70) chance += 0.18;
  else if (ovr < 74) chance += 0.08;
  else if (ovr >= 80) chance -= 0.2;
  else if (ovr >= 76) chance -= 0.09;

  if (!hasNextContract) chance += 0.12;
  if (isFreeAgent) chance += 0.14;
  if (games < 10) chance += 0.12;
  else if (games < 25) chance += 0.06;
  if (avgIce > 0 && avgIce < 8) chance += 0.08;
  else if (avgIce >= 16) chance -= 0.08;

  if (!lineIndex) chance += 0.08;
  else if (lineIndex <= 2) chance -= 0.06;
  else if (lineIndex >= 4) chance += 0.04;

  chance += clamp((declineRate - 0.5) * 0.18, -0.04, 0.1);
  if (seasonsPlayed >= 16) chance += 0.08;
  else if (seasonsPlayed >= 12) chance += 0.04;
  if (reputation >= 90 && ovr >= 74) chance -= 0.08;
  else if (reputation >= 80) chance -= 0.04;

  return clamp(chance, 0, 0.96);
};

const getRetirementRoll = (player, seasonLabel) => {
  const source = `${player?.id || player?.name || ""}:${seasonLabel || ""}:retirement`;
  let hash = 0;
  for (let index = 0; index < source.length; index++) {
    hash = (hash * 31 + source.charCodeAt(index)) % 10000;
  }
  return hash / 10000;
};

const getRetirementReason = ({ player, age, hasNextContract }) => {
  const ovr = Number(player?.ovr) || 0;
  const games = Number(player?.seasonStats?.games) || 0;
  if (age >= 40) return "возраст и длинная карьера";
  if (!hasNextContract) return "нет контракта на следующий сезон";
  if (ovr < 70) return "снижение рейтинга и роли";
  if (games < 15) return "ограниченная игровая практика";
  return "ветеранское решение после сезона";
};

export class PlayerRetirementService {
  evaluate(players, { seasonLabel, seasonDate, hasNextContract }) {
    return (players || [])
      .map((player) => {
        if (!player?.id) return null;
        const age = calculateAge(player.identity?.birthDate, seasonDate);
        const hasContract = Boolean(hasNextContract?.(player));
        const chance = getRetirementChance({ player, age, hasNextContract: hasContract });
        if (chance <= 0 || getRetirementRoll(player, seasonLabel) > chance) return null;
        return {
          player,
          age,
          chance,
          teamId: player.affiliation?.teamId || null,
          reason: getRetirementReason({ player, age, hasNextContract: hasContract }),
        };
      })
      .filter(Boolean);
  }
}
