// Rebuild the desktop source inventory after UI edits. No runtime claim is inferred.
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(path.join(p,d.name)):[path.join(p,d.name)]);
const files=walk('src').filter(p=>p.endsWith('.tsx')&&!p.startsWith('src/mobile/')&&!p.includes('.test.')).sort();
const rows=[];
function hasJsx(node) { return ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node) || Boolean(ts.forEachChild(node, child => hasJsx(child) || undefined)); }
const groups={
 settings:['SC0001–SC0347; M01–M15','Settings navigation, rows, fields, cards, menu motion; workspace geometry retained'],
 bots:['S001–S081; SC common controls','Existing Bots REA mapping; shared radii, controls, typography; 54px list measurement retained'],
 sessions:['S020–S041; S061–S067; M07/M09','Composer and transcript controls; code/tool content width and virtualization retained'],
 workflows:['S026–S046; S061–S067; SC common controls','Shared kit controls, settings rows, owned headings/cards; graph geometry and business motion retained'],
 'source-control':['S026–S046; S061–S067','Owned chrome, dialogs, fields; diff and graph geometry retained'],
 files:['S026–S041; S061–S067','Owned toolbar and fields; editor content and tree row measurements retained'],
 terminal:['S026–S036; S061–S067','Owned dock chrome; xterm sizing, retained PTY and resizing unchanged'],
};
const resolve=(from,spec)=>{
 if(!spec.startsWith('.'))return null;
 const base=path.resolve(path.dirname(from),spec).replace(/\.js$/,'');
 for(const suffix of ['', '.tsx','.ts','/index.tsx','/index.ts']){const rel=path.relative('.',base+suffix);if(fs.existsSync(rel))return rel;}
 return null;
};
for(const file of files){
 const source=fs.readFileSync(file,'utf8'), ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const imports=[],components=[],hooks=new Set();let jsx=0;
 const visit=n=>{
  if(ts.isImportDeclaration(n)&&ts.isStringLiteral(n.moduleSpecifier)){const target=resolve(file,n.moduleSpecifier.text);if(target)imports.push(target);}
  if((ts.isFunctionDeclaration(n)||ts.isVariableDeclaration(n)||ts.isClassDeclaration(n))&&n.name&&/^[A-Z]/.test(n.name.getText(ast))){
   const body=ts.isFunctionDeclaration(n)?n.body:ts.isVariableDeclaration(n)?n.initializer:n;
   if(body&&hasJsx(body))components.push(n.name.getText(ast));
  }
  if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n))jsx++;
  if(ts.isJsxAttribute(n)&&n.name.getText(ast)==='className'&&n.initializer){for(const m of n.initializer.getText(ast).matchAll(/\b(?:desktop-[\w-]+|settings-row[\w-]*|ui-button[\w-]*)/g))hooks.add(m[0]);}
  ts.forEachChild(n,visit);
 };visit(ast);
 const group=file.startsWith('src/features/')?file.split('/')[2]:file.startsWith('src/app/')?'shell':file.startsWith('src/shared/')?'shared':'entry';
 const [evidence,target]=groups[group]??['S026–S046; S061–S067; SC common controls','Shared semantic palette, controls and owned chrome; unmatched domain geometry and business states retained'];
 rows.push({id:file.replace(/^src\//,'').replace(/\.tsx$/,''),file,components:[...new Set(components)],group,jsxElements:jsx,hooks:[...hooks].sort(),imports,styleSources:[...(jsx?['src/styles/desktop-tokens.css','src/styles/desktop-controls.css','src/styles/desktop-workspaces.css','src/styles/omb-skin.css','src/styles/omb-metrics.css']:[]),...imports.filter(p=>p.endsWith('.css'))],evidence:jsx?evidence:'not visual',mapping:jsx?'MonoCode adaptation (direct source families listed in specification)':'nonvisual provider/context',target:jsx?target:'No visual change',geometry:'Preserve unless explicitly mapped in docs/desktop-visual-spec.md',themes:'light: source + documented contrast adaptation; dark: Midnight adaptation',motion:'Mapped shared menu/switch feedback; retain unmatched motion; shared bidirectional collapse',runtime:'Not individually runtime-tested; see delivery matrix',sha256:crypto.createHash('sha256').update(source).digest('hex')});
}
// Record direct/transitive use of the migrated component implementations.
const migrated=new Set(rows.filter(r=>r.hooks.length||/shared\/ui\/(Popover|Modal|SearchableSelect)|kit\/components\/ui\//.test(r.file)).map(r=>r.file));
let added=true;while(added){added=false;for(const r of rows)if(!migrated.has(r.file)&&r.imports.some(i=>migrated.has(i))){migrated.add(r.file);added=true;}}
for(const row of rows)row.integration=!row.jsxElements?'nonvisual':row.hooks.length?'explicit component hooks':migrated.has(row.file)?'shared component adapter':'semantic palette; local geometry retained';
const json=JSON.stringify({version:1,evidence:'Grok Bot 0.30.0 static installation audit, 2026-10-12',sourceFiles:rows.length,componentDeclarations:rows.reduce((n,r)=>n+r.components.length,0),rows},null,2)+'\n';
const fields=['id','file','components','group','integration','evidence','mapping','target','geometry','themes','motion','runtime','hooks','styleSources'];
const quote=v=>'"'+String(Array.isArray(v)?v.join(' | '):v).replaceAll('"','""')+'"';
const csv=[fields.join(','),...rows.map(r=>fields.map(k=>quote(r[k])).join(','))].join('\n')+'\n';
const outputs={'docs/desktop-visual-inventory.json':json,'docs/desktop-visual-inventory.csv':csv};
if(process.argv.includes('--check')){
 for(const [file,value] of Object.entries(outputs))if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==value)throw new Error(`Outdated inventory: ${file}`);
}else for(const [file,value] of Object.entries(outputs))fs.writeFileSync(file,value);
console.log(`${rows.length} source files, ${rows.reduce((n,r)=>n+r.components.length,0)} component declarations; no runtime coverage inferred.`);
