export const normalizeCampaignName = (value: string) => (value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim()
  .replace(/\s+/g, " ")
  .replace(/^(?:ca\s*)?0*\d+\s+/, "")
  .replace(/\b(mexico|mex)\b/g, "mx")
  .replace(/\b(argentina)\b/g, "ar")
  .replace(/\b(uruguay|uruguai)\b/g, "uy")
  .replace(/\b(paraguay|paraguai)\b/g, "py")
  .replace(/\b(brasil|brazil)\b/g, "br")
  .replace(/\bc\s+msg\b/g, "msg");

export const getCampaignKey = (value: string) => {
  const normalized = normalizeCampaignName(value);
  const country = normalized.match(/(?:^|\s)(mx|uy|ar|br|py)(?:\s|$)/)?.[1];
  const ad = normalized.match(/(?:^|\s)(?:ads?|ad)\s*0*(\d+)(?:\s|$)/)?.[1];
  const api = normalized.match(/(?:^|\s)api\s*0*(\d+)(?:\s|$)/)?.[1];
  return country && ad && api ? `${country}|${Number(ad)}|${Number(api)}` : "";
};

export const campaignsMatch = (left: string, right: string) => {
  const a = normalizeCampaignName(left);
  const b = normalizeCampaignName(right);
  if (!a || !b) return false;
  const aKey = getCampaignKey(a);
  const bKey = getCampaignKey(b);
  return (aKey !== "" && aKey === bKey) || a === b || (a.length > 5 && (a.includes(b) || b.includes(a)));
};