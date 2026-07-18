const clamp = (value) => Math.max(40, Math.min(99, Math.round(value)));

export class TransferPlayerAdjuster {
  applyAdjustments(player, record) {
    if (!player || !record) return;
    if (Number.isFinite(record.reputation)) player.career.importSnapshot({ reputation: record.reputation });
    if (Number.isFinite(record.potentialDelta)) player.potential.adjustPotential(record.potentialDelta);
    if (Number.isFinite(record.targetOvr)) this.#setTargetOvr(player, record.targetOvr);
    if (Number.isFinite(record.ovrDelta)) this.#addAttributeDelta(player, record.ovrDelta);
  }

  #setTargetOvr(player, targetOvr) {
    const currentOvr = Number(player.ovr) || 0;
    this.#addAttributeDelta(player, targetOvr - currentOvr);
  }

  #addAttributeDelta(player, delta) {
    const attrs = player.attributes.attributesJson;
    Object.keys(attrs).forEach((key) => { attrs[key] = clamp((attrs[key] || 0) + delta); });
    player.attributes.recalcOvr();
  }
}
