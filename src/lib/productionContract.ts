import { z } from 'zod';
import { createHash } from 'node:crypto';

export const channels = ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'newsletter'] as const;
export type ProductionChannel = typeof channels[number];
const text = (max: number) => z.string().trim().min(1).max(max).refine(v =>
  !/[\u0000-\u0008\u000b-\u001f\u007f]/.test(v) &&
  !/\b(password|secret|token|api[_ -]?key)\s*[:=]/i.test(v), 'Unsafe text');
const https = z.string().url().max(500).refine(v => {
  const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password && !u.hash;
}, 'HTTPS URL required');
export const brandSchema = z.object({
  name: text(80), tagline: text(100), audience: text(180), tone: text(160),
  website: https, cta: text(100), linkTracking:z.enum(['plain','utm']).optional(), primaryColor: z.string().regex(/^#[a-f0-9]{6}$/i),
  accentColor: z.string().regex(/^#[a-f0-9]{6}$/i),
  logoPng: z.string().max(1400000).regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/).nullable(),
  mailingAddress: text(300).nullable(),
  facts: z.array(z.object({ id: text(40), service: text(80), statement: text(350) }).strict()).min(1).max(20),
}).strict().superRefine((b, c) => {
  if (new Set(b.facts.map(f => f.id)).size !== b.facts.length) c.addIssue({code:'custom', message:'Duplicate fact IDs'});
});
export type ProductionBrand = z.infer<typeof brandSchema>;
export const planSchema = z.object({
  automaticDrafts: z.boolean(), cadenceDays: z.number().int().min(3).max(30),
  channels: z.array(z.enum(channels)).min(1).max(6).refine(a => new Set(a).size === a.length),
  publishDelayHours: z.number().int().min(1).max(168),
  // Newsletter recipients are operator-managed, opt-in Resend segments. The
  // worker never selects contacts from customer records or expands a list.
  newsletterSegmentId: z.string().uuid().nullable(), newsletterFrom: z.string().email().nullable(),
  newsletterConsentConfirmed: z.boolean(),
  tiktokPrivacy: z.enum(['SELF_ONLY','PUBLIC_TO_EVERYONE','MUTUAL_FOLLOW_FRIENDS','FOLLOWER_OF_CREATOR']).nullable().optional(),
  tiktokMusicConfirmed: z.boolean().optional(), youtubePrivacy: z.enum(['private','unlisted','public']),
}).strict();
export type ProductionPlan = z.infer<typeof planSchema>;
export const configureSchema = z.object({brand:brandSchema, plan:planSchema, expectedRevision:z.number().int().min(0)}).strict();
export const queueSchema = z.object({factId:text(40), angle:text(200), idempotencyKey:z.string().regex(/^[A-Za-z0-9_-]{16,96}$/)}).strict();
export const creativeSchema = z.object({hook:text(85), tip:text(160)}).strict();
export type Creative = z.infer<typeof creativeSchema>;
export type Asset = { name:string; sha256:string; bytes:number; mime:string };
export type Material = { factId:string; channel:ProductionChannel; title:string; caption:string; hashtags:string[];
  altText:string; videoScript:string; videoScenes:string[]; newsletterHtml?:string };
export type ProductionBundle = { schemaVersion:1; source:'ollama'|'brand-template'; brand:ProductionBrand;
  factId:string; angle:string; materials:Material[]; assets:Asset[]; review:ProductionReview };
export type ProductionReview = { role:'ceo'; method:'deterministic-redteam'; blockers:string[]; warnings:string[];
  checks:string[]; reviewedAt:string };
export function canonical(value:unknown):string {
  return JSON.stringify(value, (_k,v) => v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k,v[k]])) : v);
}
export const digest = (value:unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export const escapeHtml = (value:string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function createMaterials(brand:ProductionBrand, plan:ProductionPlan, factId:string, creative:Creative, campaignId=factId):Material[] {
  const fact = brand.facts.find(f => f.id === factId);
  if (!fact) throw Error('Owner-approved fact required');
  return plan.channels.map(channel => {
    // Plain CTA is the safe default: V79's explicitly approved public website
    // is https://v79sl.com, without campaign parameters or /faq.
    // Other customer brands may explicitly opt in to UTMs in their brand plan.
    const url = new URL(brand.website);
    if (brand.linkTracking==='utm' && url.hostname!=='v79sl.com') {
      url.searchParams.set('utm_source',channel);
      url.searchParams.set('utm_medium',channel==='newsletter'?'email':'organic_social');
      url.searchParams.set('utm_campaign',campaignId);
    }
    const link=url.toString();
    const hook = creative.hook;
    const detail = channel === 'linkedin' ? `${creative.tip}\n\n${fact.statement}` : `${fact.statement}\n\n${creative.tip}`;
    const title = `${fact.service}: ${hook}`.slice(0,95);
    const caption = `${hook}\n\n${detail}\n\n${brand.cta}: ${link}\n${brand.tagline}`;
    const videoScenes=[hook,fact.statement,creative.tip,brand.cta+'\n'+new URL(brand.website).hostname];
    const item:Material = {factId,channel,title,caption,videoScenes,hashtags:['V79Digital','CaribbeanBusiness'],
      altText:`${brand.name}: ${fact.service}. ${fact.statement}`, videoScript:videoScenes.join(' ' )};
    if (channel === 'newsletter') item.newsletterHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#172033"><main style="max-width:600px;margin:auto"><h1>${escapeHtml(hook)}</h1><p>${escapeHtml(fact.statement)}</p><p>${escapeHtml(creative.tip)}</p><p><a href="${escapeHtml(link)}">${escapeHtml(brand.cta)}</a></p><footer><p>${escapeHtml(brand.name)} · ${escapeHtml(brand.tagline)}</p><p>${escapeHtml(brand.mailingAddress || '[Mailing address required before sending]')}</p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a></footer></main></body></html>`;
    return item;
  });
}
export function reviewMaterials(brand:ProductionBrand, materials:Material[], now = new Date()):ProductionReview {
  const blockers:string[] = [], warnings:string[] = [];
  const allowed = brand.facts.map(f => f.statement).join(' ');
  const all = materials.map(m => m.title+' '+m.caption+' '+m.videoScript).join(' ');
  for (const word of ['guarantee','guaranteed','discount','award-winning','24/7','number one','best in']) {
    if (all.toLowerCase().includes(word) && !allowed.toLowerCase().includes(word)) blockers.push('Unverified claim: '+word);
  }
  const factualNumbers = new Set((allowed+' '+brand.name+' '+brand.tagline+' '+brand.website).match(/\d+(?:[.,]\d+)?%?/g) || []);
  for (const number of all.replace(/https?:\/\/[^\s<>"']+/g,'').match(/\d+(?:[.,]\d+)?%?/g) || []) if (!factualNumbers.has(number)) blockers.push('Unverified number');
  const domain = new URL(brand.website).hostname;
  for (const match of all.match(/https?:\/\/[^\s<>"']+/g) || []) {
    try { if (new URL(match).hostname !== domain) blockers.push('Unapproved CTA destination'); }
    catch { blockers.push('Invalid CTA destination'); }
  }
  for (const m of materials) {
    if (!m.caption.includes(brand.cta) || !m.caption.includes(brand.tagline)) blockers.push('Missing brand or primary CTA');
    if (m.channel === 'instagram' && m.caption.length > 2200) blockers.push('Instagram caption too long');
    if (m.channel === 'linkedin' && m.caption.length > 3000) blockers.push('LinkedIn caption too long');
    if (!m.altText.trim()) blockers.push('Missing alt text');
    if (m.channel === 'newsletter' && !brand.mailingAddress) warnings.push('Newsletter sending blocked until mailing address is configured');
  }
  if (!brand.logoPng) warnings.push('Text wordmark used; original brand logo has not been supplied');
  warnings.push('Automated checks cannot prove every factual or creative claim; owner must review final materials');
  return {role:'ceo',method:'deterministic-redteam',blockers:[...new Set(blockers)],warnings:[...new Set(warnings)],
    checks:['owner-approved fact citation','CTA destination','claim and number screening','channel length','accessibility','newsletter footer'],reviewedAt:now.toISOString()};
}
