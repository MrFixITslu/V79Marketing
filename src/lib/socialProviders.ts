type ProviderPlatform = "facebook" | "instagram" | "linkedin" | "tiktok" | "youtube" | "google_business";

export interface ProviderConnection {
  platform: ProviderPlatform;
  providerAccountId: string;
  accountName: string;
  accountHandle: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}

export interface ProviderAccountRecord {
  platform: ProviderPlatform;
  providerAccountId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string | null;
  metadata: Record<string, any>;
}

export interface ProviderPublishPayload {
  caption: string;
  hashtags?: string[];
  mediaUrls?: string[];
  website?: string;
  tiktok?: {
    privacyLevel?: string;
    disableComment?: boolean;
    autoAddMusic?: boolean;
    commercialDisclosure?: boolean;
    brandOrganicToggle?: boolean;
    brandContentToggle?: boolean;
    isAigc?: boolean;
    musicUsageConfirmed?: boolean;
  };
  youtube?: {
    title?: string;
    videoUrl?: string;
    privacyStatus?: "private" | "unlisted" | "public";
    categoryId?: string;
    madeForKids?: boolean;
    containsSyntheticMedia?: boolean;
  };
}

export interface ProviderPublishResult {
  providerPostId: string;
  publishedAt: string;
  raw?: unknown;
}

const SUPPORTED: ProviderPlatform[] = ["facebook", "instagram", "linkedin", "tiktok", "youtube", "google_business"];

function env(name: string) {
  return String(process.env[name] || "").trim();
}

function metaVersion() {
  return env("META_GRAPH_VERSION") || "v24.0";
}

function linkedinVersion() {
  const configured = env("LINKEDIN_VERSION") || "202609";
  if (!/^20\d{4}$/.test(configured)) {
    throw new Error("LINKEDIN_VERSION must be a supported YYYYMM Marketing API version.");
  }
  return configured;
}

function normalized(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9]+/g, "");
}

function chooseByHint<T>(items: T[], hint: string, names: (item: T) => string[]) {
  if (!items.length) throw new Error("The provider did not return any eligible account.");
  const needle = normalized(hint || "");
  if (!needle) {
    if (items.length === 1) return items[0];
    throw new Error("More than one eligible provider account was found. Enter the exact Page, company, location, or handle and reconnect.");
  }
  const exact = items.find(item => names(item).some(value => normalized(value || "") === needle));
  if (exact) return exact;
  const partial = items.filter(item => names(item).some(value => normalized(value || "").includes(needle) || needle.includes(normalized(value || ""))));
  if (partial.length === 1) return partial[0];
  throw new Error("No unique eligible provider account matched the name/handle supplied.");
}

