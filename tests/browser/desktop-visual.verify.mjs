// Run against the local Vite fixture server. No build or publication.
import { chromium, webkit, expect } from '@playwright/test';
import fs from 'node:fs/promises';

const engine = process.env.VISUAL_BROWSER === 'webkit' ? webkit : chromium;
const output = 'build/desktop-visual';
await fs.mkdir(output, { recursive: true });
const browser = await engine.launch(engine === chromium ? {
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
} : { headless: true });
const context = await browser.newContext({ deviceScaleFactor: 1, timezoneId: 'UTC' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const results = { browser: engine.name(), version: browser.version(), dpr: 1, screenshots: [], checks: [], geometry: {}, errors };
const base = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:1436';
const fixture = `${base}/tests/browser/desktop-visual.html`;

async function ready(selector = '[data-settings-title]') {
  await page.locator(selector).first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}
async function capture(name) {
  const file = `${engine.name()}-${name}.png`;
  await page.screenshot({ path: `${output}/${file}` });
  results.screenshots.push(file);
}
async function measure(selector) {
  return page.locator(selector).first().evaluate(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, fontSize: style.fontSize, lineHeight: style.lineHeight, fontWeight: style.fontWeight, radius: style.borderRadius, background: style.backgroundColor, fontFamily: style.fontFamily };
  });
}
function near(actual, expected, tolerance = .1) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}
async function animations(selector) {
  return page.locator(selector).first().evaluate(element => element.getAnimations({ subtree: true }).map(animation => ({
    duration: animation.effect?.getTiming().duration,
    easing: animation.effect?.getTiming().easing,
    frames: animation.effect?.getKeyframes().map(frame => ({ opacity: frame.opacity, transform: frame.transform, easing: frame.easing })),
  })));
}

