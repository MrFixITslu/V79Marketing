import { describe, expect, it, vi, afterEach } from 'vitest';
import { renameHubOrganization } from '../src/lib/platform';
import { signPlatformRequest } from '../src/lib/platform';

const env = {
  url: process.env.V79_HUB_INTERNAL_URL,
  secret: process.env.V79_MARKETING_LAUNCH_SECRET,
};
const input = {
  organizationId: 'org-12345678',
  scopedUserId: 'user-12345678',
  name: 'Example Business',
  expectedName: 'Original Business',
};
afterEach(() => {
  if (env.url === undefined) delete process.env.V79_HUB_INTERNAL_URL;
  else process.env.V79_HUB_INTERNAL_URL = env.url;
  if (env.secret === undefined) delete process.env.V79_MARKETING_LAUNCH_SECRET;
  else process.env.V79_MARKETING_LAUNCH_SECRET = env.secret;
  vi.unstubAllGlobals();
});
function configure() {
  process.env.V79_HUB_INTERNAL_URL = 'http://hub.internal:3000';
  process.env.V79_MARKETING_LAUNCH_SECRET = 'marketing-test-secret-32-chars-or-more';
}
describe('Marketing-Hub organisation-name write boundary', () => {
  it('sends an HMAC-authenticated, tenant- and user-scoped request', async () => {
    configure();
    const fetchSpy = vi.fn(async (_url: unknown, opts: any) => {
      expect(opts.method).toBe('POST');
      const timestamp = opts.headers['x-v79-timestamp'];
      const pathname = '/api/platform/organization/name';
      expect(opts.headers['x-v79-service-id']).toBe('v79-marketing');
      expect(opts.headers['x-v79-signature']).toBe(signPlatformRequest({
        method: 'POST', pathname, timestamp, body: opts.body,
        secret: process.env.V79_MARKETING_LAUNCH_SECRET!,
      }));
      expect(JSON.parse(opts.body)).toEqual(input);
      return { ok: true, json: async () => ({ success: true, organizationId: input.organizationId, name: input.name }) };
    });
    vi.stubGlobal('fetch', fetchSpy);
    expect(await renameHubOrganization(input)).toEqual({ name: input.name, propagation: {} });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects Hub owner permission denial without local fallback', async () => {
    configure();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 403, json: async () => ({ error: 'Denied' }),
    })));
    await expect(renameHubOrganization(input)).rejects.toThrow('Only the Hub organisation owner');
  });

  it('rejects mismatched tenant or confirmed name', async () => {
    configure();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, json: async () => ({ success: true, organizationId: 'other-tenant', name: input.name }),
    })));
    await expect(renameHubOrganization(input)).rejects.toThrow('mismatched business identity');
  });

  it('rejects missing signing configuration', async () => {
    delete process.env.V79_MARKETING_LAUNCH_SECRET;
    delete process.env.V79_HUB_INTERNAL_URL;
    await expect(renameHubOrganization(input)).rejects.toThrow('not configured');
  });
});
