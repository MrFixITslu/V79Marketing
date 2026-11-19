export interface CampaignBriefInput {
  idea: string;
  audience: string;
  nextAction: string;
  confirmedFacts?: string;
}

function clean(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Constructs a reviewable, outcome-first campaign brief.
 * Does not generate content, create posts, schedule, or publish.
 */
export function buildCampaignBrief(input: CampaignBriefInput): {name: string; objective: string} {
  const idea = clean(input.idea);
  const audience = clean(input.audience);
  const nextAction = clean(input.nextAction);
  const confirmedFacts = clean(input.confirmedFacts || '');
  if (!idea || !audience || !nextAction) {
    throw new Error('Describe your idea, target customers and the action you want them to take.');
  }
  if (idea.length > 240 || audience.length > 160 || nextAction.length > 100 || confirmedFacts.length > 350) {
    throw new Error('One or more campaign brief fields are too long.');
  }
  const objective = [
    'Create a focused 30-day multi-channel campaign plan.',
    'Product, service or event: ' + idea,
    'Target customer and problem: ' + audience,
    'Desired customer action: ' + nextAction,
    confirmedFacts ? 'Owner-provided facts for review: ' + confirmedFacts : 'No offer details or proof supplied; leave unsupported claims out.',
    'For each step, suggest a relevant benefit-led hook and a clear next action.',
    'Adapt copy to each channel. Never invent prices, discounts, reviews, performance results or availability.',
    'This request creates a plan only; it does not authorise publication.'
  ].join('\n');
  if (objective.length > 2000) throw new Error('Campaign brief is too long.');
  return { name: idea.slice(0, 120), objective };
}
