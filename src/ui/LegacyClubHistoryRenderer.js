const countryLabel = (country) => ({ RU: "Россия", BY: "Беларусь", KZ: "Казахстан" }[country] || country || "—");

const value = (entry) => entry || "—";

const renderIdentity = (info) => {
  const identity = value(info?.identity);
  const note = info?.note || "История клуба начнет наполняться по ходу сохранения.";
  return `<div class="legacy-history-identity">
    <span>ИДЕНТИЧНОСТЬ КЛУБА</span>
    <p>${identity}</p>
    <p>${note}</p>
  </div>`;
};

export const renderLegacyTabs = () => `<div class="legacy-tab-switcher">
  <button class="active" type="button">ИСТОРИЯ КЛУБА</button>
  <button type="button">ИСТОРИЯ ЛИГИ</button>
</div>`;

export const renderClubHistoryPanel = (team, info) => `<section class="legacy-history-panel">
  <h2>ИСТОРИЯ КЛУБА</h2>
  <div class="legacy-history-box">
    <div class="legacy-history-fact"><span>ОСНОВАНИЕ КЛУБА</span><strong>${value(info?.founded)}</strong></div>
    <div class="legacy-history-fact">
      <span>ДОМАШНЯЯ АРЕНА</span>
      <strong>${String(value(info?.arena)).toUpperCase()}</strong>
      <small>${String(`${team?.city || ""}, ${countryLabel(team?.country)}`).toUpperCase()}</small>
    </div>
    ${renderIdentity(info)}
  </div>
</section>`;
