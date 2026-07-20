export const renderDraftHeader = (team) => `<header class="draft-header-shell">
  <div class="draft-header-copy">
    <h1>ФЭНТЕЗИ-ДРАФТ</h1>
    <p>Соберите состав по пикам и потолку зарплат</p>
  </div>
  <div class="draft-header-team">
    <div class="draft-header-logo-frame"><img src="${team.logoUrl}" alt="${team.name}"/></div>
    <div class="draft-header-team-copy"><span>КОМАНДА:</span><strong>${String(team.name || "").toUpperCase()}</strong></div>
  </div>
</header>`;
