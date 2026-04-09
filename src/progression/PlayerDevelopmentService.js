import { calculateAge, clamp } from "../contracts/SeasonUtils.js";

const ATTRIBUTE_STEP_THRESHOLD = 2.1;
const POTENTIAL_STEP_THRESHOLD = 1.2;
const FORWARD_POSITIONS = new Set(["\u041b\u041d\u041f", "\u0426\u0422\u0420", "\u041f\u041d\u041f"]);

const average = (items) => items.length ? items.reduce((total, value) => total + value, 0) / items.length : 0;

export class PlayerDevelopmentService {
  applyMatchDevelopment(team, teamSummary, context = {}) {
    const roster = team?.getRoster?.() || [];
    if (!roster.length) return [];

    const statsById = new Map((teamSummary?.playerStats || []).map((stat) => [stat.playerId, stat]));
    const events = [];
    roster.forEach((player) => {
      if (player.identity?.isGoalie) return;
      events.push(...this.#applyPlayerDevelopment(player, statsById.get(player.id) || null, context));
    });
    return events;
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
    const events = [];

    const age = calculateAge(player.identity?.birthDate);
    const avgIceTime = this.#getAverageIceTime(seasonStats);
    const pointsPerGame = this.#getPointsPerGame(seasonStats);
    const shotsPerGame = this.#getShotsPerGame(seasonStats);
    const expected = this.#getExpectedProduction(player);
    const potentialGap = (player.potential?.potential || player.ovr) - player.ovr;

    const volatility = this.#getPlayerVolatility(player, age);
    const ageComponent = this.#getAgeDevelopmentComponent(player, age);
    const usageComponent = this.#getUsageDevelopmentComponent(player, age, games, avgIceTime, matchStat, context);
    const performanceComponent = this.#getPerformanceDevelopmentComponent(player, age, pointsPerGame, shotsPerGame, expected, avgIceTime, volatility);
    const ceilingComponent = this.#getPotentialGapComponent(potentialGap);
    const peakAgeComponent = this.#getPeakAgeRealizationComponent(player, age, potentialGap, games, avgIceTime, pointsPerGame, shotsPerGame, expected);
    const youngLoadBonus = this.#getYoungMatchLoadBonus(player, age, matchStat);
    const developmentDelta = clamp(
      ageComponent + usageComponent + performanceComponent + ceilingComponent + peakAgeComponent + youngLoadBonus,
      -0.18,
      0.22,
    );

    player.potential.addDevelopmentProgress(developmentDelta);
    const attributeDirection = player.potential.consumeDevelopmentStep(ATTRIBUTE_STEP_THRESHOLD);
    if (attributeDirection !== 0) {
      const beforeOvr = player.ovr;
      const attributeKey = this.#applyAttributeStep(player, attributeDirection, pointsPerGame, shotsPerGame);
      const afterOvr = player.ovr;
      if (attributeKey && afterOvr !== beforeOvr) {
        events.push({
          type: afterOvr > beforeOvr ? "upgrade" : "downgrade",
          playerId: player.id,
          playerName: player.name,
          attributeKey,
          oldOvr: beforeOvr,
          newOvr: afterOvr,
        });
      }
    }

    const potentialDelta = this.#getPotentialDevelopmentDelta(player, age, games, avgIceTime, pointsPerGame, shotsPerGame, expected, matchStat);
    if (potentialDelta !== 0) {
      player.potential.addPotentialProgress(potentialDelta);
      const potentialDirection = player.potential.consumePotentialStep(POTENTIAL_STEP_THRESHOLD);
      if (potentialDirection !== 0) {
        player.potential.adjustPotential(potentialDirection);
      }
    }
    return events;
  }

  #applyOffseasonPlayerDevelopment(player, context) {
    if (!player || player.identity?.isGoalie) return [];
    const seasonStats = player.seasonStats;
    const games = Number(seasonStats?.games) || 0;
    if (!games) return [];

    const age = calculateAge(player.identity?.birthDate, context?.seasonDate || null);
    const avgIceTime = this.#getAverageIceTime(seasonStats);
    const pointsPerGame = this.#getPointsPerGame(seasonStats);
    const shotsPerGame = this.#getShotsPerGame(seasonStats);
    const expected = this.#getExpectedProduction(player);
    const potentialGap = (player.potential?.potential || player.ovr) - player.ovr;

    const volatility = this.#getPlayerVolatility(player, age);
    const offseasonDelta = clamp(
      this.#getAgeDevelopmentComponent(player, age) * 0.6 +
      this.#getUsageDevelopmentComponent(player, age, games, avgIceTime, { games: 1 }, { teamGamesPlayed: games }) * 0.35 +
      this.#getPerformanceDevelopmentComponent(player, age, pointsPerGame, shotsPerGame, expected, avgIceTime, volatility) * 0.4 +
      this.#getPotentialGapComponent(potentialGap) * 0.5 +
      this.#getPeakAgeRealizationComponent(player, age, potentialGap, games, avgIceTime, pointsPerGame, shotsPerGame, expected) * 0.75,
      -0.18,
      0.24,
    );

    const events = [];
    player.potential.addDevelopmentProgress(offseasonDelta);
    const attributeDirection = player.potential.consumeDevelopmentStep(ATTRIBUTE_STEP_THRESHOLD);
    if (attributeDirection !== 0) {
      const beforeOvr = player.ovr;
      const attributeKey = this.#applyAttributeStep(player, attributeDirection, pointsPerGame, shotsPerGame);
      const afterOvr = player.ovr;
      if (attributeKey && afterOvr !== beforeOvr) {
        events.push({
          type: afterOvr > beforeOvr ? "upgrade" : "downgrade",
          teamId: player.affiliation?.teamId || null,
          playerId: player.id,
          playerName: player.name,
          attributeKey,
          oldOvr: beforeOvr,
          newOvr: afterOvr,
        });
      }
    }

    const potentialDelta = this.#getPotentialDevelopmentDelta(player, age, games, avgIceTime, pointsPerGame, shotsPerGame, expected, { games: 1 }) * 0.7;
    if (potentialDelta !== 0) {
      player.potential.addPotentialProgress(potentialDelta);
      const potentialDirection = player.potential.consumePotentialStep(POTENTIAL_STEP_THRESHOLD);
      if (potentialDirection !== 0) {
        player.potential.adjustPotential(potentialDirection);
      }
    }

    return events;
  }