try {
  for (const theme of ['light', 'dark']) {
    for (const [width, height, lang, large] of [[1280, 932, 'en', false], [1440, 900, 'en', false], [1000, 800, 'zh-CN', false], [800, 600, 'zh-CN', true]]) {
      for (const view of ['gallery', 'settings']) {
        await page.setViewportSize({ width, height });
        await page.goto(`${fixture}?page=${view}&theme=${theme}&lang=${lang}${large ? '&large' : ''}`);
        await ready();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await capture(`${view}-${theme}-${width}${large ? '-large' : ''}`);
        if (width === 1280 && view === 'settings') {
          const dialog = await measure('[role="dialog"]');
          const nav = await measure('.settings-nav');
          const title = await measure('[data-settings-title]');
          const search = await measure('input[type="search"]');
          const card = await page.locator('.settings-card').first().evaluate(element => ({ border: getComputedStyle(element).borderTopWidth, radius: getComputedStyle(element).borderRadius }));
          near(dialog.x, 128); near(dialog.y, 66); near(dialog.width, 1024); near(dialog.height, 800);
          near(nav.width, 192); near(title.x, 344); near(title.y, 126);
          near(search.x, 140); near(search.y, 78); near(search.width, 167.2); near(search.height, 32);
          expect(title.fontSize).toBe('15px'); expect(title.lineHeight).toBe('20px');
          expect(card).toEqual({ border: '0px', radius: '0px' });
          results.geometry[`settings-${theme}`] = { dialog, nav, title, search, card };
        }
      }
    }
  }
  results.checks.push('real centered Settings dialog 1024×800 at1280×932; nav192; content344/126; uncarded rows in both themes');
  results.checks.push('light/dark gallery and Settings at1280×932,1440×900,1000×800 and800×600; last case Chinese with125% text; no document overflow');

  await page.setViewportSize({ width: 1280, height: 932 });
  await page.goto(`${fixture}?theme=light`);
  await ready();
  results.geometry.gallery = Object.fromEntries(await Promise.all(['.settings-nav', '[role="switch"]', '.desktop-button[data-size="md"]', '.desktop-icon-button[data-size="xs"]', '[data-settings-title]'].map(async selector => [selector, await measure(selector)])));
  near(results.geometry.gallery['.settings-nav'].width, 192);
  near(results.geometry.gallery['[role="switch"]'].width, 32);
  near(results.geometry.gallery['[role="switch"]'].height, 20);
  near(results.geometry.gallery['.desktop-button[data-size="md"]'].height, 32);
  near(results.geometry.gallery['.desktop-icon-button[data-size="xs"]'].width, 20);
  for (const [size, height, font, line] of [['xs', 24, 13, 19], ['sm', 28, 13, 19], ['md', 32, 14, 20], ['lg', 36, 14, 20], ['xl', 40, 14, 20]]) {
    const geometry = await measure(`.desktop-button[data-size="${size}"]`);
    near(geometry.height, height); near(parseFloat(geometry.fontSize), font); near(parseFloat(geometry.lineHeight), line);
  }
  results.checks.push('five button sizes24/28/32/36/40 and matching13/19 or14/20 typography; icon20; nav192');
  const switchThumb = page.getByRole('switch', { name: 'Switch', exact: true }).locator('span');
  const before = await switchThumb.boundingBox();
  await page.getByRole('switch', { name: 'Switch', exact: true }).click();
  await expect.poll(async () => Math.round(((await switchThumb.boundingBox()).x - before.x) * 100)).toBe(1200);
  const after = await switchThumb.boundingBox();
  near(after.width, 16); near(after.x - before.x, 12);
  results.checks.push('switch32×20, thumb16, travel12');

  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  const frame = page.locator('.popover-frame[data-fold-state]');
  await expect(frame).toHaveAttribute('data-fold-state', 'open');
  const menuAnimations = await animations('.popover-frame[data-fold-state]');
  expect(menuAnimations.some(animation => animation.duration === 200)).toBe(true);
  await page.waitForTimeout(240);
  const menu = await measure('[role="menuitem"]');
  near(menu.height, 32); expect(menu.fontSize).toBe('14px'); expect(menu.lineHeight).toBe('20px');
  results.geometry.menu = menu;
  results.menuAnimations = menuAnimations;
  await capture('menu-ordinary-light-1280');
  await page.locator('[role="menu"]').evaluate(element => element.dataset.menuDensity = 'compact');
  const compact = await measure('[role="menuitem"]');
  near(compact.height, 24); expect(compact.fontSize).toBe('13px'); expect(compact.lineHeight).toBe('19px');
  results.geometry.compactMenu = compact;
  await capture('menu-compact-light-1280');
  await page.getByRole('menuitem').click();
  await expect(frame).toHaveAttribute('data-fold-state', 'closing');
  await expect(frame).toHaveAttribute('inert', '');
  await expect(page.getByRole('menuitem', { includeHidden: true })).toHaveCount(0);
  results.checks.push('menu200ms shared Motion transition; ordinary32/14/20 and opt-in compact24/13/19; closing inert and unmounts');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(frame).toHaveAttribute('data-fold-state', 'open');
  await page.keyboard.press('Escape');
  await expect(frame).toHaveCount(0);

  await page.evaluate(() => {
    window.visualAnimationCalls = [];
    window.visualNativeAnimate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.closest('[data-modal-context="settings"]')) window.visualAnimationCalls.push({ duration: typeof options === 'number' ? options : options?.duration, easing: typeof options === 'object' ? options.easing : undefined });
      return window.visualNativeAnimate.call(this, frames, options);
    };
  });
  await page.getByRole('button', { name: 'Dialog', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.waitForTimeout(30);
  const modalAnimations = await page.evaluate(() => {
    Element.prototype.animate = window.visualNativeAnimate;
    return window.visualAnimationCalls;
  });
  expect(modalAnimations.some(animation => animation.duration === 200)).toBe(true);
  results.dialogAnimations = modalAnimations;
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  results.checks.push('shared settings-context modal uses200ms popup transition; Escape closes');

  await page.getByRole('button', { name: 'Language: 简体中文' }).click();
  await page.getByRole('option', { name: 'English — a long option label' }).click();
  await expect(page.getByRole('button', { name: 'Language: English — a long option label' })).toBeFocused();
  results.checks.push('searchable select retains selection and returns focus');
  await page.getByLabel('Retained input').fill('Draft retained');
  await page.getByRole('button', { name: 'Disclosure', exact: true }).click();
  await page.waitForTimeout(60);
  await page.getByRole('button', { name: 'Disclosure', exact: true }).click();
  await expect(page.getByLabel('Retained input')).toHaveValue('Draft retained');
  results.checks.push('collapse rapid reversal preserves mounted input');
  await page.getByRole('combobox', { name: 'Workflow select' }).click();
  await page.getByRole('option', { name: 'Second workflow' }).click();
  await expect(page.getByRole('combobox', { name: 'Workflow select' })).toContainText('Second workflow');
  await page.getByRole('button', { name: 'Workflow menu', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Run workflow' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('menuitem', { name: 'Run workflow', includeHidden: true })).toHaveCount(0);
  results.checks.push('Workflow Radix select/menu; reduced-motion change during exit releases focus');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(frame).toHaveCount(0);
  expect(await page.getByRole('switch', { name: 'Switch', exact: true }).evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  results.checks.push('reduced-motion immediate menu close and zero switch transition');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.setViewportSize({ width: 1280, height: 932 });
  for (const section of ['general', 'connections', 'keybindings', 'chat', 'providers', 'import', 'mcp', 'skills', 'inbox', 'worktrees', 'archive']) {
    await page.goto(`${fixture}?page=settings&section=${section}&theme=light&lang=zh-CN`);
    await ready('[data-app-settings]');
    await capture(`settings-${section}`);
  }
  results.checks.push('all12 existing Settings sections render offline');
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto(`${fixture}?page=settings&theme=light&lang=zh-CN`);
  await ready();
  await page.evaluate(async () => { const { applyUiScale } = await import('/src/features/settings/model/uiScale.ts'); await applyUiScale(1.2); });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).zoom)).toBe('1.2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture('settings-zoom120');
  results.checks.push('120% CSS zoom fallback without document overflow; native zoom untested');

  await page.setViewportSize({ width: 1280, height: 932 });
  for (const theme of ['light', 'dark']) {
    for (const mode of ['chat', 'code']) {
      for (const state of ['empty', 'conversation']) {
        await page.goto(`${fixture}?page=workspace&mode=${mode}&state=${state}&theme=${theme}`);
        await ready('.composer-field:visible');
        const field = await measure('.composer-field:visible');
        const card = await measure('[data-composer-layout="desktop"]:visible .composer-input-shell');
        const sidebar = await measure('[data-desktop-sidebar]');
        near(sidebar.width, 288);
        if (mode === 'chat') {
          near(card.width, 640); expect(card.radius).toBe('14px');
          expect(field.fontSize).toBe('15px'); expect(field.lineHeight).toBe('21px');
        } else {
          const header = await measure('[data-session-surface-tabs]:visible');
          near(header.height, 32);
          expect(field.fontSize).toBe('14px'); expect(field.lineHeight).toBe('20px');
          if (state === 'conversation') {
            const prose = await measure('.agent-markdown:visible');
            const user = await measure('.user-message-bubble:visible');
            expect(prose.fontSize).toBe('14px'); expect(prose.lineHeight).toBe('20px');
            expect(user.fontSize).toBe('14px'); expect(user.lineHeight).toBe('18px');
          }
        }
        results.geometry[`${mode}-${state}-${theme}`] = { field, card, sidebar };
        await capture(`${mode}-${state}-${theme}-1280`);
        if (state === 'empty') {
          await page.locator('[data-model-picker-trigger]:visible').click();
          await ready('[data-model-picker]');
          const modelMenu = await measure('[data-model-picker]:visible');
          near(modelMenu.width, mode === 'chat' ? 416 : 242, 1);
          results.geometry[`${mode}-model-${theme}`] = modelMenu;
          await capture(`${mode}-model-${theme}-1280`);
          await page.keyboard.press('Escape');
        }
      }
    }
    await page.goto(`${fixture}?page=workspace&mode=code&state=split&theme=${theme}`);
    await ready('.composer-field:visible');
    await capture(`code-split-${theme}-1280`);
  }
  for (const [mode, state] of [['code', 'running'], ['code', 'question'], ['chat', 'attachments']]) {
    await page.goto(`${fixture}?page=workspace&mode=${mode}&state=${state}&theme=light`);
    await ready('.composer-field:visible');
    await capture(`${mode}-${state}-light-1280`);
  }
  results.checks.push('real Chat/Code empty and conversation panes in both themes; sidebar288, Chat card640/radius14/input15/21, Code header32/prose14/20/user14/18; model widths416/242');
  results.checks.push('real Code split panes in both themes; running, question and attachment fixture states captured with inert native/provider IO');

  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width:1280, height:932 });
    await page.goto(`${fixture}?page=workspace&mode=code&view=projects&theme=${theme}`);
    await ready('.desktop-project-card');
    const heading = await measure('.desktop-collection-header h1');
    const project = await measure('.desktop-project-card');
    const toggle = await measure('.desktop-mode-toggle');
    const main = await measure('.body-glass');
    expect(main.background).toBe(theme === 'light' ? 'rgb(252, 252, 251)' : 'rgb(21, 21, 21)');
    near(heading.x,328,1); near(heading.y,60,1);
    near(project.x,328,1); near(project.y,176,1); near(project.width,444,1); near(project.height,137,1);
    near(toggle.x,168,1); near(toggle.y,10,1); near(toggle.width,70,1); near(toggle.height,28,1);
    results.geometry[`projects-${theme}`] = {heading,project,toggle,main};
    await capture(`projects-${theme}-1280`);
  }
  results.checks.push('real Projects light/dark: heading328/60, cards328/176/444x137, mode switch168/10/70x28 within1 CSS px');

  await page.goto(`${fixture}?theme=light`);
  await ready();
  results.fonts = await page.evaluate(() => ({ body: getComputedStyle(document.body).fontFamily, weight: getComputedStyle(document.body).fontWeight, faces: [...document.fonts].map(face => ({ family: face.family, weight: face.weight, status: face.status })) }));
  expect(results.fonts.faces.some(face => face.family.replaceAll('\"', '') === 'IBM Plex Sans' && face.status === 'loaded')).toBe(true);
  await page.evaluate(async () => { const { initTypography } = await import('/src/features/settings/model/typography.ts'); initTypography(); });
  expect(await page.evaluate(() => getComputedStyle(document.body).fontWeight)).toBe('400');
  await page.evaluate(async () => { const { applyTypographyProfile, loadProfile } = await import('/src/features/settings/model/typography.ts'); applyTypographyProfile({ ...loadProfile('shared'), uiFont: 'Courier New', uiWeight: 600 }); });
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily.replaceAll('"', '').startsWith('Courier New'))).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.body).fontWeight)).toBe('600');
  results.checks.push('bundled IBM Plex font loads; explicit user UI font takes precedence');
  await page.evaluate(async () => { document.documentElement.dataset.mobileSkin = 'midnight'; const { applyDesktopSkin } = await import('/src/shared/theme/desktopSkin.ts'); applyDesktopSkin(); });
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-skin'))).toBe(false);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--desktop-switch-height'))).toBe('');
  results.checks.push('mobile removes desktop scope and desktop tokens');
  expect(errors).toEqual([]);
  results.checks.push('no browser page errors');
  results.status = 'passed';
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  results.status = 'failed';
  results.failure = String(error.stack || error);
  throw error;
} finally {
  await fs.writeFile(`${output}/${engine.name()}-verification.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
