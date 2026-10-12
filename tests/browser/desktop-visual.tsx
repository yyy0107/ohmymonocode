import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../src/features/workflows/kit/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../../src/features/workflows/kit/components/ui/dropdown-menu";
// Offline real-component fixture. No live account, Host, provider or native RPC.
import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { SettingsView } from "../../src/features/settings/ui/SettingsView";
import { Button, IconButton } from "../../src/shared/ui/omb/Button";
import { Switch } from "../../src/features/workflows/kit/components/ui/switch";
import { Input } from "../../src/features/workflows/kit/components/ui/input";
import { Popover } from "../../src/shared/ui/Popover";
import { Modal } from "../../src/shared/ui/Modal";
import { SearchableSelect } from "../../src/shared/ui/SearchableSelect";
import { SurfaceAppearance } from "../../src/shared/ui/SurfaceAppearance";
import { AnimatedCollapse } from "../../src/shared/ui/AnimatedCollapse";
import { SettingsNav } from "../../src/app/shell/SettingsRail";
import { setUiLanguage } from "../../src/shared/i18n/language";
import { applyDesktopSkin } from "../../src/shared/theme/desktopSkin";
import { Plus } from "../../src/shared/ui/icons";
import "../../src/styles/index.css";

const query = new URLSearchParams(location.search);
setUiLanguage(query.get("lang") === "zh-CN" ? "zh-CN" : "en");
document.documentElement.classList.toggle("theme-light", query.get("theme") !== "dark");
localStorage.setItem("monocode.desktopColorScheme", query.get("theme") === "dark" ? "dark" : "light");
applyDesktopSkin();
if (query.has("large")) document.documentElement.style.setProperty("--font-scale", "1.25");
// Tauri callers that query settings receive deterministic offline responses.
Object.assign(window, { __TAURI_INTERNALS__: {
  invoke: async (command: string) => {
    if (command === "system_fonts") return { sans: [], mono: [] };
    if (/list|recents|accounts|sessions|notifications/.test(command)) return [];
    if (/version/.test(command)) return "0.0.0-fixture";
    if (/available|enabled|running/.test(command)) return false;
    throw new Error(`Offline fixture: ${command}`);
  },
  transformCallback: () => 0,
  unregisterCallback: () => {},
  convertFileSrc: (path: string) => path,
} });
const noop = () => {};
function Gallery() {
 const [checked, setChecked] = useState(false);
 const [menu, setMenu] = useState(false);
 const [modal, setModal] = useState(false);
 const [expanded, setExpanded] = useState(true);
 const [choice, setChoice] = useState("one");
 const anchor = useRef<HTMLButtonElement>(null);
 return <SurfaceAppearance.Provider value="settings"><div style={{ display: "flex", height: "100vh" }}>
  <SettingsNav section="appearance" onSelect={noop} />
  <main style={{ flex: 1, minWidth: 0, overflow: "auto", padding: 32 }}>
   <h1 data-settings-title>桌面组件 / Desktop controls</h1>
   <p className="desktop-pane-description">Static source specifications · 长文本与字号检查</p>
   <section className="settings-card" style={{ marginTop: 24, borderStyle: "solid", borderColor: "var(--color-stroke)" }}>
    <div className="settings-row flex flex-wrap items-center"><span className="settings-row-label">Capsule</span>{(["xs", "sm", "md", "lg", "xl"] as const).map(size => <Button key={size} size={size}>{size}</Button>)}<Button disabled>Disabled</Button></div>
    <div className="settings-row flex items-center"><span className="settings-row-label">Icons</span>{(["xs", "sm", "md", "lg"] as const).map(size => <IconButton key={size} size={size} label={`Icon ${size}`}><Plus /></IconButton>)}</div>
    <div className="settings-row flex items-center"><label>开关 Switch</label><Switch aria-label="Switch" checked={checked} onCheckedChange={setChecked} /><Switch aria-label="Disabled switch" disabled /></div>
    <div className="settings-row flex flex-wrap items-center"><Input aria-label="Long text" defaultValue="长文本 / long text sample" /><Input aria-label="Invalid field" aria-invalid defaultValue="Invalid" /></div>
    <div className="settings-row flex items-center"><SearchableSelect label="Language" value={choice} options={[{value:"one",label:"简体中文"},{value:"two",label:"English — a long option label"}]} onChange={setChoice} /></div>
    <div className="settings-row flex items-center"><Button ref={anchor} onClick={() => setMenu(v => !v)}>Menu</Button><Button onClick={() => setModal(true)}>Dialog</Button><Button onClick={() => setExpanded(v => !v)}>Disclosure</Button></div>
    <div className="settings-row flex items-center">
    <Select value={choice} onValueChange={setChoice}><SelectTrigger aria-label="Workflow select"><SelectValue /></SelectTrigger><SelectContent position="popper"><SelectItem value="one">First workflow</SelectItem><SelectItem value="two">Second workflow</SelectItem></SelectContent></Select>
    <DropdownMenu><DropdownMenuTrigger asChild><Button>Workflow menu</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem>Run workflow</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
   </div>
   <AnimatedCollapse expanded={expanded} keepMounted><div style={{ padding: 16 }}>Retained content 保持挂载 <input aria-label="Retained input" defaultValue="Preserved" /></div></AnimatedCollapse>
   </section>
   <Popover open={menu} anchor={anchor} role="menu" onDismiss={() => setMenu(false)}><button role="menuitem" onClick={() => setMenu(false)}>Menu item</button></Popover>
   {modal && <Modal title="设置确认 / Confirmation" onClose={() => setModal(false)}><div className="settings-row">No source-defined dialog transition.</div></Modal>}
  </main>
 </div></SurfaceAppearance.Provider>;
}
createRoot(document.getElementById("root")!).render(query.get("page") === "settings"
 ? <div style={{ display: "flex", height: "100vh" }}><SettingsView section={(query.get("section") ?? "appearance") as never} cwd="" sessions={[]} onClose={noop} onOpenSession={noop} onArchiveSession={noop} onDeleteSession={noop} onOpenWhatsNew={noop} /></div>
 : <Gallery />);