async function jsonFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, signal: init?.signal || AbortSignal.timeout(20_000) });
  const raw = await response.text();
  let body: any = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = { raw }; }
  if (!response.ok) {
    const message = body?.error?.message || body?.message || body?.error_description || body?.error || raw || `HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return { response, body };
}

export function providerConfigured(platform: string) {
  switch (platform) {
    case "facebook":
    case "instagram":
      return Boolean(env("META_APP_ID") && env("META_APP_SECRET"));
    case "linkedin":
      return Boolean(env("LINKEDIN_CLIENT_ID") && env("LINKEDIN_CLIENT_SECRET"));
    case "tiktok":
      return Boolean(env("TIKTOK_CLIENT_KEY") && env("TIKTOK_CLIENT_SECRET"));
    case "youtube":
      return Boolean(env("YOUTUBE_CLIENT_ID") && env("YOUTUBE_CLIENT_SECRET"));
    case "google_business":
      return Boolean(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET"));
    default:
      return false;
  }
}

export function providerStatus() {
  return SUPPORTED.map(platform => ({
    platform,
    configured: providerConfigured(platform),
    capabilities:
      platform === "tiktok"
        ? ["oauth", "photo_publish_with_explicit_consent"]
        : platform === "youtube"
          ? ["oauth", "video_upload", "privacy_controls"]
          : platform === "instagram"
            ? ["oauth", "image_publish"]
            : ["oauth", "text_publish", "image_publish"],
  }));
}

export function buildAuthorizationUrl(platform: ProviderPlatform, state: string, redirectUri: string) {
  if (!providerConfigured(platform)) throw new Error(`${platform} provider credentials are not configured.`);

  if (platform === "facebook" || platform === "instagram") {
    const url = new URL(`https://www.facebook.com/${metaVersion()}/dialog/oauth`);
    url.searchParams.set("client_id", env("META_APP_ID"));
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    url.searchParams.set(
      "scope",
      "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish"
    );
    return url.toString();
  }

  if (platform === "linkedin") {
    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", env("LINKEDIN_CLIENT_ID"));
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", "r_organization_admin r_organization_social w_organization_social");
    return url.toString();
  }

  if (platform === "tiktok") {
    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.searchParams.set("client_key", env("TIKTOK_CLIENT_KEY"));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", "user.info.basic,video.publish");
    return url.toString();
  }

  if (platform === "youtube") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", env("YOUTUBE_CLIENT_ID"));
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    url.searchParams.set(
      "scope",
      "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"
    );
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return url.toString();
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env("GOOGLE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "https://www.googleapis.com/auth/business.manage");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

async function connectMeta(platform: "facebook" | "instagram", code: string, redirectUri: string, accountHint: string): Promise<ProviderConnection> {
  const tokenUrl = new URL(`https://graph.facebook.com/${metaVersion()}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", env("META_APP_ID"));
  tokenUrl.searchParams.set("client_secret", env("META_APP_SECRET"));
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);
  const short = (await jsonFetch(tokenUrl.toString())).body;
  if (!short.access_token) throw new Error("Meta did not return an access token.");

  let userToken = short.access_token as string;
  let expiresIn = Number(short.expires_in || 0);
  try {
    const longUrl = new URL(`https://graph.facebook.com/${metaVersion()}/oauth/access_token`);
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", env("META_APP_ID"));
    longUrl.searchParams.set("client_secret", env("META_APP_SECRET"));
    longUrl.searchParams.set("fb_exchange_token", userToken);
    const long = (await jsonFetch(longUrl.toString())).body;
    if (long.access_token) {
      userToken = long.access_token;
      expiresIn = Number(long.expires_in || expiresIn);
    }
  } catch (error:any) {
    console.warn("[Social OAuth] Meta long-lived token exchange unavailable:", error?.message || error);
  }

  const pagesUrl = new URL(`https://graph.facebook.com/${metaVersion()}/me/accounts`);
  pagesUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account{id,username,name}");
  pagesUrl.searchParams.set("limit", "100");
  pagesUrl.searchParams.set("access_token", userToken);
  const pages = ((await jsonFetch(pagesUrl.toString())).body?.data || []) as any[];

  if (platform === "facebook") {
    const page = chooseByHint(pages, accountHint, item => [item.name || "", item.id || ""]);
    if (!page.access_token) throw new Error("Meta did not return a Page access token for the selected Page.");
    return {
      platform,
      providerAccountId: String(page.id),
      accountName: String(page.name || page.id),
      accountHandle: String(page.name || page.id),
      accessToken: String(page.access_token),
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined,
      scopes: ["pages_show_list","pages_read_engagement","pages_manage_posts"],
      metadata: { pageId: String(page.id) },
    };
  }

  const igPages = pages.filter(page => page.instagram_business_account?.id);
  const page = chooseByHint(igPages, accountHint, item => [
    item.name || "",
    item.instagram_business_account?.username || "",
    item.instagram_business_account?.name || "",
    item.instagram_business_account?.id || "",
  ]);
  const ig = page.instagram_business_account;
  if (!page.access_token || !ig?.id) throw new Error("No Instagram Business account was linked to the selected Facebook Page.");
  return {
    platform,
    providerAccountId: String(ig.id),
    accountName: String(ig.name || ig.username || page.name || ig.id),
    accountHandle: String(ig.username ? `@${ig.username}` : ig.id),
    accessToken: String(page.access_token),
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined,
    scopes: ["instagram_basic","instagram_content_publish","pages_show_list"],
    metadata: { instagramBusinessId: String(ig.id), pageId: String(page.id) },
  };
}

async function connectLinkedIn(code: string, redirectUri: string, accountHint: string): Promise<ProviderConnection> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: env("LINKEDIN_CLIENT_ID"),
    client_secret: env("LINKEDIN_CLIENT_SECRET"),
  });
  const token = (await jsonFetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  })).body;
  if (!token.access_token) throw new Error("LinkedIn did not return an access token.");

  const headers = {
    Authorization: `Bearer ${token.access_token}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "Linkedin-Version": linkedinVersion(),
    "Content-Type": "application/json",
  };
  const acl = (await jsonFetch(
    "https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED&count=100",
    { headers }
  )).body;
  const postingRoles = new Set([
    "ADMINISTRATOR",
    "CONTENT_ADMINISTRATOR",
    "CONTENT_ADMIN",
    "DIRECT_SPONSORED_CONTENT_POSTER",
    "RECRUITING_POSTER",
  ]);
  const urns = (acl.elements || [])
    .filter((item:any) => postingRoles.has(String(item.role || "")))
    .map((item:any) => String(item.organization || item.organizationTarget || ""))
    .filter((urn:string) => /^urn:li:organization:\d+$/.test(urn));

  const orgs:any[] = [];
  for (const urn of urns.slice(0, 100)) {
    const id = urn.split(":").pop()!;
    try {
      const org = (await jsonFetch(`https://api.linkedin.com/rest/organizations/${encodeURIComponent(id)}`, { headers })).body;
      orgs.push({ ...org, urn });
    } catch (error:any) {
      console.warn("[Social OAuth] LinkedIn organization lookup failed:", error?.message || error);
    }
  }
  const org = chooseByHint(orgs, accountHint, item => [item.localizedName || "", item.vanityName || "", String(item.id || "")]);
  return {
    platform: "linkedin",
    providerAccountId: String(org.id),
    accountName: String(org.localizedName || org.vanityName || org.id),
    accountHandle: String(org.vanityName ? `linkedin.com/company/${org.vanityName}` : org.id),
    accessToken: String(token.access_token),
    refreshToken: token.refresh_token ? String(token.refresh_token) : undefined,
    expiresAt: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : undefined,
    scopes: ["r_organization_admin","r_organization_social","w_organization_social"],
    metadata: { organizationUrn: String(org.urn || `urn:li:organization:${org.id}`) },
  };
}

