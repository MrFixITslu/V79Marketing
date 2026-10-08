import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

describe('Marketing Hub provisioning signature contract', () => {
  it('receives the same signing key used by the Hub for provisioning without changing the launch key', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const compose = readFileSync(resolve(root, 'docker-compose.yml'), 'utf8');
    expect(compose).toContain('V79_HUB_PROVISION_SECRET: '+String.fromCharCode(36)+'{V79_PLATFORM_SHARED_SECRET}');
    expect(compose).toContain('V79_MARKETING_LAUNCH_SECRET: '+String.fromCharCode(36)+'{V79_MARKETING_LAUNCH_SECRET}');
    expect(compose).not.toContain('V79_HUB_PROVISION_SECRET: '+String.fromCharCode(36)+'{V79_HUB_PROVISION_SECRET}');
  });
});
