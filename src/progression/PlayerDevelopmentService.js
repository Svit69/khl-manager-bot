import { calculateAge, clamp } from "../contracts/SeasonUtils.js";
import { applyGoalieAttributeStep } from "./GoalieDevelopmentAttributes.js";
import {
  getGoaliePerformanceDevelopmentComponent,
  getGoalieUsageDevelopmentComponent,
} from "./GoalieDevelopmentMath.js";
import { applyAttributeStep } from "./PlayerDevelopmentAttributes.js";
import {
  getAgeDevelopmentComponent,
  getExpectedProduction,
  getFreeAgentAgeDrivenRegression,
  getFreeAgentGraceGames,
  getFreeAgentPotentialDecay,
  getPeakAgeRealizationComponent,
  getPerformanceDevelopmentComponent,
  getPlayerVolatility,
  getPotentialDevelopmentDelta,
  getPotentialGapComponent,
  getRatingGrowthDifficulty,
  getHighPotentialKhlGrowthComponent,
  getRehabilitationComponent,
  getReserveInactivityRegression,
  getRoleExpectationComponent,
  getRolePotentialPressureDelta,
  getRoleRegressionComponent,
  getRoleUsagePressureComponent,
  getUsageDevelopmentComponent,
  getVeteranRoleTrajectoryComponent,
  getYoungPotentialTrajectoryDelta,
} from "./PlayerDevelopmentComponents.js";
import {
  getAttributeStepThreshold,
  getAverageIceTime,
  getPointsPerGame,
  getShotsPerGame,
  POTENTIAL_STEP_THRESHOLD,
} from "./PlayerDevelopmentShared.js";

export class PlayerDevelopmentService {
  applyMatchDevelopment(team, teamSummary, context = {}) {
    const roster = team?.getRoster?.() || [];
    if (!roster.length) return [];

    const statsById = new Map((teamSummary?.playerStats || []).map((stat) => [stat.playerId, stat]));
    return roster.flatMap((player) => {
      if (this.#isGoalie(player)) return this.#applyGoalieDevelopment(player, statsById.get(player.id) || null, context);
      return this.#applyPlayerDevelopment(player, statsById.get(player.id) || null, context);
    });
  }

  applyOffseasonDevelopment(players, context = {}) {
    return (players || []).flatMap((player) => this.#applyOffseasonPlayerDevelopment(player, context));
  }

  applyFreeAgentInactivity(players, context = {}) {
    if (!["regular", "playoffs"].includes(String(context?.phase || ""))) return [];
    const opportunityCount = Math.max(1, Number(context?.opportunityCount) || 1);
    return (players || []).flatMap((player) => this.#applyFreeAgentInactivityToPlayer(player, opportunityCount));
  }

  #applyGoalieDevelopment(player, matchStat, context) {
    const seasonStats = player.seasonStats;
    const games = Number(seasonStats?.games) || 0;
    if (!games) return [];

    const age = calculateAge(player.identity?.birthDate);
    const potentialGap = (player.potential?.potential || player.ovr) - player.ovr;
    const teamGamesPlayed = Math.max(games, Number(context?.teamGamesPlayed) || 0);
    const developmentDelta = this.#applyCoachDevelopmentMultiplier(this.#scaleDevelopmentDelta(player, age, clamp(
      getAgeDevelopmentComponent(player, age) * 0.82 +
        getGoalieUsageDevelopmentComponent({ age, games, teamGamesPlayed }) +
        getGoaliePerformanceDevelopmentComponent({ player, seasonStats, games }) +
        getPotentialGapComponent(potentialGap) * 0.8 +
        this.#getYoungGoalieStartBonus(player, age, matchStat, teamGamesPlayed),
      -0.16,
      0.2,
    ), potentialGap, 16), context);

