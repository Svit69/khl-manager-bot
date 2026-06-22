import { calculateAge, clamp } from "../contracts/SeasonUtils.js";

const bounded = (value) => clamp(Math.round(value), -2, 2);
const setChange = (changes, key, delta) => { if (delta) changes[key] = delta; };
const playoffScore = (stage) => [0, -0.25, 0.2, 0.65, 1.05, 1.55][Math.max(0, Math.min(5, stage))] || 0;

export const calculateCoachRatingGrowth = (coach, { rank, teamCount, stage, seasonDate }) => {
  const regular = coach.teamId ? (teamCount + 1 - rank) / teamCount : -0.2;
  const age = calculateAge(coach.birthDate, seasonDate);
  const ageDrag = age >= 67 ? -1.25 : age >= 62 ? -0.55 : 0;
  const experience = Math.min(0.8, (Number(coach.khlGamesCoached) || 0) / 1300);
  const base = bounded(regular + playoffScore(stage) + experience + ageDrag - 0.45);
  const topHalf = rank > 0 && rank <= Math.ceil(teamCount / 2);
  const changes = {};
  setChange(changes, "tactics", base);
  setChange(changes, "lockerRoom", bounded(base + (topHalf ? 0.35 : -0.15)));
  setChange(changes, "offense", bounded(base + (rank <= 4 ? 0.45 : 0)));
  setChange(changes, "defense", bounded(base + (rank <= 6 ? 0.35 : 0)));
  setChange(changes, "playerDevelopment", bounded(base + (age < 60 ? 0.25 : -0.1)));
  setChange(changes, "playoffPoise", bounded(playoffScore(stage) + (stage ? experience : -0.2)));
  return changes;
};

export const applyCoachRatingGrowth = (coach, changes) => {
  Object.entries(changes || {}).forEach(([key, delta]) => {
    coach.ratings[key] = clamp(Math.round((coach.ratings[key] || 65) + delta), 45, 99);
  });
};
