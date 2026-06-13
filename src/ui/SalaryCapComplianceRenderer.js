const formatMillions = (value) => Math.round((Number(value) || 0) / 1000000);

const getName = (player) => player?.identity?.displayName || player?.name || "Player";

export class SalaryCapComplianceRenderer {
  render(view) {
    if (!view) return "";
    const rows = (view.rows || []).map((row) => {
      const player = row.player;
      const checked = row.selected ? " selected" : "";
      return `<button class="cap-cut-row${checked}" data-action="cap-release-toggle" data-player-id="${player.id}">
        <span class="cap-cut-name">${getName(player)}</span>
        <span>${player.identity?.primaryPosition || ""}</span>
        <span>OVR ${player.ovr}</span>
        <strong>${formatMillions(row.salaryRub)} млн</strong>
      </button>`;
    }).join("");
    const over = formatMillions(view.overRub);
    const projected = formatMillions(view.projectedRub);
    const cap = formatMillions(view.capRub);
    const stateClass = view.isCompliant ? " ready" : "";
    return `<section class="cap-compliance-screen">
      <div class="cap-compliance-hero">
        <span>Salary Cap</span>
        <h2>Сократите платежку перед стартом</h2>
        <p>Выберите игроков для расторжения, чтобы уложиться в потолок ${cap} млн. После подтверждения ИИ-клубы тоже приведут составы к лимиту, затем лига доберет команды до 23 игроков.</p>
      </div>
      <div class="cap-compliance-board${stateClass}">
        <div class="cap-compliance-meter">
          <div><small>Сейчас</small><strong>${formatMillions(view.payrollRub)} млн</strong></div>
          <div><small>После расторжений</small><strong>${projected} млн</strong></div>
          <div><small>Превышение</small><strong>${over} млн</strong></div>
        </div>
        <div class="cap-cut-list">${rows}</div>
        <div class="cap-compliance-actions">
          <button class="btn secondary" data-action="cap-release-auto">Auto pick</button>
          <button class="btn" data-action="cap-release-confirm" ${view.isCompliant ? "" : "disabled"}>Confirm cuts</button>
        </div>
      </div>
    </section>`;
  }
}