    player.potential.addDevelopmentProgress(developmentDelta);
    const events = this.#applyGoalieAttributeThreshold(player, age, {});
    const potentialDelta = this.#scalePotentialDelta(age, this.#getGoaliePotentialDelta(player, age, games, teamGamesPlayed));
    this.#applyPotentialThreshold(player, potentialDelta);
    return events;
  }

  #applyOffseasonGoalieDevelopment(player, context) {
    const seasonStats = player.seasonStats;
    const games = Number(seasonStats?.games) || 0;
    if (!games) return [];

    const age = calculateAge(player.identity?.birthDate, context?.seasonDate || null);
    const potentialGap = (player.potential?.potential || player.ovr) - player.ovr;
    const offseasonDelta = this.#applyCoachDevelopmentMultiplier(this.#scaleDevelopmentDelta(player, age, clamp(
      getAgeDevelopmentComponent(player, age) * 0.52 +
        getGoalieUsageDevelopmentComponent({ age, games, teamGamesPlayed: games }) * 0.55 +
        getGoaliePerformanceDevelopmentComponent({ player, seasonStats, games }) * 0.55 +
        getPotentialGapComponent(potentialGap) * 0.45,
      -0.15,
      0.19,
    ), potentialGap, 16), context);

    player.potential.addDevelopmentProgress(offseasonDelta);
    const events = this.#applyGoalieAttributeThreshold(player, age, { teamId: player.affiliation?.teamId || null });
    const potentialDelta = this.#scalePotentialDelta(age, this.#getGoaliePotentialDelta(player, age, games, games) * 0.65);
    this.#applyPotentialThreshold(player, potentialDelta);
    return events;
  }

  #applyPlayerDevelopment(player, matchStat, context) {
    const seasonStats = player.seasonStats;
    const games = Number(seasonStats?.games) || 0;
    if (!games) return [];

    const age = calculateAge(player.identity?.birthDate);
    const avgIceTime = getAverageIceTime(seasonStats);
    const pointsPerGame = getPointsPerGame(seasonStats);
    const shotsPerGame = getShotsPerGame(seasonStats);
    const expected = getExpectedProduction(player);
    const potentialGap = (player.potential?.potential || player.ovr) - player.ovr;
    const teamGamesPlayed = Math.max(games, Number(context?.teamGamesPlayed) || 0);
    const reserveRegression = getReserveInactivityRegression(player, age, games, avgIceTime, teamGamesPlayed);

    const developmentDelta = this.#applyCoachDevelopmentMultiplier(this.#scaleDevelopmentDelta(player, age, clamp(
      getAgeDevelopmentComponent(player, age) +
        getUsageDevelopmentComponent(player, age, games, avgIceTime, matchStat, context) +
        getPerformanceDevelopmentComponent(
          player,
          age,
          pointsPerGame,
          shotsPerGame,
          expected,
          avgIceTime,
          getPlayerVolatility(player, age),
          games,
          matchStat,
        ) +
        getPotentialGapComponent(potentialGap) +
        getHighPotentialKhlGrowthComponent(player, age, games, avgIceTime, teamGamesPlayed) +
        getPeakAgeRealizationComponent(
          player,
          age,
          potentialGap,
          games,
          avgIceTime,
          pointsPerGame,
          shotsPerGame,
          expected,
        ) +
        this.#getYoungMatchLoadBonus(player, age, matchStat) +
        reserveRegression.development +
        getRoleExpectationComponent(player, age, games, avgIceTime, teamGamesPlayed) +
        getRoleUsagePressureComponent(player, age, games, avgIceTime, teamGamesPlayed) +
        getRoleRegressionComponent(player, age, games, avgIceTime) +
        getVeteranRoleTrajectoryComponent(player, age, games, avgIceTime, pointsPerGame, expected, teamGamesPlayed) +
        getRehabilitationComponent(player, matchStat, avgIceTime),
      -0.18,
      0.22,
    ), potentialGap, avgIceTime), context);

    player.potential.addDevelopmentProgress(developmentDelta);
    const events = this.#applyAttributeThreshold(player, pointsPerGame, shotsPerGame, age, {});

    const potentialDelta = this.#scalePotentialDelta(age,
      getPotentialDevelopmentDelta(player, age, games, avgIceTime, pointsPerGame, shotsPerGame, expected, matchStat) +
      getYoungPotentialTrajectoryDelta(player, age, games, avgIceTime, pointsPerGame, expected, teamGamesPlayed) +
      getRolePotentialPressureDelta(player, age, games, avgIceTime, teamGamesPlayed) +
      reserveRegression.potential);
    this.#applyPotentialThreshold(player, potentialDelta);

    return events;
  }

  #applyOffseasonPlayerDevelopment(player, context) {
    if (!player) return [];
    if (this.#isGoalie(player)) return this.#applyOffseasonGoalieDevelopment(player, context);
    const seasonStats = player.seasonStats;
    const games = Number(seasonStats?.games) || 0;
    if (!games) return [];

    const age = calculateAge(player.identity?.birthDate, context?.seasonDate || null);
    const avgIceTime = getAverageIceTime(seasonStats);
    const pointsPerGame = getPointsPerGame(seasonStats);
    const shotsPerGame = getShotsPerGame(seasonStats);
    const expected = getExpectedProduction(player);
    const potentialGap = (player.potential?.potential || player.ovr) - player.ovr;
    const volatility = getPlayerVolatility(player, age);

    const offseasonDelta = this.#applyCoachDevelopmentMultiplier(this.#scaleDevelopmentDelta(player, age, clamp(
      getAgeDevelopmentComponent(player, age) * 0.6 +
        getUsageDevelopmentComponent(player, age, games, avgIceTime, { games: 1 }, { teamGamesPlayed: games }) * 0.35 +
        getPerformanceDevelopmentComponent(
          player,
          age,
          pointsPerGame,
          shotsPerGame,
          expected,
          avgIceTime,
          volatility,
          games,
          { goals: 0, assists: 0 },
        ) *
          0.4 +
        getPotentialGapComponent(potentialGap) * 0.5 +
        getHighPotentialKhlGrowthComponent(player, age, games, avgIceTime, games) * 0.65 +
        getRoleExpectationComponent(player, age, games, avgIceTime, games) * 0.65 +
        getRoleUsagePressureComponent(player, age, games, avgIceTime, games) * 0.75 +
        getVeteranRoleTrajectoryComponent(player, age, games, avgIceTime, pointsPerGame, expected, games) * 0.75 +
        getPeakAgeRealizationComponent(player, age, potentialGap, games, avgIceTime, pointsPerGame, shotsPerGame, expected) *
          0.75,
      -0.18,
      0.24,
    ), potentialGap, avgIceTime), context);

    player.potential.addDevelopmentProgress(offseasonDelta);
    const events = this.#applyAttributeThreshold(player, pointsPerGame, shotsPerGame, age, {
      teamId: player.affiliation?.teamId || null,
    });

    const potentialDelta = this.#scalePotentialDelta(
      age,
      getPotentialDevelopmentDelta(player, age, games, avgIceTime, pointsPerGame, shotsPerGame, expected, { games: 1 }) * 0.7 +
        getYoungPotentialTrajectoryDelta(player, age, games, avgIceTime, pointsPerGame, expected, games) * 0.55 +
        getRolePotentialPressureDelta(player, age, games, avgIceTime, games) * 0.7,
    );
    this.#applyPotentialThreshold(player, potentialDelta);

    return events;
  }

  #applyFreeAgentInactivityToPlayer(player, opportunityCount) {
    if (!player || player.affiliation?.teamId) {
      player?.potential?.resetFreeAgentInactivity?.();
      return [];
    }

    const age = calculateAge(player.identity?.birthDate);
    const inactivityGames = player.potential.addFreeAgentInactivity(opportunityCount);
    const graceGames = getFreeAgentGraceGames(age);
    if (inactivityGames <= graceGames) return [];

    const inactivityPressure = inactivityGames - graceGames;
    const potentialGap = (player.potential?.potential || player.ovr) - player.ovr;
    const ageDrivenRegression = this.#scaleDevelopmentDelta(
      player,
      age,
      getFreeAgentAgeDrivenRegression(player, age, inactivityPressure),
      potentialGap,
      0,
    );
    const potentialDecay = this.#scalePotentialDelta(age, getFreeAgentPotentialDecay(player, age, inactivityPressure));

    if (ageDrivenRegression !== 0) {
      player.potential.addDevelopmentProgress(ageDrivenRegression);
    }
    const events = this.#isGoalie(player)
      ? this.#applyGoalieAttributeThreshold(player, age, {})
      : this.#applyAttributeThreshold(player, 0, 0, age, {});
    this.#applyPotentialThreshold(player, potentialDecay);
    return events;
  }

  #applyCoachDevelopmentMultiplier(delta, context) {
    const multiplier = Number(context?.coachDevelopmentMultiplier) || 1;
    return delta > 0 ? delta * multiplier : delta;
  }

  #applyAttributeThreshold(player, pointsPerGame, shotsPerGame, age, extraEventFields) {
    const currentProgress = Number(player.potential?.developmentProgress) || 0;
    const threshold = getAttributeStepThreshold(player, currentProgress < 0 ? -1 : 1);
    const attributeDirection = player.potential.consumeDevelopmentStep(threshold);
    if (attributeDirection === 0) return [];

    const beforeOvr = player.ovr;
    const attributeKey = applyAttributeStep(player, attributeDirection, pointsPerGame, shotsPerGame, age);
    const afterOvr = player.ovr;
    if (!attributeKey || afterOvr === beforeOvr) return [];

    return [
      {
        type: afterOvr > beforeOvr ? "upgrade" : "downgrade",
        playerId: player.id,
        playerName: player.name,
        attributeKey,
        oldOvr: beforeOvr,
        newOvr: afterOvr,
        ...extraEventFields,
      },
    ];
  }

  #applyGoalieAttributeThreshold(player, age, extraEventFields) {
    const currentProgress = Number(player.potential?.developmentProgress) || 0;
    const threshold = getAttributeStepThreshold(player, currentProgress < 0 ? -1 : 1);
    const attributeDirection = player.potential.consumeDevelopmentStep(threshold);
    if (attributeDirection === 0) return [];

    const beforeOvr = player.ovr;
    const attributeKey = applyGoalieAttributeStep(player, attributeDirection, { age });
    const afterOvr = player.ovr;
    if (!attributeKey || afterOvr === beforeOvr) return [];

    return [{
      type: afterOvr > beforeOvr ? "upgrade" : "downgrade",
      playerId: player.id,
      playerName: player.name,
      attributeKey,
      oldOvr: beforeOvr,
      newOvr: afterOvr,
      ...extraEventFields,
    }];
  }

  #applyPotentialThreshold(player, potentialDelta) {
    if (!potentialDelta) return;
    player.potential.addPotentialProgress(potentialDelta);
    const potentialDirection = player.potential.consumePotentialStep(POTENTIAL_STEP_THRESHOLD);
    if (potentialDirection !== 0) {
      player.potential.adjustPotential(potentialDirection);
    }
  }

  #getYoungMatchLoadBonus(player, age, matchStat) {
    if (!matchStat || age > 23) return 0;
    const matchMinutes = (Number(matchStat?.totalIceTime) || 0) / 60;
    const gamesSignal = Number(matchStat?.games) || 0;
    if (gamesSignal <= 0 || matchMinutes <= 0) return 0;

    let delta = 0;
    if (matchMinutes >= 20) delta += 0.028;
    else if (matchMinutes >= 17) delta += 0.022;
    else if (matchMinutes >= 14) delta += 0.016;
    else if (matchMinutes >= 10) delta += 0.009;
    else if (matchMinutes >= 6) delta += 0.003;

    if (age <= 18) delta *= 1.35;
    else if (age <= 20) delta *= 1.2;
    else if (age <= 22) delta *= 1.08;

    const lineIndex = Number(player.expectedLineIndex) || null;
    if (lineIndex === 1) delta += 0.006;
    else if (lineIndex === 2) delta += 0.003;

    return clamp(delta, 0, 0.04);
  }

  #getYoungGoalieStartBonus(player, age, matchStat, teamGamesPlayed) {
    if (!matchStat || age > 23) return 0;
    const games = Number(player.seasonStats?.games) || 0;
    const startShare = games / Math.max(1, teamGamesPlayed);
    const savePercentage = Number(player.seasonStats?.savePercentage) || 0;
    let delta = startShare >= 0.35 ? 0.018 : 0.006;
    if (savePercentage >= 0.908) delta += 0.012;
    if (age <= 20) delta *= 1.25;
    return clamp(delta, 0, 0.04);
  }

  #getGoaliePotentialDelta(player, age, games, teamGamesPlayed) {
    const potentialGap = (Number(player.potential?.potential) || player.ovr) - player.ovr;
    const startShare = games / Math.max(1, teamGamesPlayed);
    const savePercentage = Number(player.seasonStats?.savePercentage) || 0;
    let delta = 0;
    if (age <= 23 && potentialGap > 0 && games >= 8 && startShare >= 0.28) delta += 0.026;
    if (age <= 21 && savePercentage >= 0.912 && games >= 10) delta += 0.018;
    if (age <= 24 && games >= 12 && startShare < 0.18) delta -= 0.022;
    if (age >= 31 && savePercentage <= 0.888 && games >= 12) delta -= 0.018;
    return clamp(delta, -0.045, 0.05);
  }

  #isGoalie(player) {
    return player?.identity?.primaryPosition === "ВРТ";
  }

  #getDevelopmentPaceMultiplier(age) {
    if (age <= 23) return 1.5;
    return 1.3;
  }

  #scaleDevelopmentDelta(player, age, value, potentialGap = 0, avgIceTime = 0) {
    const multiplier = this.#getDevelopmentPaceMultiplier(age);
    const pacedValue = value * multiplier;
    const adjustedValue = pacedValue > 0
      ? pacedValue / getRatingGrowthDifficulty(player, age, potentialGap, avgIceTime)
      : pacedValue;
    return clamp(adjustedValue, -0.18 * multiplier, 0.22 * multiplier);
  }

  #scalePotentialDelta(age, value) {
    const multiplier = this.#getDevelopmentPaceMultiplier(age);
    return value * multiplier;
  }
}
