const compareByRating = (left, right) => (right.ovr - left.ovr) || left.name.localeCompare(right.name, "ru");

export class DraftCoreCandidateSelector {
  select(candidates = [], context = {}) {
    if (!Array.isArray(candidates) || !candidates.length) return [];
    const round = Number(context.round) || 1;
    if (round > 8) return [...candidates];
    const sorted = [...candidates].sort(compareByRating);
    const limit = this.#getCoreLimit(round, sorted.length);
    const ratingFloor = Math.max(70, (Number(sorted[0]?.ovr) || 0) - this.#getRatingWindow(round));
    const topPool = sorted.filter((player) => (Number(player.ovr) || 0) >= ratingFloor).slice(0, limit);
    return topPool.length ? topPool : sorted.slice(0, Math.min(limit, sorted.length));
  }

  #getCoreLimit(round, size) {
    if (round <= 2) return Math.min(size, 28);
    if (round <= 4) return Math.min(size, 42);
    if (round <= 6) return Math.min(size, 64);
    return Math.min(size, 90);
  }

  #getRatingWindow(round) {
    if (round <= 2) return 2;
    if (round <= 4) return 3;
    if (round <= 6) return 5;
    return 7;
  }
}
