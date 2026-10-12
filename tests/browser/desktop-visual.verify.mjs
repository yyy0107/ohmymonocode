// Run against the local Vite fixture server. No build or publication.
import { chromium, webkit, expect } from '@playwright/test';
import fs from 'node:fs/promises';
const engine=process.env.VISUAL_BROWSER==='webkit'?webkit:chromium;
const output='build/desktop-visual';await fs.mkdir(output,{recursive:true});
const browser=await engine.launch(engine===chromium?{executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']}:{headless:true});
const context=await browser.newContext({deviceScaleFactor:1,timezoneId:'UTC'});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const results={browser:engine.name(),version:browser.version(),dpr:1,screenshots:[],checks:[],errors};
const base=process.env.VISUAL_BASE_URL||'http://127.0.0.1:1436';
try {
 for(const theme of ['light','dark'])for(const [width,height,lang,large] of [[1440,900,'en',false],[1000,800,'zh-CN',false],[800,600,'zh-CN',true]])for(const view of ['gallery','settings']){
  await page.setViewportSize({width,height});
  await page.goto(`${base}/tests/browser/desktop-visual.html?page=${view}&theme=${theme}&lang=${lang}${large?'&large':''}`);
  await page.locator('[data-settings-title]').waitFor();await page.waitForTimeout(150);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const file=`${engine.name()}-${view}-${theme}-${width}${large?'-large':''}.png`;
  await page.screenshot({path:`${output}/${file}`});results.screenshots.push(file);
 }
 await page.goto(`${base}/tests/browser/desktop-visual.html?theme=light`);
 await page.getByRole('switch',{name:'Switch',exact:true}).waitFor();
 results.geometry=await page.evaluate(()=>Object.fromEntries(['.settings-nav','[role="switch"]','.desktop-button[data-size="md"]','.desktop-icon-button[data-size="xs"]','[data-settings-title]'].map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return [s,{width:r.width,height:r.height,fontSize:c.fontSize,lineHeight:c.lineHeight,transition:c.transitionDuration}]})));
 expect(results.geometry['.settings-nav'].width).toBe(198);
 expect(results.geometry['[role="switch"]'].width).toBe(32);expect(results.geometry['[role="switch"]'].height).toBe(20);
 expect(results.geometry['.desktop-button[data-size="md"]'].height).toBe(30);
 expect(results.geometry['.desktop-icon-button[data-size="xs"]'].width).toBe(20);
 for(const [size,height,font,line] of [['xs',22,12,16],['sm',26,12,16],['md',30,13,18],['lg',34,13,18],['xl',38,14,22]]) {
  const geometry=await page.locator(`.desktop-button[data-size="${size}"]`).first().evaluate(e=>({height:e.getBoundingClientRect().height,font:parseFloat(getComputedStyle(e).fontSize),line:parseFloat(getComputedStyle(e).lineHeight)}));
  expect(geometry.height).toBe(height);expect(geometry.font).toBe(font);expect(geometry.line).toBeCloseTo(line,2);
 }
 results.checks.push('five capsule heights and corresponding font/line-height variants');
 await page.getByRole('switch',{name:'Switch',exact:true}).click();await page.waitForTimeout(160);
 const knob=await page.locator('[role="switch"]').first().locator('span').evaluate(e=>({width:e.getBoundingClientRect().width,translate:getComputedStyle(e).translate}));
 expect(knob.width).toBe(16);expect(knob.translate).toBe('12px');results.checks.push('switch 32×20 / thumb16 / travel12; capsule30; icon20; nav198');
 await page.getByRole('button',{name:'Menu',exact:true}).click();
 const frame=page.locator('.popover-motion');await expect(frame).toHaveAttribute('data-fold-state','open');
 expect(await frame.evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0.1s');
 await page.getByRole('menuitem').click();
 await expect(page.getByRole('menuitem',{includeHidden:true})).toHaveCount(0);results.checks.push('menu 100ms enter/exit and unmount');
 await page.getByRole('button',{name:'Menu',exact:true}).click();await expect(frame).toHaveAttribute('data-fold-state','open');
 await page.keyboard.press('Escape');await expect(frame).toHaveCount(0);
 await page.getByRole('button',{name:'Dialog',exact:true}).click();
 expect(await page.locator('.modal-panel').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);results.checks.push('settings dialog no animation; Escape closes');
 await page.getByRole('button',{name:'Language: 简体中文'}).click();
 await page.getByRole('option',{name:'English — a long option label'}).click();
 await expect(page.getByRole('button',{name:'Language: English — a long option label'})).toBeFocused();results.checks.push('searchable select selection and focus return');
 await page.getByLabel('Retained input').fill('Draft retained');
 await page.getByRole('button',{name:'Disclosure',exact:true}).click();
 await page.waitForTimeout(60);await page.getByRole('button',{name:'Disclosure',exact:true}).click();
 await expect(page.getByLabel('Retained input')).toHaveValue('Draft retained');results.checks.push('collapse reversal preserves mounted input');
 await page.getByRole('combobox',{name:'Workflow select'}).click();
 await page.getByRole('option',{name:'Second workflow'}).click();
 await expect(page.getByRole('combobox',{name:'Workflow select'})).toContainText('Second workflow');
 await page.getByRole('button',{name:'Workflow menu',exact:true}).click();
 await expect(page.getByRole('menuitem',{name:'Run workflow'})).toBeVisible();
 await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.getByRole('menuitem',{name:'Run workflow',includeHidden:true})).toHaveCount(0);
 results.checks.push('Workflow Radix select/menu; reduced-motion change during exit releases modal focus');
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.keyboard.press('Escape');await expect(frame).toHaveCount(0);
 expect(await page.getByRole('switch',{name:'Switch',exact:true}).evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0s');results.checks.push('reduced motion immediate menu close and zero switch transition');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:1440,height:900});
 for(const section of ['general','connections','keybindings','chat','providers','import','mcp','skills','inbox','worktrees','archive']){
  await page.goto(`${base}/tests/browser/desktop-visual.html?page=settings&section=${section}&theme=light&lang=zh-CN`);
  await page.locator('[data-app-settings]').waitFor();await page.waitForTimeout(200);
  const file=`${engine.name()}-settings-${section}.png`;await page.screenshot({path:`${output}/${file}`});results.screenshots.push(file);
 }
 await page.setViewportSize({width:1000,height:800});
 await page.goto(`${base}/tests/browser/desktop-visual.html?page=settings&theme=light&lang=zh-CN`);
 await page.locator('[data-settings-title]').waitFor();
 await page.evaluate(async()=>{const {applyUiScale}=await import('/src/features/settings/model/uiScale.ts');await applyUiScale(1.2);});
 expect(await page.evaluate(()=>getComputedStyle(document.documentElement).zoom)).toBe('1.2');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const zoomFile=`${engine.name()}-settings-zoom120.png`;await page.screenshot({path:`${output}/${zoomFile}`});results.screenshots.push(zoomFile);
 results.checks.push('120% CSS zoom fallback; no horizontal document overflow; native zoom untested');
 await page.goto(`${base}/tests/browser/desktop-visual.html?theme=light`);
 await page.getByRole('switch',{name:'Switch',exact:true}).waitFor();
 await page.evaluate(async()=>{document.documentElement.dataset.mobileSkin='midnight';const {applyDesktopSkin}=await import('/src/shared/theme/desktopSkin.ts');applyDesktopSkin();});
 expect(await page.evaluate(()=>document.documentElement.hasAttribute('data-skin'))).toBe(false);
 expect(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--desktop-switch-height'))).toBe('');
 results.checks.push('mobile clears desktop scope and desktop tokens');
 expect(errors).toEqual([]);
 results.checks.push('all settings sections rendered offline; no page errors');
 console.log(JSON.stringify(results,null,2));
} finally {await fs.writeFile(`${output}/${engine.name()}-verification.json`,JSON.stringify(results,null,2));await browser.close();}