  #applyFreeAgentInactivityToPlayer(player, opportunityCount) {
    if (!player || player.identity?.isGoalie || player.affiliation?.teamId) {
      player?.potential?.resetFreeAgentInactivity?.();
      return [];
    }

    const age = calculateAge(player.identity?.birthDate);
    const inactivityGames = player.potential.addFreeAgentInactivity(opportunityCount);
    const graceGames = this.#getFreeAgentGraceGames(age);
    if (inactivityGames <= graceGames) return [];

    const inactivityPressure = inactivityGames - graceGames;
    const ageDrivenRegression = this.#getFreeAgentAgeDrivenRegression(player, age, inactivityPressure);
    const potentialDecay = this.#getFreeAgentPotentialDecay(player, age, inactivityPressure);
    const events = [];

    if (ageDrivenRegression !== 0) {
      player.potential.addDevelopmentProgress(ageDrivenRegression);
      const attributeDirection = player.potential.consumeDevelopmentStep(ATTRIBUTE_STEP_THRESHOLD);
      if (attributeDirection !== 0) {
        const beforeOvr = player.ovr;
        const attributeKey = this.#applyAttributeStep(player, attributeDirection, 0, 0);
        const afterOvr = player.ovr;
        if (attributeKey && afterOvr !== beforeOvr) {
          events.push({
            type: afterOvr > beforeOvr ? "upgrade" : "downgrade",
            playerId: player.id,
            playerName: player.name,
            attributeKey,
            oldOvr: beforeOvr,
            newOvr: afterOvr,
          });
        }
      }
    }

    if (potentialDecay !== 0) {
      player.potential.addPotentialProgress(potentialDecay);
      const potentialDirection = player.potential.consumePotentialStep(POTENTIAL_STEP_THRESHOLD);
      if (potentialDirection !== 0) {
        player.potential.adjustPotential(potentialDirection);
      }
    }

