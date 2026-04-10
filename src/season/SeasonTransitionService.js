import { buildCompetitiveLines } from "../data/lineupBuilder.js";
import { createPreseasonDates, getPreseasonDateAt } from "./PreseasonSchedule.js";

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

  constructor(contractService, aiRenewalService, developmentService) {
    this.#contracts = contractService;
    void aiRenewalService;
    this.#development = developmentService;
  }

  advanceToNextSeason({ teams, calendar, activeTeamId, standingsTable, scorerTable, allPlayers, pushNotification }) {
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

    const playerMap = new Map((allPlayers || []).map((player) => [player.id, player]));
    const releasedPlayerIds = [];
    const userDepartures = [];

    (allPlayers || []).forEach((player) => {
      const nextContract = this.#contracts.getContractForSeason(player.id, nextSeasonLabel);
      if (nextContract) {
        player.affiliation.teamId = nextContract.teamId;
        player.affiliation.contractId = nextContract.id;
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

    const offseasonEvents = this.#development.applyOffseasonDevelopment(allPlayers, { seasonDate: offseasonDate });
    offseasonEvents
      .filter((event) => event.teamId === activeTeamId)
      .forEach((event) => pushNotification(this.#buildDevelopmentNotification(event, calendar.currentDay)));

    (allPlayers || []).forEach((player) => {
      player.condition?.normalizeOffseason?.();
    });

    this.#rebuildRosters(teams, playerMap);

    (allPlayers || []).forEach((player) => {
      player.seasonStats?.resetForSeason?.(seasonTag(nextSeasonStartYear));
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
      },
      freeAgents: collectUniqueFreeAgents(allPlayers),
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
    const MIN_ROSTER_SIZE = 19;
    const positionTargets = { FWD: 9, DEF: 6 };
    const getGroup = (position) => (position === "ЗАЩ" ? "DEF" : "FWD");
    const getAvailableFreeAgents = () => collectUniqueFreeAgents(allPlayers);

    (teams || [])
      .filter((team) => team?.id && team.id !== activeTeamId)
      .forEach((team) => {
        let roster = (allPlayers || []).filter((player) => player.affiliation?.teamId === team.id);
        let safety = 0;
        while (roster.length < MIN_ROSTER_SIZE && safety < 12) {
          safety += 1;
          const context = { ...buildContext(team), currentDate: negotiationDate, allPlayers };
          const groupCounts = roster.reduce((acc, player) => {
            const group = getGroup(player.identity?.primaryPosition);
            acc[group] = (acc[group] || 0) + 1;
            return acc;
          }, { FWD: 0, DEF: 0 });

          const preferredGroup = groupCounts.DEF < positionTargets.DEF ? "DEF" : "FWD";
          const candidate =
            getAvailableFreeAgents()
              .sort((left, right) => (right.ovr - left.ovr) || left.name.localeCompare(right.name, "ru"))
              .find((player) => getGroup(player.identity?.primaryPosition) === preferredGroup) ||
            getAvailableFreeAgents()[0];
          if (!candidate) break;

          const preview = this.#contracts.getFreeAgentPreview(team, candidate, { years: 1, salaryRub: Math.max(500000, candidate.ovr * 1000000) }, context);
          const offer = { years: 1, salaryRub: Math.round((preview.teamAdjustedDemand * 1.08) / 500000) * 500000 };
          let result = this.#contracts.submitFreeAgentOffer(team, candidate, offer, context);
          if (result?.decision === "counter" && result.counter) {
            result = this.#contracts.submitFreeAgentOffer(team, candidate, result.counter, context);
          }
          if (result?.decision === "accept") {
            team.reservePlayers.push(candidate);
            pushNotification(this.#buildDepthSigningNotification(team, candidate, result.newContracts?.[result.newContracts.length - 1], currentDay));
            roster = (allPlayers || []).filter((player) => player.affiliation?.teamId === team.id);
            continue;
          }
          const fallbackOffer = { years: 1, salaryRub: Math.round((preview.teamAdjustedDemand * 1.2) / 500000) * 500000 };
          result = this.#contracts.submitFreeAgentOffer(team, candidate, fallbackOffer, context);
          if (result?.decision === "accept") {
            team.reservePlayers.push(candidate);
            pushNotification(this.#buildDepthSigningNotification(team, candidate, result.newContracts?.[result.newContracts.length - 1], currentDay));
            roster = (allPlayers || []).filter((player) => player.affiliation?.teamId === team.id);
            continue;
          }
          break;
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
}
