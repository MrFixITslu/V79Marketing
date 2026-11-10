import {describe,it,expect} from 'vitest';
import {MASTER_SKILL,skillPreview} from '../src/lib/personalMarketingSkills.js';
const approved={businessName:'Synthetic Sample Business',services:[{
  service:'Document organisation',statement:'Synthetic Sample Business provides document indexing services.',
}]};
describe('private personal-skill creative preview',()=>{
  it('responds to audience and brand voice using verified facts without generating pretend media',()=>{
    const a=skillPreview({...MASTER_SKILL,audienceMarkets:'Caribbean SMEs in Saint Lucia',
      voiceLanguage:'Friendly conversational UK English',visualStyle:'Vertical 9:16 short video'},approved);
    const b=skillPreview({...MASTER_SKILL,audienceMarkets:'Professional legal teams in London',
      voiceLanguage:'Formal professional English',visualStyle:'Square 1:1 static image'},approved);
    expect(a.headline).not.toBe(b.headline);
    expect(a.format).toBe('9:16 portrait');
    expect(b.format).toBe('1:1 square');
    expect(a.tone).toBe('friendly');
    expect(b.tone).toBe('professional');
    expect(a.sampleCaption).toContain('Synthetic Sample Business provides document indexing services.');
    expect(a.kind).toBe('local_text_and_layout_example');
    expect(a.mediaGenerated).toBe(false);
  });
  it('without signed business facts, warns honestly instead of inventing products/claims',()=>{
    const output=skillPreview({...MASTER_SKILL,voiceLanguage:'French professional audience'},null);
    expect(output.verifiedClaims).toBe(false);
    expect(output.sampleCaption).toContain('No verified service claims');
    expect(output.mediaGenerated).toBe(false);
    expect(output.language).toBe('French');
  });
  it('rejects probable secrets from a preview request, without repeating synthetic tokens',()=>{
    expect(()=>skillPreview({...MASTER_SKILL,advancedInstructions:
      'Use my key sk-proj-abcdefghijklmnopqrstuvwxyz1234567890'},null)).toThrow(/Potential credential/);
  });
});
