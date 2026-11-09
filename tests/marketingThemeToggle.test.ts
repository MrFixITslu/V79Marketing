import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const navbar = readFileSync(new URL('../src/components/Navbar.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

describe('Marketing accessible theme toggle', () => {
  it('preserves dark default and a stored explicit choice', () => {
    expect(app).toContain("localStorage.getItem('v79-marketing-theme')");
    expect(app).toContain("localStorage.setItem('v79-marketing-theme', theme)");
    expect(app).toContain("return 'dark'; // Preserve the approved dark workspace");
    expect(app).toContain('data-theme={theme}');
  });

  it('offers a labelled, keyboard-friendly toggle in the navigation', () => {
    expect(navbar).toContain('onClick={onToggleTheme}');
    expect(navbar).toContain("aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}");
    expect(navbar).toContain("aria-pressed={theme === 'light'}");
  });

  it('keeps theme-specific styling in signed-in Marketing', () => {
    expect(app.indexOf("if (currentView === 'public_storefront')")).toBeLessThan(app.indexOf('data-theme={theme}'));
    expect(css).toContain('.v79-marketing-app[data-theme="light"]');
    expect(css).toContain('color-scheme:light');
    expect(css).toContain('.v79-marketing-app[data-theme="light"] .v79-workspace');
    expect(css).toContain('.v79-marketing-app .v79-theme-toggle');
  });

  it('retains separate light and dark high-contrast text tokens', () => {
    for (const colour of ['#142b40','#475d72','#e8eef7']) {
      expect(css).toContain(colour);
    }
  });
});
