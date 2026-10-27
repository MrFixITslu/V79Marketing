import type { Campaign, CampaignStep, SocialPlatform } from '../types';

export interface CampaignContentHandoff {
  campaignId: string;
  campaignName: string;
  recommendedChannel: SocialPlatform;
  prompt: string;
  title: string;
}

const channels = new Set<SocialPlatform>([
  'facebook','instagram','linkedin','twitter','tiktok','youtube','google_business','whatsapp'
]);

function safeText(value: string, limit: number): string {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

/**
 * Prefill the existing human-reviewed content creator from a persisted campaign.
 * This does not create a post, book a time or grant publishing consent.
 */
export function prepareCampaignContent(
  campaign: Campaign, step: CampaignStep, authenticatedBusinessId: string
): CampaignContentHandoff {
  if (!authenticatedBusinessId || campaign.businessId !== authenticatedBusinessId) {
    throw new Error('Campaign is not in the active business workspace.');
  }
  if (!campaign.id || !campaign.steps.some(value => value === step)) {
    throw new Error('Choose a saved step from this campaign.');
  }
  if (!channels.has(step.channel)) {
    throw new Error('This channel is not recognised.');
  }
  const name = safeText(campaign.name, 160);
  const title = safeText(step.postTitle, 160);
  const objective = safeText(campaign.objective, 1400);
  const idea = safeText(step.captionPrompt, 700);
  if (!name || !title || !objective) throw new Error('This campaign step is incomplete.');
  const prompt = [
    'Prepare social marketing copy for HUMAN REVIEW only. Do not schedule or publish.',
    'Campaign: ' + name,
    'Campaign goal, audience, approved facts and call to action: ' + objective,
    'Suggested platform: ' + step.channel,
    'Suggested creative title: ' + title,
    idea ? 'Original campaign step idea (unverified until reviewed): ' + idea : '',
    'Use only substantiated business facts. Never invent pricing, reviews, savings, performance or availability.',
    'Adapt messaging to the platform and use the call to action in the campaign goal.'
  ].filter(Boolean).join('\n');
  return {
    campaignId: campaign.id,
    campaignName: name,
    recommendedChannel: step.channel,
    prompt,
    title
  };
}
