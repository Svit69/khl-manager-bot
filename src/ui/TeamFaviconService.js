const DEFAULT_FAVICON_URL = "./favicon.png";

const findFaviconLink = () =>
  document.querySelector("link[rel='icon']") || document.querySelector("link[rel='shortcut icon']");

const createFaviconLink = () => {
  const link = document.createElement("link");
  link.rel = "icon";
  document.head.appendChild(link);
  return link;
};

export const updateTeamFavicon = (team = null) => {
  if (typeof document === "undefined") return;
  const link = findFaviconLink() || createFaviconLink();
  link.type = "image/png";
  link.href = team?.logoUrl || DEFAULT_FAVICON_URL;
};
