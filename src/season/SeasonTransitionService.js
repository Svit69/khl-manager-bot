import { buildCompetitiveLines } from "../data/lineupBuilder.js";
import { getFallbackMarketSalaryRub } from "../contracts/FallbackMarketSalary.js";
import { getUfaStatus } from "../contracts/RenewalScoring.js";
import { calculateAge } from "../contracts/SeasonUtils.js";
import { createSkater } from "../data/playerFactory.js";
import { PlayerPosition } from "../models/PlayerPosition.js";
import { generateUuid } from "../utils/uuid.js";
import { PlayerRetirementService } from "./PlayerRetirementService.js";
import { createPreseasonDates, getPreseasonDateAt } from "./PreseasonSchedule.js";
import { TEAM_ROSTER_POSITION_TARGETS, TEAM_ROSTER_TARGET_SIZE } from "./RosterTargets.js";

const createUtcDate = (year, monthIndex, day) => new Date(Date.UTC(year, monthIndex, day));
const formatSeasonLabel = (startYear) => `${startYear}/${startYear + 1}`;
const seasonTag = (startYear) => `season-${startYear}`;

const collectUniqueFreeAgents = (players) => {
  const uniqueById = new Map();
  (players || []).forEach((player) => {
    if (!player?.id || player.affiliation?.teamId) return;
    uniqueById.set(player.id, player);
  });
  return [...uniqueById.values()];
};

export class SeasonTransitionService {
  #contracts;
  #development;
  #retirements = new PlayerRetirementService();

  constructor(contractService, aiRenewalService, developmentService) {
    this.#contracts = contractService;
    void aiRenewalService;
    this.#development = developmentService;
  }

  advanceToNextSeason({ teams, calendar, activeTeamId, standingsTable, scorerTable, allPlayers, buildContext, pushNotification }) {
    const currentSeasonLabel = calendar.seasonLabel;
    const nextSeasonStartYear = calendar.seasonStartYear + 1;
    const nextSeasonLabel = formatSeasonLabel(nextSeasonStartYear);
    const offseasonDate = createUtcDate(nextSeasonStartYear, 4, 31);
    const preseasonDates = createPreseasonDates(nextSeasonStartYear);
    const preseasonDateIso = getPreseasonDateAt(preseasonDates, 0) || offseasonDate.toISOString().slice(0, 10);
    const archive = this.#buildArchive({ calendar, standingsTable, scorerTable, teams, activeTeamId, currentSeasonLabel });

    (allPlayers || []).forEach((player) => {
      player.career?.addGames?.(player.seasonStats?.games || 0);
      player.career?.addSeason?.(1);
    });

    const retirementEntries = this.#retirements.evaluate(allPlayers, {
      seasonLabel: currentSeasonLabel,
      seasonDate: offseasonDate,
      hasNextContract: (player) => Boolean(this.#contracts.getContractForSeason(player.id, nextSeasonLabel)),
    });
    const retiredPlayerIds = new Set(retirementEntries.map((entry) => entry.player.id));
    if (retiredPlayerIds.size) {
      this.#contracts.retirePlayers([...retiredPlayerIds]);
      retirementEntries.forEach(({ player }) => {
        player.affiliation.teamId = null;
        player.affiliation.contractId = null;
        player.affiliation.acquiredDay = null;
      });
    }

    const activePlayers = (allPlayers || []).filter((player) => !retiredPlayerIds.has(player.id));
    const playerMap = new Map(activePlayers.map((player) => [player.id, player]));
    const releasedPlayerIds = [];
    const userDepartures = [];
    const userRestrictedRetentions = [];
    const restrictedRightsOffers = [];

