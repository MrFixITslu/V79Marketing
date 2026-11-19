import { describe,it,expect } from 'vitest';
import { allowedProfileMediaName, allowedProfileMediaOwner, profileImageExtension } from '../src/lib/profileMedia';

describe('Safe business logo and banner uploads', () => {
  it('accepts valid PNG signature with IHDR', () => {
    const buf=Buffer.alloc(24);
    Buffer.from([137,80,78,71,13,10,26,10]).copy(buf);
    buf.write('IHDR',12,'ascii');
    expect(profileImageExtension(buf,'image/png')).toBe('.png');
  });
  it('rejects executable SVG, content-type spoofing and malformed files', () => {
    const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(profileImageExtension(svg,'image/svg+xml')).toBeNull();
    expect(profileImageExtension(svg,'image/png')).toBeNull();
    expect(profileImageExtension(Buffer.from('hello'),'image/jpeg')).toBeNull();
  });
  it('blocks traversal paths and only serves safe tenant directory and UUID asset IDs', () => {
    expect(allowedProfileMediaOwner('a'.repeat(32))).toBe(true);
    expect(allowedProfileMediaOwner('../etc/passwd')).toBe(false);
    expect(allowedProfileMediaName('123e4567-e89b-42d3-a456-426614174000.png')).toBe(true);
    expect(allowedProfileMediaName('../secret.png')).toBe(false);
  });
});
