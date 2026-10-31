import {describe,it,expect} from 'vitest';
import {eligibleStudioPublishMedia,studioPublishedMediaType} from '../src/lib/studioPublishMediaPolicy.js';
const png={kind:'image',mime:'image/png'},jpg={kind:'image',mime:'image/jpeg'},
 video={kind:'video',mime:'video/mp4'};
describe('NEW provider-specific signed Studio media format gate',()=>{
 it('refuses PNG for Instagram JPEG-only API, even with an MP4 attached',()=>{
   expect(eligibleStudioPublishMedia('instagram',[png,video])).toBe(false);
   expect(studioPublishedMediaType('instagram',png)).toBe(false);
   expect(eligibleStudioPublishMedia('instagram',[jpg,video])).toBe(true);
 });
 it('allows Facebook PNG/JPEG, YouTube MP4 and rejects unsupported channels',()=>{
   expect(eligibleStudioPublishMedia('facebook',[png])).toBe(true);
   expect(eligibleStudioPublishMedia('facebook',[jpg])).toBe(true);
   expect(eligibleStudioPublishMedia('youtube',[video])).toBe(true);
   expect(eligibleStudioPublishMedia('youtube',[png])).toBe(false);
   expect(eligibleStudioPublishMedia('tiktok',[video])).toBe(false);
 });
});
