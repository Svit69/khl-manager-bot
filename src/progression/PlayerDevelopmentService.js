import { calculateAge, clamp } from "../contracts/SeasonUtils.js";

const ATTRIBUTE_STEP_THRESHOLD = 2.4;
const POTENTIAL_STEP_THRESHOLD = 1.4;
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

    const ageComponent = this.#getAgeDevelopmentComponent(player, age);
    const usageComponent = this.#getUsageDevelopmentComponent(player, games, avgIceTime, matchStat, context);
    const performanceComponent = this.#getPerformanceDevelopmentComponent(pointsPerGame, shotsPerGame, expected);
    const ceilingComponent = this.#getPotentialGapComponent(potentialGap);
    const developmentDelta = clamp(ageComponent + usageComponent + performanceComponent + ceilingComponent, -0.18, 0.22);

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

  #getAgeDevelopmentComponent(player, age) {
    const growthRate = Number(player.potential?.growthRate) || 1;
    const declineRate = Number(player.potential?.declineRate) || 1;
    const peakAge = Number(player.potential?.peakAge) || 27;

    if (age <= 20) return 0.05 * growthRate;
    if (age <= 23) return 0.035 * growthRate;
    if (age < peakAge) return 0.018 * growthRate;
    if (age <= peakAge + 1) return 0.004;
    if (age <= peakAge + 3) return -0.012 * declineRate;
    return -0.022 * declineRate * (1 + Math.min(0.6, (age - peakAge - 3) * 0.08));
  }

  #getUsageDevelopmentComponent(player, games, avgIceTime, matchStat, context) {
    const teamGamesPlayed = Math.max(games, Number(context?.teamGamesPlayed) || 0);
    let delta = 0;
    if (matchStat) delta += 0.012;
    if (avgIceTime >= 18) delta += 0.05;
    else if (avgIceTime >= 14) delta += 0.035;
    else if (avgIceTime >= 10) delta += 0.02;
    else if (avgIceTime >= 6) delta += 0.005;
    else delta -= 0.025;

    if (teamGamesPlayed >= 12 && games >= teamGamesPlayed * 0.6) delta += 0.012;
    if (!matchStat && games >= 10 && avgIceTime < 7) delta -= 0.015;

    return delta;
  }

  #getPerformanceDevelopmentComponent(pointsPerGame, shotsPerGame, expected) {
    const ppgGap = pointsPerGame - expected.pointsPerGame;
    const shotsGap = shotsPerGame - expected.shotsPerGame;
    return clamp(ppgGap * 0.22 + shotsGap * 0.045, -0.06, 0.08);
  }

  #getPotentialGapComponent(potentialGap) {
    if (potentialGap >= 8) return 0.03;
    if (potentialGap >= 4) return 0.02;
    if (potentialGap >= 1) return 0.01;
    if (potentialGap <= -2) return -0.02;
    return 0;
  }

  #getPotentialDevelopmentDelta(player, age, games, avgIceTime, pointsPerGame, shotsPerGame, expected, matchStat) {
    if (age > 24 || !matchStat) return 0;
    if (games < 12 || avgIceTime < 10) return 0;

    const pointsGap = Math.max(0, pointsPerGame - expected.pointsPerGame);
    const shotsGap = Math.max(0, shotsPerGame - expected.shotsPerGame);
    const breakoutSignal = clamp(pointsGap * 0.12 + shotsGap * 0.025, 0, 0.12);
    if (breakoutSignal <= 0.015) return 0;

    let delta = breakoutSignal + 0.01;
    if (age <= 21 && avgIceTime >= 14) delta += 0.015;
    if ((player.potential?.potential || 0) - player.ovr <= 2) delta += 0.01;
    delta *= Number(player.potential?.growthRate) || 1;
    return clamp(delta, 0, 0.12);
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
