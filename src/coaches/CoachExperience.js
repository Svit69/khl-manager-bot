const STAGE_KEYS = ["playoffAppearances", "quarterFinals", "semifinals", "finals", "championships"];

export const buildCoachExperience = (profile = {}) => ({
  leagueSeasons: Number(profile.leagueSeasons ?? profile.seasonsCoached) || 0,
  playoffAppearances: Number(profile.playoffAppearances) || 0,
  quarterFinals: Number(profile.quarterFinals) || 0,
  semifinals: Number(profile.semifinals) || 0,
  finals: Number(profile.finals) || 0,
  championships: Number(profile.championships) || 0,
  seasonLog: Array.isArray(profile.seasonLog) ? profile.seasonLog.map((entry) => ({ ...entry })) : [],
});

export const getCoachExperienceScore = (experience = {}) => {
  const seasons = Math.min(18, (Number(experience.leagueSeasons) || 0) * 0.18);
  const playoffs = Math.min(7, (Number(experience.playoffAppearances) || 0) * 0.18);
  const deepRuns = (Number(experience.quarterFinals) || 0) * 0.12 +
    (Number(experience.semifinals) || 0) * 0.22 +
    (Number(experience.finals) || 0) * 0.38 +
    (Number(experience.championships) || 0) * 0.72;
  const earlyExitPenalty = Math.max(0, (Number(experience.playoffAppearances) || 0) - (Number(experience.quarterFinals) || 0)) * 0.18;
  return Math.max(-2, Math.min(7, seasons + playoffs + deepRuns - earlyExitPenalty));
};

export const recordCoachSeasonExperience = (experience, entry = {}) => {
  const seasonLabel = entry.seasonLabel || `legacy-${(experience.seasonLog || []).length + 1}`;
  const log = experience.seasonLog || [];
  let season = log.find((item) => item.seasonLabel === seasonLabel);
  if (!season) {
    season = { seasonLabel, teamId: entry.teamId || null, games: 0, playoffStage: 0 };
    log.push(season);
    experience.leagueSeasons = (Number(experience.leagueSeasons) || 0) + 1;
  }
  const gamesDelta = Math.max(0, (Number(entry.games) || 0) - (Number(season.games) || 0));
  season.games = Math.max(Number(season.games) || 0, Number(entry.games) || 0);
  season.teamId = season.teamId || entry.teamId || null;
  applyPlayoffStage(experience, season, Number(entry.playoffStage) || 0);
  experience.seasonLog = log;
  return { gamesDelta };
};

const applyPlayoffStage = (experience, season, nextStage) => {
  const previousStage = Number(season.playoffStage) || 0;
  const stage = Math.max(previousStage, nextStage);
  for (let index = previousStage; index < stage; index += 1) experience[STAGE_KEYS[index]] = (Number(experience[STAGE_KEYS[index]]) || 0) + 1;
  season.playoffStage = stage;
};
