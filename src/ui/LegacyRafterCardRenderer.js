const formatOptionalText = (value, fallback = "—") => value || fallback;

export const renderRafterCard = (row) => `<article class="legacy-rafter-card">
  <div class="legacy-rafter-number"><strong>${row.number}</strong><span>${formatOptionalText(row.raisedDate)}</span></div>
  <div class="legacy-rafter-body">
    <div class="legacy-rafter-title"><h4>${row.name}</h4><span>${formatOptionalText(row.clubYears)}</span></div>
    <p>${formatOptionalText(row.reason, "Причина будет добавлена позже.")}</p>
    <div class="legacy-rafter-facts">
      <div><small>Achievements</small><strong>${formatOptionalText(row.achievements)}</strong></div>
      <div><small>Club Stats</small><strong>${formatOptionalText(row.stats)}</strong></div>
    </div>
  </div>
</article>`;