    activePlayers.forEach((player) => {
      const nextContract = this.#contracts.getContractForSeason(player.id, nextSeasonLabel);
      if (nextContract) {
        player.affiliation.teamId = nextContract.teamId;
        player.affiliation.contractId = nextContract.id;
        return;
      }
      const currentTeamId = player.affiliation?.teamId || null;
      const ufaStatus = getUfaStatus(
        calculateAge(player.identity?.birthDate, offseasonDate),
        player.career?.khlGamesPlayed || 0,
      );
      if (currentTeamId && ufaStatus === "OSA") {
        const retainedContract = this.#contracts.retainRestrictedFreeAgent(player, currentTeamId, nextSeasonLabel);
        player.affiliation.teamId = currentTeamId;
        player.affiliation.contractId = retainedContract?.id || player.affiliation.contractId || null;
        player.affiliation.acquiredDay = null;
        if (currentTeamId === activeTeamId) {
          userRestrictedRetentions.push(player);
          const offerSheet = this.#buildRestrictedRightsOfferSheet({
            teams,
            activeTeamId,
            player,
            nextSeasonLabel,
            allPlayers: activePlayers,
            buildContext,
          });
          if (offerSheet) restrictedRightsOffers.push(offerSheet);
        }
        return;
      }
      if (player.affiliation?.teamId === activeTeamId) {
        userDepartures.push(player);
      }
      player.affiliation.teamId = null;
      player.affiliation.contractId = null;
      player.affiliation.acquiredDay = null;
      releasedPlayerIds.push(player.id);
    });

    if (releasedPlayerIds.length) {
      this.#contracts.releasePlayers(releasedPlayerIds);
    }

    const offseasonEvents = this.#development.applyOffseasonDevelopment(activePlayers, { seasonDate: offseasonDate });
    offseasonEvents
      .filter((event) => event.teamId === activeTeamId)
      .forEach((event) => pushNotification(this.#buildDevelopmentNotification(event, calendar.currentDay)));

    activePlayers.forEach((player) => {
      player.condition?.normalizeOffseason?.();
    });

    this.#rebuildRosters(teams, playerMap);

    activePlayers.forEach((player) => {
      player.seasonStats?.resetForSeason?.(seasonTag(nextSeasonStartYear));
    });

    retirementEntries.forEach((entry) => {
      pushNotification(this.#buildRetirementNotification(entry, calendar.currentDay, entry.teamId === activeTeamId));
    });

    userDepartures.forEach((player) => {
      pushNotification({
        id: `notification-offseason-departure-${player.id}-${Date.now()}`,
        type: "offseason-departure",
        title: "Межсезонье",
        message: `${player.name} вышел на рынок свободных агентов`,
        day: calendar.currentDay,
        createdAt: new Date().toISOString(),
        playerId: player.id,
        read: false,
      });
    });

    userRestrictedRetentions.forEach((player) => {
      pushNotification({
        id: `notification-offseason-osa-retain-${player.id}-${Date.now()}`,
        type: "offseason-retention",
        title: "РњРµР¶СЃРµР·РѕРЅСЊРµ",
        message: `${player.name} СЃРѕС…СЂР°РЅРµРЅ РєР»СѓР±РѕРј РєР°Рє РћРЎРђ`,
        day: calendar.currentDay,
        createdAt: new Date().toISOString(),
        playerId: player.id,
        read: false,
      });
    });

    pushNotification({
      id: `notification-new-season-${nextSeasonLabel}-${Date.now()}`,
      type: "season-transition",
      title: "Новый сезон",
      message: `31 мая контракты завершены. С 1 июня открывается рынок свободных агентов, сезон ${nextSeasonLabel} стартует 1 сентября.`,
      day: calendar.currentDay,
      createdAt: new Date().toISOString(),
      read: false,
    });

    calendar.resetForNextSeason(nextSeasonStartYear);

    return {
      archive,
      seasonState: {
        phase: "preseason",
        previousSeasonLabel: currentSeasonLabel,
        seasonLabel: nextSeasonLabel,
        preseasonDates,
        preseasonIndex: 0,
        preseasonDateIso,
        preseasonOpen: true,
        preseasonOffers: [],
        restrictedRightsOffers,
      },
      freeAgents: collectUniqueFreeAgents(activePlayers),
      retiredPlayerIds: [...retiredPlayerIds],
    };
  }

  ensureMinimumRosterDepth(args) {
    this.#ensureMinimumRosterDepth(args);
  }

  rebuildRosters(teams, allPlayers) {
    this.#rebuildRosters(teams, new Map((allPlayers || []).map((player) => [player.id, player])));
  }

  #buildArchive({ calendar, standingsTable, scorerTable, teams, activeTeamId, currentSeasonLabel }) {
    const playoffs = calendar.getPlayoffBracketData();
    const champion = playoffs?.champion || null;
    const activeStanding = (standingsTable || []).find((row) => row.teamId === activeTeamId) || null;
    return {
      seasonLabel: currentSeasonLabel,
      completedAt: new Date().toISOString(),
      champion: champion ? { teamId: champion.id, name: champion.name, shortName: champion.shortName } : null,
      standings: (standingsTable || []).map((row, index) => ({ rank: index + 1, ...row })),
      scorers: (scorerTable || []).slice(0, 15).map((row, index) => ({ rank: index + 1, ...row })),
      playoffs,
      activeTeamId,
      activeTeamStanding: activeStanding,
      teams: (teams || []).map((team) => ({ id: team.id, name: team.name, shortName: team.shortName })),
    };
  }

  #ensureMinimumRosterDepth({ teams, activeTeamId, allPlayers, buildContext, negotiationDate, currentDay, pushNotification }) {
    const positionTargets = TEAM_ROSTER_POSITION_TARGETS;
    const getGroup = (playerOrPosition) => {
      const position = typeof playerOrPosition === "string"
        ? playerOrPosition
        : playerOrPosition?.identity?.primaryPosition;
      if (position === "ЗАЩ") return "DEF";
      return "FWD";
    };
    const getAvailableFreeAgents = () => collectUniqueFreeAgents(allPlayers);
    const createCounts = (roster) =>
      roster.reduce((acc, player) => {
        const group = getGroup(player);
        acc[group] = (acc[group] || 0) + 1;
        return acc;
      }, { FWD: 0, DEF: 0 });
    const getPreferredGroup = (roster) => {
      const counts = createCounts(roster);
      return Object.entries(positionTargets)
        .map(([group, target]) => ({ group, deficit: Math.max(0, target - (counts[group] || 0)) }))
        .sort((left, right) => right.deficit - left.deficit)[0];
    };
    const getSurplusPlayer = (roster) => {
      const counts = createCounts(roster);
      const surplusGroups = Object.entries(positionTargets)
        .map(([group, target]) => ({ group, surplus: Math.max(0, (counts[group] || 0) - target) }))
        .filter((entry) => entry.surplus > 0)
        .sort((left, right) => right.surplus - left.surplus);
      if (!surplusGroups.length) return null;
      const surplusGroup = surplusGroups[0].group;
      return roster
        .filter((player) => getGroup(player) === surplusGroup)
        .sort((left, right) => (left.ovr - right.ovr) || left.name.localeCompare(right.name, "ru"))[0] || null;
    };
    const isRosterReady = (roster) => {
      const counts = createCounts(roster);
      return roster.length >= TEAM_ROSTER_TARGET_SIZE &&
        Object.entries(positionTargets).every(([group, target]) => (counts[group] || 0) >= target);
    };

    (teams || [])
      .filter((team) => team?.id && team.id !== activeTeamId)
      .forEach((team) => {
        let roster = (allPlayers || []).filter((player) => player.affiliation?.teamId === team.id);
        const attemptedPlayerIds = new Set();
        let safety = 0;

        while (!isRosterReady(roster) && safety < 64) {
          safety += 1;
          const context = { ...buildContext(team), currentDate: negotiationDate, allPlayers };
          const preferred = getPreferredGroup(roster);
          const preferredGroup = preferred?.deficit > 0 ? preferred.group : null;

          if (preferredGroup && roster.length >= TEAM_ROSTER_TARGET_SIZE) {
            const surplusPlayer = getSurplusPlayer(roster);
            if (surplusPlayer) {
              surplusPlayer.affiliation.teamId = null;
              surplusPlayer.affiliation.contractId = null;
              surplusPlayer.affiliation.acquiredDay = null;
              surplusPlayer.expectedLineIndex = null;
              this.#contracts.releasePlayers([surplusPlayer.id]);
              roster = (allPlayers || []).filter((player) => player.affiliation?.teamId === team.id);
              continue;
            }
          }

          const candidatePool = getAvailableFreeAgents()
            .filter((player) => !attemptedPlayerIds.has(player.id))
            .filter((player) => !preferredGroup || getGroup(player) === preferredGroup)
            .sort((left, right) => (right.ovr - left.ovr) || left.name.localeCompare(right.name, "ru"));
          const fallbackPool = candidatePool.length
            ? candidatePool
            : getAvailableFreeAgents()
              .filter((player) => !attemptedPlayerIds.has(player.id))
              .sort((left, right) => (right.ovr - left.ovr) || left.name.localeCompare(right.name, "ru"));

          let signedPlayer = null;
          for (const candidate of fallbackPool) {
            attemptedPlayerIds.add(candidate.id);
            const preview = this.#contracts.getFreeAgentPreview(
              team,
              candidate,
              { years: 1, salaryRub: getFallbackMarketSalaryRub(candidate) },
              context,
            );
            const offer = { years: 1, salaryRub: Math.round((preview.teamAdjustedDemand * 1.08) / 500000) * 500000 };
            let result = this.#contracts.submitFreeAgentOffer(team, candidate, offer, context);
            if (result?.decision === "counter" && result.counter) {
              result = this.#contracts.submitFreeAgentOffer(team, candidate, result.counter, context);
            }
            if (result?.decision !== "accept") {
              const fallbackOffer = {
                years: 1,
                salaryRub: Math.round((preview.teamAdjustedDemand * 1.2) / 500000) * 500000,
              };
              result = this.#contracts.submitFreeAgentOffer(team, candidate, fallbackOffer, context);
            }
            if (result?.decision === "accept") {
              signedPlayer = candidate;
              if (!team.getRoster().some((entry) => entry?.id === candidate.id)) {
                team.reservePlayers.push(candidate);
              }
              pushNotification(
                this.#buildDepthSigningNotification(team, candidate, result.newContracts?.[result.newContracts.length - 1], currentDay),
              );
              break;
            }
          }

          if (!signedPlayer) {
            const emergencyPlayer = this.#createEmergencyDepthPlayer(team, preferredGroup || "FWD", negotiationDate);
            allPlayers.push(emergencyPlayer);
            const emergencyContracts = this.#contracts.finalizeFreeAgentSigning(
              team,
              emergencyPlayer,
              { years: 1, salaryRub: 500000 },
              { currentDate: negotiationDate },
            );
            team.reservePlayers.push(emergencyPlayer);
            pushNotification(
              this.#buildDepthSigningNotification(team, emergencyPlayer, emergencyContracts?.[emergencyContracts.length - 1], currentDay),
            );
          }

          roster = (allPlayers || []).filter((player) => player.affiliation?.teamId === team.id);
        }
      });
  }

  #rebuildRosters(teams, playerMap) {
    (teams || []).forEach((team) => {
      const roster = [...playerMap.values()].filter((player) => player.affiliation?.teamId === team.id);
      const lineup = buildCompetitiveLines(roster);
      team.lines.splice(0, team.lines.length, ...lineup.lines);
      team.reservePlayers.splice(0, team.reservePlayers.length, ...lineup.reservePlayers);
      team.lines.forEach((line, lineIndex) => {
        line.players.forEach((player) => {
          if (player) player.expectedLineIndex = lineIndex + 1;
        });
      });
      team.reservePlayers.forEach((player) => {
        if (player) player.expectedLineIndex = null;
      });
    });
  }

  #buildDevelopmentNotification(event, day) {
    const isUpgrade = event.type === "upgrade";
    return {
      id: `notification-offseason-dev-${event.playerId}-${day}-${Math.random().toString(36).slice(2, 8)}`,
      type: event.type,
      title: isUpgrade ? "Прогресс игрока" : "Регресс игрока",
      message: `${event.playerName}: OVR ${event.oldOvr} → ${event.newOvr}`,
      day,
      createdAt: new Date().toISOString(),
      playerId: event.playerId,
      read: false,
    };
  }

  #buildRetirementNotification(entry, day, isUserTeamPlayer) {
    const player = entry.player;
    const games = Number(player.career?.khlGamesPlayed) || 0;
    const seasons = Number(player.career?.seasonsPlayed) || 0;
    const details = `${entry.age} лет • ${games} матчей КХЛ${seasons ? ` • ${seasons} сез.` : ""}`;
    return {
      id: `notification-retirement-${player.id}-${day}-${Math.random().toString(36).slice(2, 8)}`,
      type: "retirement",
      title: isUserTeamPlayer ? "Игрок завершил карьеру" : "Завершение карьеры",
      message: `${player.name} завершил карьеру: ${details}. Причина: ${entry.reason}.`,
      day,
      createdAt: new Date().toISOString(),
      playerId: player.id,
      read: false,
    };
  }

  #buildRestrictedRightsOfferSheet({ teams, activeTeamId, player, nextSeasonLabel, allPlayers, buildContext }) {
    if (!player || (player.ovr || 0) < 71) return null;
    const rightsTeam = (teams || []).find((team) => team.id === activeTeamId) || null;
    const candidates = (teams || [])
      .filter((team) => team?.id && team.id !== activeTeamId)
      .map((team) => {
        const context = {
          ...(typeof buildContext === "function" ? buildContext(team) : {}),
          allPlayers,
        };
        const preview = this.#contracts.getFreeAgentPreview(
          team,
          player,
          {
            years: this.#getOfferSheetYears(player),
            salaryRub: this.#getOfferSheetSalary(player, team, rightsTeam),
          },
          context,
        );
        const roleScore = Number(preview?.projectedRoleScore ?? preview?.roleScore) || 0;
        const salaryRatio = Number(preview?.salaryRatio) || 0;
        const score = (Number(player.ovr) || 0) + roleScore * 1.8 + salaryRatio * 8 + this.#stableOfferSheetNoise(player, team);
        return { team, preview, score };
      })
      .filter((entry) => entry.preview && Number(entry.preview.willingness) >= 38)
      .sort((left, right) => right.score - left.score);

    const best = candidates[0] || null;
    if (!best) return null;

    return {
      id: `osa-offer-${player.id}-${best.team.id}-${nextSeasonLabel}`,
      playerId: player.id,
      rightsTeamId: activeTeamId,
      offerTeamId: best.team.id,
      offerTeamName: best.team.name,
      season: nextSeasonLabel,
      offer: {
        years: best.preview.offer.years,
        salaryRub: best.preview.offer.salaryRub,
      },
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }

  #getOfferSheetYears(player) {
    const age = calculateAge(player.identity?.birthDate);
    if (age <= 22 && (player.potential?.potential || player.ovr) - player.ovr >= 3) return 3;
    if ((player.ovr || 0) >= 79) return 2;
    return 1;
  }

  #getOfferSheetSalary(player, team, rightsTeam) {
    const base = getFallbackMarketSalaryRub(player);
    let factor = 1.08;
    const roster = team?.getRoster?.() || [];
    const rightsRoster = rightsTeam?.getRoster?.() || [];
    const samePositionCount = roster.filter((candidate) => candidate.identity?.primaryPosition === player.identity?.primaryPosition).length;
    const rightsSamePositionCount = rightsRoster.filter((candidate) => candidate.identity?.primaryPosition === player.identity?.primaryPosition).length;
    if (samePositionCount <= rightsSamePositionCount - 1) factor += 0.08;
    if ((player.potential?.potential || player.ovr) - player.ovr >= 4) factor += 0.06;
    if ((player.ovr || 0) >= 80) factor += 0.08;
    return Math.round((base * factor) / 500000) * 500000;
  }

  #stableOfferSheetNoise(player, team) {
    const source = `${player?.id || ""}:${team?.id || ""}`;
    let hash = 0;
    for (let index = 0; index < source.length; index++) {
      hash = (hash * 31 + source.charCodeAt(index)) % 9973;
    }
    return ((hash % 21) - 10) / 10;
  }

  #buildDepthSigningNotification(team, player, contract, day) {
    const salaryMillions = ((Number(contract?.salaryRub) || 0) / 1000000).toFixed(1).replace(".0", "");
    const endYear = Number(String(contract?.season || "").split("/")[1]) || "";
    return {
      id: `notification-offseason-depth-${team.id}-${player.id}-${day}-${Math.random().toString(36).slice(2, 8)}`,
      type: "ai-signing",
      title: "Межсезонье",
      message: `${team.name} подписал ${player.name} ${player.ovr} до ${endYear} с зарплатой ${salaryMillions} млн`,
      day,
      createdAt: new Date().toISOString(),
      playerId: player.id,
      read: false,
    };
  }

  #createEmergencyDepthPlayer(team, preferredGroup, negotiationDate) {
    const isDefense = preferredGroup === "DEF";
    const position = isDefense ? PlayerPosition.DEF : PlayerPosition.CTR;
    const year = new Date(negotiationDate).getUTCFullYear();
    const profile = {
      id: `system-fa-${generateUuid()}`,
      position,
      identity: {
        firstName: "Системный",
        lastName: isDefense ? "Защитник" : "Форвард",
        displayName: `Системный ${isDefense ? "защитник" : "форвард"}`,
        birthDate: `${Math.max(1998, year - 25)}-01-01`,
        nationality: team?.country === "Беларусь" ? "BY" : "RU",
        isGoalie: false,
        photoUrl: "./player-photo/placeholder.png",
        primaryPosition: position,
        secondaryPositions: [],
      },
      attributes: isDefense
        ? { shot: 62, speed: 66, physical: 69, defense: 70, skill: 63 }
        : { shot: 68, speed: 69, physical: 66, defense: 60, skill: 66 },
      potential: { potential: isDefense ? 68 : 69, growthRate: 0.2, peakAge: 27, declineRate: 0.4 },
      condition: { fatigueScore: 0, form: 1.0, injuryUntilDay: null },
      career: { khlGamesPlayed: 0, seasonsPlayed: 0, reputation: 35 },
      affiliation: { teamId: null, contractId: null, acquiredDay: null },
    };

    return createSkater(
      { id: null, name: "Свободные агенты" },
      profile.identity.firstName,
      profile.identity.lastName,
      position,
      seasonTag(year),
      profile,
    );
  }
}