async function connectTikTok(code: string, redirectUri: string): Promise<ProviderConnection> {
  const body = new URLSearchParams({
    client_key: env("TIKTOK_CLIENT_KEY"),
    client_secret: env("TIKTOK_CLIENT_SECRET"),
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const token = (await jsonFetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  })).body;
  if (!token.access_token) throw new Error("TikTok did not return an access token.");
  const user = (await jsonFetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name",
    { headers: { Authorization: `Bearer ${token.access_token}` } }
  )).body?.data?.user || {};
  return {
    platform: "tiktok",
    providerAccountId: String(user.open_id || token.open_id || ""),
    accountName: String(user.display_name || "TikTok account"),
    accountHandle: String(user.display_name || user.open_id || token.open_id || "TikTok"),
    accessToken: String(token.access_token),
    refreshToken: token.refresh_token ? String(token.refresh_token) : undefined,
    expiresAt: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : undefined,
    scopes: String(token.scope || "user.info.basic,video.publish").split(",").filter(Boolean),
    metadata: { openId: String(user.open_id || token.open_id || "") },
  };
}

async function connectYouTube(code: string, redirectUri: string): Promise<ProviderConnection> {
  const body = new URLSearchParams({
    client_id: env("YOUTUBE_CLIENT_ID"),
    client_secret: env("YOUTUBE_CLIENT_SECRET"),
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const token = (await jsonFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  })).body;
  if (!token.access_token) throw new Error("Google did not return a YouTube access token.");

  const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  channelUrl.searchParams.set("part", "id,snippet");
  channelUrl.searchParams.set("mine", "true");
  const channelResult = (await jsonFetch(channelUrl.toString(), {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })).body;
  const channel = Array.isArray(channelResult?.items) ? channelResult.items[0] : null;
  if (!channel?.id) {
    throw new Error("No YouTube channel was found for the Google account that approved access.");
  }

  return {
    platform: "youtube",
    providerAccountId: String(channel.id),
    accountName: String(channel.snippet?.title || channel.id),
    accountHandle: String(channel.snippet?.customUrl || channel.snippet?.title || channel.id),
    accessToken: String(token.access_token),
    refreshToken: token.refresh_token ? String(token.refresh_token) : undefined,
    expiresAt: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : undefined,
    scopes: String(token.scope || "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly")
      .split(" ")
      .filter(Boolean),
    metadata: {
      channelId: String(channel.id),
      channelTitle: String(channel.snippet?.title || ""),
      channelCustomUrl: String(channel.snippet?.customUrl || ""),
    },
  };
}

