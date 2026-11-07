import { describe, expect, it } from 'vitest';
import { prepareCampaignContent } from '../src/lib/campaignHandoff';
import type { Campaign, CampaignStep } from '../src/types';

const step:CampaignStep = {
  dayNumber: 1, channel: 'linkedin', postTitle: 'Introduce Tiquet',
  captionPrompt: 'Explain how service teams could organise their customer requests',
  suggestedTime: '10:00 AM', completed: false
};
const campaign:Campaign = {
  id:'campaign-1', businessId:'owner-business', name:'Tiquet local pilot',
  objective:'Help Saint Lucia service businesses understand Tiquet; request a demonstration',
  startDate:'2026-10-27', endDate:'2026-11-27', status:'PLANNED',
  steps:[step], aiPlanGenerated:true, createdAt:'2026-10-27T12:00:00Z'
};

describe('Guided campaign to content handoff', () => {
  it('passes the saved campaign ID and approved conversion goal to the existing creator', () => {
    const result=prepareCampaignContent(campaign,step,'owner-business');
    expect(result.campaignId).toBe('campaign-1');
    expect(result.recommendedChannel).toBe('linkedin');
    expect(result.prompt).toContain('request a demonstration');
    expect(result.prompt).toContain('HUMAN REVIEW only');
    expect(result.prompt).toContain('Never invent');
  });
  it('denies cross-business handoffs and steps that do not belong to the campaign', () => {
    expect(() => prepareCampaignContent(campaign,step,'other-business')).toThrow(/active business/);
    expect(() => prepareCampaignContent(campaign,{...step},'owner-business')).toThrow(/saved step/);
  });
  it('does not infer a publishable channel when the step requests a manual WhatsApp follow-up', () => {
    const manual={...step,channel:'whatsapp' as const};
    const own={...campaign,steps:[manual]};
    expect(prepareCampaignContent(own,manual,'owner-business').recommendedChannel).toBe('whatsapp');
  });
  it('prevents oversized AI text and strips control characters', () => {
    const own={...campaign,objective:'x'.repeat(9000)};
    const result=prepareCampaignContent(own,step,'owner-business');
    expect(result.prompt.length).toBeLessThan(4000);
    expect(prepareCampaignContent({...campaign,name:'Tiquet\n\tDemo'},step,'owner-business').campaignName).toBe('Tiquet Demo');
  });
});
