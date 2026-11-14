export const isGithubPagesStatic =
  import.meta.env.VITE_GITHUB_PAGES_STATIC === "true";

export const officialMessagesUrl = "https://table.branham.org/#/pt/main";

export const githubPagesHrefs = (href: string) => {
  const [routePath, query] = href.replace(/^#?\/?/, "").split("?");
  const url = new URL(window.location.href);
  if (query) url.search = query;
  url.hash = `/${routePath}`;
  return `${url.pathname}${url.search}${url.hash}`;
};