async function connectGoogle(code: string, redirectUri: string, accountHint: string): Promise<ProviderConnection> {
  const body = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    client_secret: env("GOOGLE_CLIENT_SECRET"),
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const token = (await jsonFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  })).body;
  if (!token.access_token) throw new Error("Google did not return an access token.");
  const headers = { Authorization: `Bearer ${token.access_token}` };
  const accounts = (await jsonFetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20", { headers })).body?.accounts || [];
  const locations:any[] = [];
  for (const account of accounts.slice(0, 20)) {
    if (!account?.name) continue;
    const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`);
    url.searchParams.set("readMask", "name,title,storeCode");
    url.searchParams.set("pageSize", "100");
    try {
      const result = (await jsonFetch(url.toString(), { headers })).body;
      for (const location of result.locations || []) locations.push({ ...location, accountName: account.accountName || account.name, accountResource: account.name });
    } catch (error:any) {
      console.warn("[Social OAuth] Google Business locations lookup failed:", error?.message || error);
    }
  }
  const location = chooseByHint(locations, accountHint, item => [item.title || "", item.storeCode || "", item.name || ""]);
  return {
    platform: "google_business",
    providerAccountId: String(location.name),
    accountName: String(location.title || location.name),
    accountHandle: String(location.title || location.name),
    accessToken: String(token.access_token),
    refreshToken: token.refresh_token ? String(token.refresh_token) : undefined,
    expiresAt: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : undefined,
    scopes: ["https://www.googleapis.com/auth/business.manage"],
    metadata: {
      accountResource: String(location.accountResource || ""),
      locationResource: String(location.name || ""),
    },
  };
}

export async function exchangeOAuthCode(
  platform: ProviderPlatform,
  code: string,
  redirectUri: string,
  accountHint: string
): Promise<ProviderConnection> {
  if (!SUPPORTED.includes(platform)) throw new Error("Unsupported social provider.");
  if (!providerConfigured(platform)) throw new Error(`${platform} provider credentials are not configured.`);
  if (platform === "facebook" || platform === "instagram") return connectMeta(platform, code, redirectUri, accountHint);
  if (platform === "linkedin") return connectLinkedIn(code, redirectUri, accountHint);
  if (platform === "tiktok") return connectTikTok(code, redirectUri);
  if (platform === "youtube") return connectYouTube(code, redirectUri);
  return connectGoogle(code, redirectUri, accountHint);
}

function captionWithHashtags(payload: ProviderPublishPayload) {
  const tags = (payload.hashtags || []).map(tag => tag.startsWith("#") ? tag : `#${tag}`).join(" ");
  return [payload.caption?.trim(), tags].filter(Boolean).join("\n\n").trim();
}

async function publishFacebook(account: ProviderAccountRecord, payload: ProviderPublishPayload) {
  const pageId = String(account.metadata.pageId || account.providerAccountId);
  const message = captionWithHashtags(payload);
  const image = (payload.mediaUrls || []).find(url => /^https:\/\//i.test(url));
  const endpoint = image
    ? `https://graph.facebook.com/${metaVersion()}/${encodeURIComponent(pageId)}/photos`
    : `https://graph.facebook.com/${metaVersion()}/${encodeURIComponent(pageId)}/feed`;
  const body = new URLSearchParams({ access_token: account.accessToken });
  if (image) {
    body.set("url", image);
    body.set("caption", message);
  } else {
    body.set("message", message);
  }
  const result = (await jsonFetch(endpoint, { method:"POST", body })).body;
  return String(result.post_id || result.id || "");
}

async function publishInstagram(account: ProviderAccountRecord, payload: ProviderPublishPayload) {
  const igId = String(account.metadata.instagramBusinessId || account.providerAccountId);
  const image = (payload.mediaUrls || []).find(url => /^https:\/\//i.test(url));
  if (!image) throw new Error("Instagram publishing requires a publicly reachable HTTPS image URL.");
  const caption = captionWithHashtags(payload);
  const createBody = new URLSearchParams({
    image_url: image,
    caption,
    access_token: account.accessToken,
  });
  const creation = (await jsonFetch(
    `https://graph.facebook.com/${metaVersion()}/${encodeURIComponent(igId)}/media`,
    { method:"POST", body:createBody }
  )).body;
  if (!creation.id) throw new Error("Instagram did not return a media container.");
  const publishBody = new URLSearchParams({ creation_id:String(creation.id), access_token:account.accessToken });
  const published = (await jsonFetch(
    `https://graph.facebook.com/${metaVersion()}/${encodeURIComponent(igId)}/media_publish`,
    { method:"POST", body:publishBody }
  )).body;
  return String(published.id || "");
}

async function publishLinkedIn(account: ProviderAccountRecord, payload: ProviderPublishPayload) {
  const author = String(account.metadata.organizationUrn || `urn:li:organization:${account.providerAccountId}`);
  const headers = {
    Authorization: `Bearer ${account.accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "Linkedin-Version": linkedinVersion(),
  };
  const result = await jsonFetch("https://api.linkedin.com/rest/posts", {
    method:"POST",
    headers,
    body:JSON.stringify({
      author,
      commentary:captionWithHashtags(payload),
      visibility:"PUBLIC",
      distribution:{ feedDistribution:"MAIN_FEED", targetEntities:[], thirdPartyDistributionChannels:[] },
      lifecycleState:"PUBLISHED",
      isReshareDisabledByAuthor:false,
    }),
  });
  return String(result.response.headers.get("x-restli-id") || result.body?.id || "");
}

export async function queryTikTokCreatorInfo(account: ProviderAccountRecord) {
  if (account.platform !== "tiktok") throw new Error("TikTok creator info requires a TikTok connection.");
  const result = (await jsonFetch("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", {
    method:"POST",
    headers:{ Authorization:`Bearer ${account.accessToken}`, "Content-Type":"application/json; charset=UTF-8" },
    body:JSON.stringify({}),
  })).body;
  if (result?.error?.code && result.error.code !== "ok") {
    throw new Error(result.error.message || result.error.code);
  }
  const data = result?.data || {};
  return {
    creatorUsername:String(data.creator_username || ""),
    creatorNickname:String(data.creator_nickname || ""),
    creatorAvatarUrl:String(data.creator_avatar_url || ""),
    privacyLevelOptions:Array.isArray(data.privacy_level_options) ? data.privacy_level_options.map(String) : [],
    commentDisabled:Boolean(data.comment_disabled),
    duetDisabled:Boolean(data.duet_disabled),
    stitchDisabled:Boolean(data.stitch_disabled),
    maxVideoPostDurationSec:Number(data.max_video_post_duration_sec || 0),
  };
}

async function publishTikTok(account: ProviderAccountRecord, payload: ProviderPublishPayload) {
  const media = (payload.mediaUrls || []).filter(url => /^https:\/\//i.test(url)).slice(0, 35);
  if (!media.length) throw new Error("TikTok Direct Post requires a publicly reachable HTTPS photo from a verified domain or URL prefix.");

  const creator = await queryTikTokCreatorInfo(account);
  const privacy = payload.tiktok?.privacyLevel;
  if (!privacy || !creator.privacyLevelOptions.includes(privacy)) {
    throw new Error("TikTok requires the user to explicitly select one of the current privacy options before Direct Post.");
  }
  if (payload.tiktok?.musicUsageConfirmed !== true) {
    throw new Error("TikTok requires explicit Music Usage Confirmation before Direct Post.");
  }

  const disclosure = Boolean(payload.tiktok?.commercialDisclosure);
  const ownBrand = Boolean(payload.tiktok?.brandOrganicToggle);
  const branded = Boolean(payload.tiktok?.brandContentToggle);
  if (disclosure && !ownBrand && !branded) {
    throw new Error("TikTok commercial content disclosure is enabled; select Your brand, Branded content, or both.");
  }
  if (!disclosure && (ownBrand || branded)) {
    throw new Error("TikTok commercial-content selections require the disclosure setting to be enabled.");
  }
  if (branded && privacy === "SELF_ONLY") {
    throw new Error("TikTok branded content cannot use private/Only me visibility.");
  }

  const result = (await jsonFetch("https://open.tiktokapis.com/v2/post/publish/content/init/", {
    method:"POST",
    headers:{ Authorization:`Bearer ${account.accessToken}`, "Content-Type":"application/json; charset=UTF-8" },
    body:JSON.stringify({
      post_info:{
        title:payload.caption.slice(0,90),
        description:captionWithHashtags(payload).slice(0,4000),
        privacy_level:privacy,
        disable_comment:creator.commentDisabled ? true : Boolean(payload.tiktok?.disableComment),
        auto_add_music:Boolean(payload.tiktok?.autoAddMusic),
        brand_organic_toggle:ownBrand,
        brand_content_toggle:branded,
      },
      source_info:{ source:"PULL_FROM_URL", photo_images:media, photo_cover_index:0 },
      post_mode:"DIRECT_POST",
      media_type:"PHOTO",
      is_aigc:Boolean(payload.tiktok?.isAigc),
    }),
  })).body;
  if (result?.error?.code && result.error.code !== "ok") throw new Error(result.error.message || result.error.code);
  return String(result?.data?.publish_id || "");
}

async function publishYouTube(account: ProviderAccountRecord, payload: ProviderPublishPayload) {
  const settings = payload.youtube || {};
  const videoUrl = String(settings.videoUrl || "").trim();
  if (!/^https:\/\//i.test(videoUrl)) {
    throw new Error("YouTube publishing requires a publicly reachable HTTPS video URL.");
  }

  const title = String(settings.title || payload.caption || "V79 Marketing video").trim().slice(0, 100);
  if (!title) throw new Error("YouTube requires a video title.");
  const description = captionWithHashtags(payload).slice(0, 5000);
  const privacyStatus = ["private","unlisted","public"].includes(String(settings.privacyStatus))
    ? String(settings.privacyStatus)
    : "private";
  const categoryId = /^\d+$/.test(String(settings.categoryId || "")) ? String(settings.categoryId) : "22";

  const sourceResponse = await fetch(videoUrl, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  if (!sourceResponse.ok || !sourceResponse.body) {
    throw new Error(`Could not download the YouTube source video (HTTP ${sourceResponse.status}).`);
  }
  const contentType = String(sourceResponse.headers.get("content-type") || "video/mp4").split(";")[0].trim();
  if (!contentType.startsWith("video/") && contentType !== "application/octet-stream") {
    try { await sourceResponse.body.cancel(); } catch {}
    throw new Error("The YouTube source URL did not return a supported video media type.");
  }

  const metadata = {
    snippet: {
      title,
      description,
      categoryId,
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: Boolean(settings.madeForKids),
      containsSyntheticMedia: Boolean(settings.containsSyntheticMedia),
    },
  };

  const initUrl = new URL("https://www.googleapis.com/upload/youtube/v3/videos");
  initUrl.searchParams.set("uploadType", "resumable");
  initUrl.searchParams.set("part", "snippet,status");
  const initHeaders:Record<string,string> = {
    Authorization: `Bearer ${account.accessToken}`,
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": contentType,
  };
  const contentLength = sourceResponse.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength)) initHeaders["X-Upload-Content-Length"] = contentLength;

  const initResponse = await fetch(initUrl.toString(), {
    method: "POST",
    headers: initHeaders,
    body: JSON.stringify(metadata),
    signal: AbortSignal.timeout(30_000),
  });
  if (!initResponse.ok) {
    const errorText = await initResponse.text().catch(() => "");
    try { await sourceResponse.body.cancel(); } catch {}
    throw new Error(errorText || `YouTube upload session failed (HTTP ${initResponse.status}).`);
  }
  const uploadUrl = initResponse.headers.get("location");
  if (!uploadUrl) {
    try { await sourceResponse.body.cancel(); } catch {}
    throw new Error("YouTube did not return a resumable upload session URL.");
  }

  const uploadHeaders:Record<string,string> = { "Content-Type": contentType };
  if (contentLength && /^\d+$/.test(contentLength)) uploadHeaders["Content-Length"] = contentLength;
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: uploadHeaders,
    body: sourceResponse.body as any,
    duplex: "half",
    signal: AbortSignal.timeout(30 * 60 * 1000),
  } as any);

  const raw = await uploadResponse.text();
  let result:any = {};
  try { result = raw ? JSON.parse(raw) : {}; } catch { result = { raw }; }
  if (!uploadResponse.ok) {
    const message = result?.error?.message || result?.message || raw || `YouTube upload failed (HTTP ${uploadResponse.status}).`;
    throw new Error(String(message));
  }
  if (!result?.id) throw new Error("YouTube accepted the upload but did not return a video ID.");
  return String(result.id);
}

async function publishGoogleBusiness(account: ProviderAccountRecord, payload: ProviderPublishPayload) {
  const locationResource = String(account.metadata.locationResource || account.providerAccountId);
  if (!/^locations\//.test(locationResource)) throw new Error("Google Business Profile location metadata is missing.");
  const accountResource = String(account.metadata.accountResource || "");
  if (!/^accounts\//.test(accountResource)) throw new Error("Google Business Profile account metadata is missing.");
  const parent = `${accountResource}/${locationResource}`;
  const mediaUrl = (payload.mediaUrls || []).find(url => /^https:\/\//i.test(url));
  const request:any = {
    languageCode:"en-US",
    summary:captionWithHashtags(payload).slice(0,1500),
    topicType:"STANDARD",
  };
  if (mediaUrl) request.media = [{ mediaFormat:"PHOTO", sourceUrl:mediaUrl }];
  if (payload.website && /^https:\/\//i.test(payload.website)) {
    request.callToAction = { actionType:"LEARN_MORE", url:payload.website };
  }
  const result = (await jsonFetch(
    `https://mybusiness.googleapis.com/v4/${parent}/localPosts`,
    {
      method:"POST",
      headers:{ Authorization:`Bearer ${account.accessToken}`, "Content-Type":"application/json" },
      body:JSON.stringify(request),
    }
  )).body;
  return String(result.name || "");
}

export async function refreshProviderAccess(account: ProviderAccountRecord): Promise<ProviderAccountRecord> {
  const expiresAt = account.expiresAt ? Date.parse(account.expiresAt) : 0;
  if (!expiresAt || expiresAt - Date.now() > 10 * 60 * 1000) return account;

  if (account.platform === "facebook" || account.platform === "instagram") {
    throw new Error("Meta access has expired. Reconnect the Facebook/Instagram account.");
  }
  if (!account.refreshToken) {
    throw new Error("Provider access has expired and no refresh token is available. Reconnect the account.");
  }

  let token:any;
  if (account.platform === "youtube") {
    const body = new URLSearchParams({
      client_id:env("YOUTUBE_CLIENT_ID"),
      client_secret:env("YOUTUBE_CLIENT_SECRET"),
      refresh_token:account.refreshToken,
      grant_type:"refresh_token",
    });
    token = (await jsonFetch("https://oauth2.googleapis.com/token", {
      method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded"},
      body,
    })).body;
  } else if (account.platform === "google_business") {
    const body = new URLSearchParams({
      client_id:env("GOOGLE_CLIENT_ID"),
      client_secret:env("GOOGLE_CLIENT_SECRET"),
      refresh_token:account.refreshToken,
      grant_type:"refresh_token",
    });
    token = (await jsonFetch("https://oauth2.googleapis.com/token", {
      method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded"},
      body,
    })).body;
  } else if (account.platform === "linkedin") {
    const body = new URLSearchParams({
      grant_type:"refresh_token",
      refresh_token:account.refreshToken,
      client_id:env("LINKEDIN_CLIENT_ID"),
      client_secret:env("LINKEDIN_CLIENT_SECRET"),
    });
    token = (await jsonFetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded"},
      body,
    })).body;
  } else if (account.platform === "tiktok") {
    const body = new URLSearchParams({
      client_key:env("TIKTOK_CLIENT_KEY"),
      client_secret:env("TIKTOK_CLIENT_SECRET"),
      grant_type:"refresh_token",
      refresh_token:account.refreshToken,
    });
    token = (await jsonFetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded"},
      body,
    })).body;
  } else {
    return account;
  }

  if (!token?.access_token) throw new Error("Provider token refresh failed. Reconnect the account.");
  return {
    ...account,
    accessToken:String(token.access_token),
    refreshToken:token.refresh_token ? String(token.refresh_token) : account.refreshToken,
    expiresAt:token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : account.expiresAt,
  };
}

export async function publishWithProvider(account: ProviderAccountRecord, payload: ProviderPublishPayload): Promise<ProviderPublishResult> {
  let providerPostId = "";
  if (account.platform === "facebook") providerPostId = await publishFacebook(account, payload);
  else if (account.platform === "instagram") providerPostId = await publishInstagram(account, payload);
  else if (account.platform === "linkedin") providerPostId = await publishLinkedIn(account, payload);
  else if (account.platform === "tiktok") providerPostId = await publishTikTok(account, payload);
  else if (account.platform === "youtube") providerPostId = await publishYouTube(account, payload);
  else if (account.platform === "google_business") providerPostId = await publishGoogleBusiness(account, payload);
  else throw new Error("This provider does not support publishing.");

  if (!providerPostId) throw new Error("Provider accepted the request but did not return a post identifier.");
  return { providerPostId, publishedAt:new Date().toISOString() };
}

export type { ProviderPlatform };
