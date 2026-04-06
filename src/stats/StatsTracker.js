export class StatsTracker {
  #season = new Map();

  recordMatch(match) {
    (match?.events || []).forEach((event) => {
      if (event?.type && event.type !== "goal") return;
      this.#addPoint(event?.scorer, "goals");

      const assistPlayers = Array.isArray(event?.assistPlayers) && event.assistPlayers.length
        ? event.assistPlayers
        : Array.isArray(event?.assists)
          ? event.assists
          : [event?.assist].filter(Boolean);

      assistPlayers.forEach((player) => this.#addPoint(player, "assists"));
    });
  }

  getSeasonStats() {
    return [...this.#season.values()]
      .map((stats) => ({
        ...stats,
        points: (stats.goals || 0) + (stats.assists || 0),
      }))
      .sort((left, right) =>
        (right.points - left.points) ||
        (right.goals - left.goals) ||
        left.name.localeCompare(right.name, "ru"),
      );
  }

  importStats(list) {
    this.#season.clear();
    (list || []).forEach((row) => {
      const key = row.playerId || row.name;
      if (!key) return;
      this.#season.set(String(key), {
        playerId: row.playerId || null,
        name: row.name || "",
        goals: Number(row.goals) || 0,
        assists: Number(row.assists) || 0,
      });
    });
  }

  #addPoint(playerRef, key) {
    const normalized = this.#normalizePlayerRef(playerRef);
    if (!normalized) return;

    if (!this.#season.has(normalized.key)) {
      this.#season.set(normalized.key, {
        playerId: normalized.playerId,
        name: normalized.name,
        goals: 0,
        assists: 0,
      });
    }

    const entry = this.#season.get(normalized.key);
    if (!entry.playerId && normalized.playerId) entry.playerId = normalized.playerId;
    if (!entry.name && normalized.name) entry.name = normalized.name;
    entry[key] += 1;
  }

  #normalizePlayerRef(playerRef) {
    if (!playerRef) return null;
    if (typeof playerRef === "object") {
      const playerId = playerRef.id || null;
      const name = playerRef.name || playerRef.displayName || "";
      if (!playerId && !name) return null;
      return {
        key: String(playerId || name),
        playerId,
        name,
      };
    }

    const name = String(playerRef).trim();
    if (!name) return null;
    return {
      key: name,
      playerId: null,
      name,
    };
  }
}
