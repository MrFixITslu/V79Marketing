import { describe, expect, it } from 'vitest';
import { FAQ_CSV_MAX_BYTES, mergeFaqs, parseFaqCsv } from '../src/lib/faqCsv';

describe('Marketing FAQ CSV import', () => {
  it('supports BOM, CRLF, embedded commas, escaped quotes and multi-line answers', () => {
    const parsed = parseFaqCsv('\uFEFFQuestion,Answer\r\n"What is ""MFA""?","Secure, second factor"\r\n"Hours?","Mon\nFri"');
    expect(parsed).toEqual([{q:'What is "MFA"?', a:'Secure, second factor'},{q:'Hours?',a:'Mon\nFri'}]);
  });
  it('accepts Q and A columns alongside unrelated metadata', () => {
    expect(parseFaqCsv('category,Q,A\npricing,Price?,Contact us')).toEqual([{q:'Price?',a:'Contact us'}]);
  });
  it('rejects malformed and incomplete files', () => {
    expect(() => parseFaqCsv('question,answer\n"x,hello')).toThrow(/unfinished/);
    expect(() => parseFaqCsv('question,answer\nQuestion,')).toThrow(/Missing/);
    expect(() => parseFaqCsv('foo,bar\nA,B')).toThrow(/Question and Answer/);
  });
  it('enforces file size and stored FAQ limits', () => {
    expect(() => parseFaqCsv('x'.repeat(FAQ_CSV_MAX_BYTES + 1))).toThrow(/1 MB/);
    expect(() => mergeFaqs(Array.from({length:100},(_,i)=>({q:'Q'+i,a:'A'})),[{q:'New',a:'A'}])).toThrow(/100 FAQs/);
  });
  it('preserves existing FAQ answers and skips duplicate questions', () => {
    expect(mergeFaqs([{q:'Price?',a:'Existing answer'}],[{q:' price? ',a:'New answer'},{q:'Hours?',a:'9 to 5'}]))
      .toEqual({faqs:[{q:'Price?',a:'Existing answer'},{q:'Hours?',a:'9 to 5'}],added:1,skipped:1});
  });
});
