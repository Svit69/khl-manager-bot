import { calculateAge, clamp } from "../contracts/SeasonUtils.js";
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
  getRehabilitationComponent,
  getReserveInactivityRegression,
  getRoleRegressionComponent,
  getUsageDevelopmentComponent,
} from "./PlayerDevelopmentComponents.js";
import {
  ATTRIBUTE_STEP_THRESHOLD,
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
      if (player.identity?.isGoalie) return [];
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

    const developmentDelta = this.#scaleDevelopmentDelta(age, clamp(
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
        getRoleRegressionComponent(player, age, games, avgIceTime) +
        getRehabilitationComponent(player, matchStat, avgIceTime),
      -0.18,
      0.22,
    ));

    player.potential.addDevelopmentProgress(developmentDelta);
    const events = this.#applyAttributeThreshold(player, pointsPerGame, shotsPerGame, age, {});

    const potentialDelta = this.#scalePotentialDelta(age,
      getPotentialDevelopmentDelta(player, age, games, avgIceTime, pointsPerGame, shotsPerGame, expected, matchStat) +
      reserveRegression.potential);
    this.#applyPotentialThreshold(player, potentialDelta);

    return events;
  }

  #applyOffseasonPlayerDevelopment(player, context) {
    if (!player || player.identity?.isGoalie) return [];
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

    const offseasonDelta = this.#scaleDevelopmentDelta(age, clamp(
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
        getPeakAgeRealizationComponent(player, age, potentialGap, games, avgIceTime, pointsPerGame, shotsPerGame, expected) *
          0.75,
      -0.18,
      0.24,
    ));

    player.potential.addDevelopmentProgress(offseasonDelta);
    const events = this.#applyAttributeThreshold(player, pointsPerGame, shotsPerGame, age, {
      teamId: player.affiliation?.teamId || null,
    });

    const potentialDelta = this.#scalePotentialDelta(
      age,
      getPotentialDevelopmentDelta(player, age, games, avgIceTime, pointsPerGame, shotsPerGame, expected, { games: 1 }) * 0.7,
    );
    this.#applyPotentialThreshold(player, potentialDelta);

    return events;
  }

  #applyFreeAgentInactivityToPlayer(player, opportunityCount) {
    if (!player || player.identity?.isGoalie || player.affiliation?.teamId) {
      player?.potential?.resetFreeAgentInactivity?.();
      return [];
    }

    const age = calculateAge(player.identity?.birthDate);
    const inactivityGames = player.potential.addFreeAgentInactivity(opportunityCount);
    const graceGames = getFreeAgentGraceGames(age);
    if (inactivityGames <= graceGames) return [];

    const inactivityPressure = inactivityGames - graceGames;
    const ageDrivenRegression = this.#scaleDevelopmentDelta(age, getFreeAgentAgeDrivenRegression(player, age, inactivityPressure));
    const potentialDecay = this.#scalePotentialDelta(age, getFreeAgentPotentialDecay(player, age, inactivityPressure));

    if (ageDrivenRegression !== 0) {
      player.potential.addDevelopmentProgress(ageDrivenRegression);
    }
    const events = this.#applyAttributeThreshold(player, 0, 0, age, {});
    this.#applyPotentialThreshold(player, potentialDecay);
    return events;
  }

  #applyAttributeThreshold(player, pointsPerGame, shotsPerGame, age, extraEventFields) {
    const attributeDirection = player.potential.consumeDevelopmentStep(ATTRIBUTE_STEP_THRESHOLD);
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

  #getDevelopmentPaceMultiplier(age) {
    if (age <= 23) return 1.5;
    return 1.3;
  }

  #scaleDevelopmentDelta(age, value) {
    const multiplier = this.#getDevelopmentPaceMultiplier(age);
    return clamp(value * multiplier, -0.18 * multiplier, 0.22 * multiplier);
  }

  #scalePotentialDelta(age, value) {
    const multiplier = this.#getDevelopmentPaceMultiplier(age);
    return value * multiplier;
  }
}
