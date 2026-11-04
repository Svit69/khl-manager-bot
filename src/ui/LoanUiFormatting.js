export const loanEscape = (value = "") => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
export const loanSalary = (value) => Number.isFinite(Number(value)) && value != null
  ? `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(Number(value) / 1000000)} млн ₽`
  : "Нет данных";
export const loanDate = (value) => {
  if (!value) return "До конца сезона";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? loanEscape(value) : date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};
