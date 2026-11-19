import { describe, expect, it } from 'vitest';
import { buildCampaignBrief } from '../src/lib/campaignBrief';

describe('Outcome-first campaign brief', () => {
  const valid = {
    idea: 'Help shops manage their service tickets with Tiquet',
    audience: 'Saint Lucia small businesses losing time following up customer requests',
    nextAction: 'Book a demo through the Hub'
  };

  it('keeps target customer and conversion action explicit without inventing product facts', () => {
    const result = buildCampaignBrief(valid);
    expect(result.name).toBe(valid.idea);
    expect(result.objective).toContain('Target customer and problem: ' + valid.audience);
    expect(result.objective).toContain('Desired customer action: ' + valid.nextAction);
    expect(result.objective).toContain('leave unsupported claims out');
    expect(result.objective).toContain('does not authorise publication');
  });

  it('allows owner-provided factual context but labels it for review', () => {
    const result = buildCampaignBrief({...valid, confirmedFacts: 'Available as part of the V79 Hub ecosystem'});
    expect(result.objective).toContain('Owner-provided facts for review: Available as part of the V79 Hub ecosystem');
  });

  it('requires a target and a customer action', () => {
    expect(() => buildCampaignBrief({...valid, audience: ' '})).toThrow(/target customers/);
    expect(() => buildCampaignBrief({...valid, nextAction: ''})).toThrow(/action/);
  });

  it('rejects overlong input and normalises control characters', () => {
    expect(() => buildCampaignBrief({...valid, idea: 'x'.repeat(241)})).toThrow(/too long/);
    const result = buildCampaignBrief({...valid, idea: 'Tiquet\n\t launch'});
    expect(result.name).toBe('Tiquet launch');
  });
});
