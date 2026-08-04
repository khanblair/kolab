// Convex serves queries/mutations from the `.convex.cloud` domain but HTTP
// actions (convex/http.ts) from the sibling `.convex.site` domain.
function convexSiteUrl() {
  const cloudUrl = import.meta.env.VITE_CONVEX_URL as string;
  return cloudUrl.replace(/\.convex\.cloud$/, ".convex.site");
}

export function getAssetUrl(assetId: string) {
  return `${convexSiteUrl()}/api/asset/${assetId}`;
}