    return events;
  }

  #getAgeDevelopmentComponent(player, age) {
    const growthRate = Number(player.potential?.growthRate) || 1;
    const declineRate = Number(player.potential?.declineRate) || 1;
    const peakAge = Number(player.potential?.peakAge) || 27;

    if (age <= 18) return 0.086 * growthRate;
    if (age <= 20) return 0.069 * growthRate;
    if (age <= 23) return 0.046 * growthRate;
    if (age < peakAge) return 0.021 * growthRate;
    if (age <= peakAge + 1) return 0.004;
    if (age <= peakAge + 3) return -0.014 * declineRate;
    return -0.025 * declineRate * (1 + Math.min(0.6, (age - peakAge - 3) * 0.08));
  }

  #getUsageDevelopmentComponent(player, age, games, avgIceTime, matchStat, context) {
    const teamGamesPlayed = Math.max(games, Number(context?.teamGamesPlayed) || 0);
    let delta = 0;
    if (matchStat) delta += 0.012;
    if (avgIceTime >= 18) delta += 0.05;
    else if (avgIceTime >= 14) delta += 0.035;
    else if (avgIceTime >= 10) delta += 0.02;
    else if (avgIceTime >= 6) delta += 0.005;
    else delta -= 0.025;

    if (teamGamesPlayed >= 12 && games >= teamGamesPlayed * 0.6) delta += 0.014;
    if (!matchStat && games >= 10 && avgIceTime < 7) delta -= 0.015;
    if (age <= 23) delta += this.#getYoungPlayerUsageBoost(player, age, games, avgIceTime, teamGamesPlayed);
    delta += this.#getQualityOfMinutesBoost(player, age, avgIceTime, matchStat);
    delta += this.#getYoungDefenseTopFourBoost(player, age, avgIceTime);

    return delta * 1.15;
  }

  #getPerformanceDevelopmentComponent(player, age, pointsPerGame, shotsPerGame, expected, avgIceTime, volatility) {
    const ppgGap = pointsPerGame - expected.pointsPerGame;
    const shotsGap = shotsPerGame - expected.shotsPerGame;
    const isForward = FORWARD_POSITIONS.has(player.identity?.primaryPosition);
    let delta = isForward
      ? ppgGap * 0.22 + shotsGap * 0.045
      : ppgGap * 0.12 + shotsGap * 0.025 + this.#getDefensePerformanceSignal(player, avgIceTime);
    if (age <= 21) {
      if (delta > 0) delta *= 1.28 + (volatility - 1) * 0.6;
      else delta *= 0.8 + Math.max(0, 1 - volatility) * 0.4;
      if (pointsPerGame >= expected.pointsPerGame * 0.95) {
        delta += 0.01 * (Number(player.potential?.growthRate) || 1);
      }
    } else if (age <= 23 && delta > 0) {
      delta *= 1.12 + Math.max(0, volatility - 1) * 0.35;
    } else if (delta > 0) {
      delta *= 0.98 + Math.max(0, volatility - 1) * 0.2;
    }
    return clamp(delta * 1.15, -0.069, 0.126);
  }

  #getPotentialGapComponent(potentialGap) {
    if (potentialGap >= 8) return 0.03;
    if (potentialGap >= 4) return 0.02;
    if (potentialGap >= 1) return 0.01;
    if (potentialGap <= -2) return -0.02;
    return 0;
  }

  #getPeakAgeRealizationComponent(player, age, potentialGap, games, avgIceTime, pointsPerGame, shotsPerGame, expected) {
    const peakAge = Number(player.potential?.peakAge) || 27;
    if (potentialGap <= 0 || games < 12 || avgIceTime < 10 || age < peakAge - 3 || age > peakAge + 1) return 0;

    const growthRate = Number(player.potential?.growthRate) || 1;
    const distance = Math.abs(age - peakAge);
    const proximityBonus = distance === 0 ? 0.026 : distance === 1 ? 0.02 : distance === 2 ? 0.013 : 0.007;
    const usageFactor = clamp((avgIceTime - 10) / 10, 0, 1);
    const productionSignal = clamp(
      Math.max(0, pointsPerGame - expected.pointsPerGame) * 0.08 +
      Math.max(0, shotsPerGame - expected.shotsPerGame) * 0.015,
      0,
      0.025,
    );
    const gapFactor = clamp(potentialGap / 6, 0.2, 1);
    return clamp((proximityBonus + productionSignal) * growthRate * (0.55 + usageFactor * 0.45) * gapFactor, 0, 0.04);
  }

  #getPotentialDevelopmentDelta(player, age, games, avgIceTime, pointsPerGame, shotsPerGame, expected, matchStat) {
    if (age > 24 || !matchStat) return 0;
    const isYoungCore = age <= 21;
    if (games < (isYoungCore ? 8 : 12) || avgIceTime < (isYoungCore ? 9 : 10)) return 0;

    const pointsGap = Math.max(0, pointsPerGame - expected.pointsPerGame);
    const shotsGap = Math.max(0, shotsPerGame - expected.shotsPerGame);
    const usageSignal = isYoungCore ? clamp((avgIceTime - 12) * 0.004 + Math.max(0, games - 10) * 0.0015, 0, 0.04) : 0;
    const breakoutSignal = clamp(pointsGap * 0.12 + shotsGap * 0.025 + usageSignal, 0, 0.14);
    if (breakoutSignal <= (isYoungCore ? 0.008 : 0.015)) return 0;

    let delta = breakoutSignal + 0.01;
    if (age <= 21 && avgIceTime >= 14) delta += 0.015;
    if (age <= 20 && avgIceTime >= 17) delta += 0.015;
    if ((player.potential?.potential || 0) - player.ovr <= 2) delta += 0.01;
    delta *= Number(player.potential?.growthRate) || 1;
    return clamp(delta, 0, isYoungCore ? 0.16 : 0.12);
  }

  #getFreeAgentGraceGames(age) {
    if (age <= 20) return 18;
    if (age <= 24) return 15;
    if (age <= 28) return 12;
    return 10;
  }

  #getFreeAgentAgeDrivenRegression(player, age, inactivityPressure) {
    const declineRate = Number(player.potential?.declineRate) || 0.3;
    const growthRate = Number(player.potential?.growthRate) || 0.3;
    let delta = 0;

    if (age <= 20) delta = -0.003 - inactivityPressure * 0.0005;
    else if (age <= 24) delta = -0.007 - inactivityPressure * 0.001;
    else if (age <= 28) delta = -0.013 - inactivityPressure * 0.0016;
    else if (age <= 31) delta = -0.02 - inactivityPressure * 0.0023;
    else delta = -0.028 - inactivityPressure * 0.0032;

    if (age <= 22) delta *= Math.max(0.7, 1 - growthRate * 0.2);
    if (age >= 29) delta *= 1 + declineRate * 0.35;

    return clamp(delta, -0.11, 0);
  }

  #getFreeAgentPotentialDecay(player, age, inactivityPressure) {
    const growthRate = Number(player.potential?.growthRate) || 0.3;
    let delta = 0;

    if (age <= 19) delta = -0.028 - inactivityPressure * 0.0032;
    else if (age <= 22) delta = -0.021 - inactivityPressure * 0.0024;
    else if (age <= 25) delta = -0.012 - inactivityPressure * 0.0015;
    else delta = -0.004 - inactivityPressure * 0.0006;

    delta *= Math.max(0.85, Math.min(1.25, 1 + (growthRate - 0.3) * 0.45));
    return clamp(delta, -0.12, 0);
  }

  #getYoungPlayerUsageBoost(player, age, games, avgIceTime, teamGamesPlayed) {
    const growthRate = Number(player.potential?.growthRate) || 1;
    let delta = 0;

    if (avgIceTime >= 20) delta += 0.04;
    else if (avgIceTime >= 17) delta += 0.03;
    else if (avgIceTime >= 14) delta += 0.022;
    else if (avgIceTime >= 11) delta += 0.012;

    if (teamGamesPlayed >= 10 && games >= teamGamesPlayed * 0.75) delta += 0.016;
    if (teamGamesPlayed >= 16 && games >= teamGamesPlayed * 0.85) delta += 0.01;
    if (age <= 18) delta *= 1.3;
    else if (age <= 20) delta *= 1.18;
    else if (age <= 22) delta *= 1.08;
    if (age <= 19 && avgIceTime >= 16) delta += 0.016;
    if (age <= 20 && avgIceTime >= 18) delta += 0.01;

    return delta * Math.max(0.85, Math.min(1.3, growthRate));
  }

  #getQualityOfMinutesBoost(player, age, avgIceTime, matchStat) {
    const lineIndex = Number(player.expectedLineIndex) || null;
    let delta = 0;
    if (lineIndex === 1) delta += 0.012;
    else if (lineIndex === 2) delta += 0.007;
    else if (lineIndex === 3) delta += 0.003;
    else if (lineIndex === 4) delta -= 0.004;

    if (age <= 22 && avgIceTime >= 15 && lineIndex && lineIndex <= 2) delta += 0.008;
    if (age <= 20 && avgIceTime >= 17 && lineIndex === 1) delta += 0.01;

    const matchMinutes = ((Number(matchStat?.totalIceTime) || 0) / 60);
    if (age <= 21 && matchMinutes >= 18) delta += 0.008;
    else if (age <= 21 && matchMinutes >= 14) delta += 0.004;

    return delta;
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

  #getYoungDefenseTopFourBoost(player, age, avgIceTime) {
    if (FORWARD_POSITIONS.has(player.identity?.primaryPosition) || player.identity?.isGoalie || age > 23) return 0;

    const lineIndex = Number(player.expectedLineIndex) || null;
    let delta = 0;

    if (lineIndex === 1 || lineIndex === 2) delta += 0.008;
    if (avgIceTime >= 22) delta += 0.018;
    else if (avgIceTime >= 19) delta += 0.012;
    else if (avgIceTime >= 16) delta += 0.006;

    if (age <= 20 && lineIndex && lineIndex <= 2) delta += 0.008;
    else if (age <= 22 && lineIndex && lineIndex <= 2) delta += 0.004;

    return clamp(delta, 0, 0.03);
  }

  #getDefensePerformanceSignal(player, avgIceTime) {
    const attrs = player.attributes?.attributesJson || {};
    const defense = Number(attrs.defense) || 0;
    const physical = Number(attrs.physical) || 0;
    const lineIndex = Number(player.expectedLineIndex) || null;
    let delta = 0;

    if (avgIceTime >= 21) delta += 0.035;
    else if (avgIceTime >= 18) delta += 0.024;
    else if (avgIceTime >= 15) delta += 0.012;

    if (lineIndex === 1) delta += 0.012;
    else if (lineIndex === 2) delta += 0.006;

    if (defense >= 80) delta += 0.014;
    else if (defense >= 75) delta += 0.008;
    if (physical >= 80) delta += 0.007;

    return clamp(delta, -0.01, 0.055);
  }

  #getPlayerVolatility(player, age) {
    const seedSource = `${player.id || player.name || ""}`;
    let hash = 0;
    for (let index = 0; index < seedSource.length; index++) {
      hash = ((hash * 31) + seedSource.charCodeAt(index)) % 9973;
    }
    const normalized = (hash % 1000) / 1000;
    let amplitude = age <= 19 ? 0.16 : age <= 22 ? 0.11 : 0.06;
    amplitude += Math.max(0, (Number(player.potential?.growthRate) || 0.3) - 0.3) * 0.08;
    return 1 + (normalized - 0.5) * amplitude * 2;
  }

  #getExpectedProduction(player) {
    const ovr = Number(player.ovr) || 70;
    const isForward = FORWARD_POSITIONS.has(player.identity?.primaryPosition);
    if (isForward) {
      return {
        pointsPerGame: clamp(((ovr - 55) / 45) * 0.8, 0.12, 0.95),
        shotsPerGame: clamp(((ovr - 55) / 45) * 3, 0.6, 3.5),
      };
    }
    return {
      pointsPerGame: clamp(((ovr - 55) / 50) * 0.45, 0.08, 0.55),
      shotsPerGame: clamp(((ovr - 55) / 45) * 1.8, 0.4, 2.4),
    };
  }

  #applyAttributeStep(player, direction, pointsPerGame, shotsPerGame) {
    const weights = this.#getAttributeWeights(player, direction, pointsPerGame, shotsPerGame);
    const attributeKey = this.#pickWeightedAttribute(weights);
    if (!attributeKey) return null;
    player.attributes.applyAttributeDelta(attributeKey, direction);
    return attributeKey;
  }

  #getAttributeWeights(player, direction, pointsPerGame, shotsPerGame) {
    const isForward = FORWARD_POSITIONS.has(player.identity?.primaryPosition);
    if (direction > 0) {
      if (isForward) {
        return {
          shot: 1.2 + shotsPerGame * 0.18,
          skill: 1.15 + pointsPerGame * 0.3,
          speed: 0.85,
          physical: 0.6,
          defense: 0.45,
        };
      }
      return {
        defense: 1.25 + pointsPerGame * 0.12,
        physical: 0.95,
        skill: 0.82 + pointsPerGame * 0.15,
        speed: 0.78,
        shot: 0.55 + shotsPerGame * 0.08,
      };
    }

    if (isForward) {
      return { shot: 0.95, speed: 1.2, physical: 0.8, defense: 0.5, skill: 1.0 };
    }
    return { defense: 1.05, physical: 0.95, speed: 1.1, skill: 0.9, shot: 0.55 };
  }

  #pickWeightedAttribute(weightMap) {
    const entries = Object.entries(weightMap).filter(([, weight]) => Number(weight) > 0);
    if (!entries.length) return null;
    const totalWeight = entries.reduce((total, [, weight]) => total + weight, 0);
    let roll = Math.random() * totalWeight;
    for (const [key, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return key;
    }
    return entries[entries.length - 1][0];
  }

  #getAverageIceTime(seasonStats) {
    const games = Math.max(1, Number(seasonStats?.games) || 0);
    return ((Number(seasonStats?.totalIceTime) || 0) / 60) / games;
  }

  #getPointsPerGame(seasonStats) {
    const games = Math.max(1, Number(seasonStats?.games) || 0);
    return (Number(seasonStats?.points) || 0) / games;
  }

  #getShotsPerGame(seasonStats) {
    const games = Math.max(1, Number(seasonStats?.games) || 0);
    return (Number(seasonStats?.shots) || 0) / games;
  }
}
