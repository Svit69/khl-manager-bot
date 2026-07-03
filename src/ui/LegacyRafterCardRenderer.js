const formatOptionalText = (value, fallback = "—") => value || fallback;
const formatUppercaseText = (value) => String(formatOptionalText(value)).toUpperCase();
const getPrimaryHonor = (row) => row.achievements || row.reason || "Легенда клуба";

export const renderRafterCard = (row) => `<article class="legacy-rafter-card" title="${formatOptionalText(row.name)} #${row.number}">
  <img class="legacy-rafter-banner" src="./legacy-photo/banner.png" alt="" aria-hidden="true">
  <div class="legacy-rafter-content">
    <strong class="legacy-rafter-surname">${formatUppercaseText(row.lastName)}</strong>
    <strong class="legacy-rafter-number">${row.number}</strong>
    <div class="legacy-rafter-caption">
      <span>${formatUppercaseText(row.name)}</span>
      <small>${formatOptionalText(getPrimaryHonor(row))}</small>
    </div>
    <b class="legacy-rafter-years">${formatOptionalText(row.clubYears)}</b>
  </div>
</article>`;
