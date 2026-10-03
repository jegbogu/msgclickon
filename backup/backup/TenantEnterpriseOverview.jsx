// src/pages/tenant/TenantEnterpriseOverview.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import {
  ArrowRight, RefreshCw, Zap, TriangleAlert,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, MoreHorizontal,
  AlertCircle, ShieldAlert, Flame, Clock, Server,
  Gauge, Smartphone, Monitor, Wifi, WifiOff, MapPin,
  AlertTriangle, TrendingUp, TrendingDown, Cpu,
  Sparkles, X, Calendar, Check, RotateCcw, Activity,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
  CartesianGrid, BarChart, Bar, Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useTimeRange } from "../../context/TimeRangeContext";
import AskEdgeDashboardModal from "../../components/ai/AskEdgeDashboardModal.jsx";

// ── Formatters ─────────────────────────────────────────────────────────────────
const fmt = {
  int: (n) => n === null || n === undefined || Number.isNaN(Number(n)) ? "—" : Number(n).toLocaleString(),
  num: (n, d = 1) => n === null || n === undefined || Number.isNaN(Number(n)) ? "—" : Number(n).toFixed(d),
  pct: (n, d = 1) => n === null || n === undefined || Number.isNaN(Number(n)) ? "—" : `${Number(n).toFixed(d)}%`,
  ms:  (n) => n === null || n === undefined || Number.isNaN(Number(n)) ? "—" : `${Number(n).toFixed(0)} ms`,
};

function cx(...xs) { return xs.filter(Boolean).join(" "); }

// ── Stable-reference memo ────────────────────────────────────────────────────
// Keeps the same array/object reference across renders as long as its content
// hasn't actually changed (compared by value, not identity). This stops
// Recharts from treating "same data, new array instance" as a real update,
// which is what causes sparklines/bars to visibly redraw on every poll even
// when nothing changed.
function useDeepMemo(value) {
  const ref = useRef(value);
  const sigRef = useRef();
  let sig;
  try { sig = JSON.stringify(value); } catch { sig = null; }
  if (sig !== sigRef.current) {
    sigRef.current = sig;
    ref.current = value;
  }
  return ref.current;
}

// Fixed reference so the "not enough data yet" placeholder never itself
// counts as a data change.
const EMPTY_SPARK_FALLBACK = [{ name: "a", value: 0, ts: null }, { name: "b", value: 0, ts: null }];

const getErrorColor  = (e) => e >= 10 ? "text-red-500" : e >= 1 ? "text-amber-500" : "text-emerald-500";
const getErrorBg     = (e) => e >= 10 ? "bg-red-500/10" : e >= 1 ? "bg-amber-500/10" : "bg-emerald-500/10";
const getP95Color    = (p) => p >= 500 ? "text-red-500" : p >= 200 ? "text-amber-500" : p >= 100 ? "text-blue-500" : "text-emerald-500";

function relTime(val) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val).slice(0, 16);
    const sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 0)   return "just now";
    if (sec < 60)  return `${sec}s ago`;
    const m = Math.floor(sec / 60);
    if (m  < 60)   return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h  < 24)   return `${h}h ago`;
    const dy = Math.floor(h / 24);
    if (dy < 30)   return `${dy}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch { return "—"; }
}
const getHealthColor = (h) => h >= 90 ? "bg-emerald-500" : h >= 70 ? "bg-amber-500" : "bg-red-500";
const getStatusDot   = (s) => s === "critical" ? "bg-red-500" : s === "warning" ? "bg-amber-500" : "bg-emerald-500";

// ── TinySparkline ──────────────────────────────────────────────────────────────
function TinySparkline({ series = [], width = 170, height = 42, stroke = "rgba(96,165,250,0.95)", strokeWidth = 2, tooltipFormatter, timeRange, timeFormatter }) {
  const id = React.useId();
  const [hoverIdx, setHoverIdx] = useState(null);
  const fmtVal = typeof tooltipFormatter === "function" ? tooltipFormatter : (v) => (v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toFixed(2));
  const toMs = (v) => { if (v == null) return null; if (typeof v === "number") return v > 1e12 ? v : v * 1000; const ms = new Date(v).getTime(); return Number.isNaN(ms) ? null : ms; };
  const fmtTime = typeof timeFormatter === "function" ? timeFormatter : (ms) => { try { return new Date(ms).toLocaleString(); } catch { return "—"; } };
  const rangeFrom = toMs(timeRange?.from ?? timeRange?.from_ts ?? timeRange?.start ?? null);
  const rangeTo   = toMs(timeRange?.to   ?? timeRange?.to_ts   ?? timeRange?.end   ?? null);
  const pointTimeMs = (rawTs, idx, len) => { const d = toMs(rawTs); if (d != null) return d; if (rangeFrom != null && rangeTo != null && len > 1) return rangeFrom + (idx / (len - 1)) * (rangeTo - rangeFrom); return null; };
  const pts = useMemo(() => {
    const clean = (Array.isArray(series) ? series : []).map((p, i) => ({ x: i, y: p?.value == null || Number.isNaN(Number(p.value)) ? null : Number(p.value), raw: p })).filter((p) => p.y != null);
    if (clean.length === 1) clean.push({ x: clean[0].x + 1, y: clean[0].y, raw: { ...clean[0].raw, __synthetic: true } });
    if (clean.length < 2) return null;
    const min = Math.min(...clean.map((p) => p.y)), max = Math.max(...clean.map((p) => p.y));
    const sy = (y) => max === min ? height / 2 : height - 2 - ((y - min) / (max - min)) * (height - 4);
    const sx = (x) => clean.length <= 1 ? 0 : (x / (clean.length - 1)) * (width - 2) + 1;
    const scaled = clean.map((p) => ({ sx: +sx(p.x).toFixed(2), sy: +sy(p.y).toFixed(2), y: p.y, raw: p.raw }));
    const d = scaled.map((p, i) => `${i === 0 ? "M" : "L"} ${p.sx} ${p.sy}`).join(" ");
    return { d, area: `${d} L ${width - 1} ${height - 1} L 1 ${height - 1} Z`, scaled };
  }, [series, width, height]);
  const onMove = useCallback((e) => {
    if (!pts?.scaled?.length) return;
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    let best = 0, bestDist = Infinity;
    pts.scaled.forEach((p, i) => { const dist = Math.abs(p.sx - x); if (dist < bestDist) { bestDist = dist; best = i; } });
    setHoverIdx(best);
  }, [pts]);
  const onLeave = useCallback(() => setHoverIdx(null), []);
  if (!pts) return <div className="h-[42px] w-full rounded-xl bg-slate-200 dark:bg-[#252A38]/50" />;
  const hp = hoverIdx != null ? pts.scaled[hoverIdx] : null;
  return (
    <div className="relative">
      <svg width={width} height={height} className="block" onMouseMove={onMove} onMouseLeave={onLeave}>
        <defs><linearGradient id={`${id}-g`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={stroke} stopOpacity="0.28" /><stop offset="100%" stopColor={stroke} stopOpacity="0" /></linearGradient></defs>
        <path d={pts.area} fill={`url(#${id}-g)`} />
        <path d={pts.d} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        {pts.scaled.map((p, i) => <circle key={i} cx={p.sx} cy={p.sy} r="7" fill="transparent" style={{ pointerEvents: "all" }} />)}
        {hp && (<><line x1={hp.sx} y1="2" x2={hp.sx} y2={height - 2} stroke="rgba(0,0,0,0.10)" /><circle cx={hp.sx} cy={hp.sy} r="3.2" fill={stroke} /></>)}
      </svg>
      {hp && (() => {
        const tms = pointTimeMs(hp.raw?.ts ?? hp.raw?.timestamp ?? hp.raw?.time ?? null, hoverIdx, pts.scaled.length);
        return <div className="pointer-events-none absolute -top-10 rounded-md border border-slate-200 dark:border-[#252A38] bg-white/90 dark:bg-black/75 px-2 py-1 text-[10px] text-slate-800 dark:text-[#E2E8F4] shadow" style={{ left: Math.max(0, Math.min(width - 160, hp.sx - 80)), width: 160 }}><div className="font-semibold leading-tight">{fmtVal(hp.y)}</div><div className="mt-0.5 text-[10px] text-slate-500 dark:text-[#7A8FA8] leading-tight">{fmtTime(tms)}</div></div>;
      })()}
    </div>
  );
}

// ── Date Range Picker ──────────────────────────────────────────────────────────
const DR_PRESETS = [
  { label: "Last 30 Minutes", value: "Last 30m",  ms: 30 * 60e3 },
  { label: "Last 1 Hour",     value: "Last 1h",   ms: 60 * 60e3 },
  { label: "Last 2 Hours",    value: "Last 2h",   ms: 2 * 60 * 60e3 },
  { label: "Last 6 Hours",    value: "Last 6h",   ms: 6 * 60 * 60e3 },
  { label: "Last 24 Hours",   value: "Last 24h",  ms: 24 * 60 * 60e3 },
  { label: "Last 7 Days",     value: "Last 7d",   ms: 7 * 24 * 60 * 60e3 },
  { label: "Last 30 Days",    value: "Last 30d",  ms: 30 * 24 * 60 * 60e3 },
  { label: "Last 90 Days",    value: "Last 90d",  ms: 90 * 24 * 60 * 60e3 },
];
const DR_MONTHS_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DR_MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DR_DAY_LABELS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const dr_pad2 = (n) => n.toString().padStart(2, "0");
function dr_sameDay(a, b) { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
function dr_fmtDT(d) { const h=d.getHours(); return `${DR_MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${dr_pad2(h%12||12)}:${dr_pad2(d.getMinutes())} ${h>=12?"PM":"AM"}`; }
function dr_fmtDateShort(d) { return `${DR_MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }
function dr_fmtTime(d) { const h=d.getHours(); return `${dr_pad2(h%12||12)}:${dr_pad2(d.getMinutes())} ${h>=12?"PM":"AM"}`; }
function dr_getMonthGrid(year, month) {
  const firstDay=new Date(year,month,1).getDay(), daysInMonth=new Date(year,month+1,0).getDate(), prevDays=new Date(year,month,0).getDate();
  const cells=[];
  for(let i=firstDay-1;i>=0;i--) cells.push({day:prevDays-i,current:false});
  for(let d=1;d<=daysInMonth;d++) cells.push({day:d,current:true});
  for(let d=1;d<=42-cells.length;d++) cells.push({day:d,current:false});
  return cells;
}

function DR_ScrollSelector({ items, value, onSelect, dk, renderItem, width }) {
  const listRef = useRef(null);
  useEffect(() => {
    if (listRef.current) {
      const idx = items.indexOf(value);
      const el = listRef.current.children[idx];
      if (el) el.scrollIntoView({ block: "center", behavior: "auto" });
    }
  }, []);
  return (
    <motion.div
      initial={{ opacity:0, y:-4, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }}
      exit={{ opacity:0, y:-4, scale:0.97 }} transition={{ duration:0.15, ease:[0.16,1,0.3,1] }}
      className={`absolute z-20 mt-1 rounded-xl border overflow-hidden ${width ?? "w-36"} ${
        dk ? "bg-[#15181F] border-[#252A38]" : "bg-gradient-to-br from-white to-[#f8f9fd] border-slate-200/80"
      }`}
      style={{ boxShadow: dk ? "0 12px 40px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.04)" : "0 4px 16px rgba(99,102,241,0.06),0 24px 64px rgba(0,0,0,0.14)" }}
    >
      <div ref={listRef} className="max-h-48 overflow-y-auto py-1" style={{ scrollbarWidth:"thin", scrollbarColor: dk?"#3A4260 transparent":"#cbd5e1 transparent" }}>
        {items.map((item) => {
          const isActive = item === value;
          return (
            <button key={String(item)} onClick={() => onSelect(item)}
              className={`w-full text-left px-3 py-1.5 text-[11px] font-medium font-['Exo_2',sans-serif] transition-all ${
                isActive
                  ? dk ? "bg-indigo-500/15 text-indigo-300" : "bg-indigo-50 text-indigo-700"
                  : dk ? "text-[#8896AE] hover:bg-[#1A1D26] hover:text-[#E2E8F4]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}>
              <div className="flex items-center justify-between">
                <span>{renderItem(item)}</span>
                {isActive && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={dk?"text-indigo-400":"text-indigo-600"}><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

function DR_MiniCalendar({ date, onSelect, dk, accentCls }) {
  const [vYear, setVYear]   = useState(date.getFullYear());
  const [vMonth, setVMonth] = useState(date.getMonth());
  const cells = useMemo(() => dr_getMonthGrid(vYear, vMonth), [vYear, vMonth]);
  const today = new Date();
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker,  setShowYearPicker]  = useState(false);
  const monthRef = useRef(null), yearRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (monthRef.current && !monthRef.current.contains(e.target)) setShowMonthPicker(false);
      if (yearRef.current  && !yearRef.current.contains(e.target))  setShowYearPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const yearList = Array.from({length:11},(_,i)=>today.getFullYear()-5+i);
  const prev = () => { if(vMonth===0){setVMonth(11);setVYear(y=>y-1);}else setVMonth(m=>m-1); };
  const next = () => { if(vMonth===11){setVMonth(0);setVYear(y=>y+1);}else setVMonth(m=>m+1); };
  const selBtn = `px-2 py-0.5 rounded-md text-[11px] font-bold font-['Exo_2',sans-serif] transition-all cursor-pointer ${
    dk ? "text-[#C8D0E0] hover:bg-[#1E2130] hover:text-[#E2E8F4]" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
  }`;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={prev} className={`p-1 rounded-md transition-colors ${dk?"hover:bg-[#1E2130] text-[#56657A] hover:text-[#A8B4C8]":"hover:bg-slate-100 text-slate-400 hover:text-slate-600"}`}>
          <ChevronLeft size={13} />
        </button>
        <div className="flex items-center gap-0.5">
          <div className="relative" ref={monthRef}>
            <button onClick={()=>{setShowMonthPicker(!showMonthPicker);setShowYearPicker(false);}} className={`${selBtn} ${showMonthPicker?(dk?"bg-[#1E2130]":"bg-slate-100"):""}`}>
              {DR_MONTHS_FULL[vMonth]}<ChevronDown size={9} className={`inline ml-0.5 transition-transform ${showMonthPicker?"rotate-180":""}`}/>
            </button>
            <AnimatePresence>
              {showMonthPicker && <DR_ScrollSelector items={[0,1,2,3,4,5,6,7,8,9,10,11]} value={vMonth} onSelect={(m)=>{setVMonth(m);setShowMonthPicker(false);}} dk={dk} renderItem={(m)=>DR_MONTHS_FULL[m]} width="w-36"/>}
            </AnimatePresence>
          </div>
          <div className="relative" ref={yearRef}>
            <button onClick={()=>{setShowYearPicker(!showYearPicker);setShowMonthPicker(false);}} className={`${selBtn} ${showYearPicker?(dk?"bg-[#1E2130]":"bg-slate-100"):""}`}>
              {vYear}<ChevronDown size={9} className={`inline ml-0.5 transition-transform ${showYearPicker?"rotate-180":""}`}/>
            </button>
            <AnimatePresence>
              {showYearPicker && <DR_ScrollSelector items={yearList} value={vYear} onSelect={(y)=>{setVYear(y);setShowYearPicker(false);}} dk={dk} renderItem={(y)=>String(y)} width="w-24"/>}
            </AnimatePresence>
          </div>
        </div>
        <button onClick={next} className={`p-1 rounded-md transition-colors ${dk?"hover:bg-[#1E2130] text-[#56657A] hover:text-[#A8B4C8]":"hover:bg-slate-100 text-slate-400 hover:text-slate-600"}`}>
          <ChevronRight size={13} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-0.5">
        {DR_DAY_LABELS.map(d=><div key={d} className={`text-center text-[8px] font-bold uppercase tracking-widest py-1 ${dk?"text-[#3A4260]":"text-slate-300"}`}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell,idx)=>{
          const cellDate=new Date(vYear,vMonth+(cell.current?0:idx<7?-1:1),cell.day);
          const isSelected=cell.current&&dr_sameDay(cellDate,date);
          const isToday=cell.current&&dr_sameDay(cellDate,today);
          const isFuture=cellDate>today&&!dr_sameDay(cellDate,today);
          return (
            <button key={idx} disabled={!cell.current||isFuture} onClick={()=>cell.current&&!isFuture&&onSelect(cellDate)}
              className={`relative h-7 flex items-center justify-center text-[11px] font-medium font-['Exo_2',sans-serif] rounded-md transition-all ${
                !cell.current ? dk?"text-[#1E2130]":"text-slate-200"
                : isSelected ? `${accentCls} text-white`
                : isFuture   ? dk?"text-[#252A38] cursor-default":"text-slate-200 cursor-default"
                : isToday    ? dk?"text-[#E2E8F4] font-bold":"text-slate-900 font-bold"
                : dk ? "text-[#8896AE] hover:bg-[#1E2130] hover:text-[#E2E8F4] cursor-pointer" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              }`}>
              {cell.day}
              {isToday&&!isSelected&&cell.current&&<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full bg-indigo-400"/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DR_TimePicker({ date, onChange, dk }) {
  const h=date.getHours(), m=date.getMinutes(), h12=h%12||12, isPM=h>=12;
  const set=(hour24,min)=>{ const d=new Date(date); d.setHours(hour24,min,0,0); onChange(d); };
  const incH=()=>set((h+1)%24,m), decH=()=>set((h-1+24)%24,m);
  const incM=()=>{ const nm=m+5; set(nm>=60?(h+1)%24:h,nm%60); };
  const decM=()=>{ const nm=m-5; set(nm<0?(h-1+24)%24:h,(nm+60)%60); };
  const toggleAP=()=>set(isPM?h-12:h+12,m);
  const spinBtn=`flex items-center justify-center w-full py-0.5 rounded-md transition-colors ${dk?"text-[#3A4260] hover:text-[#8896AE] hover:bg-[#1A1D26]":"text-slate-300 hover:text-slate-500 hover:bg-slate-100"}`;
  const val=`text-[15px] font-bold font-['Exo_2',sans-serif] tabular-nums leading-none ${dk?"text-[#E2E8F4]":"text-slate-800"}`;
  const cell=`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg ${dk?"bg-[#0F1117]":"bg-slate-50"}`;
  return (
    <div className="flex items-center gap-1.5">
      <div className={cell}>
        <button onClick={incH} className={spinBtn}><ChevronUp size={11}/></button>
        <span className={val}>{dr_pad2(h12)}</span>
        <button onClick={decH} className={spinBtn}><ChevronDown size={11}/></button>
      </div>
      <span className={`text-[15px] font-bold leading-none ${dk?"text-[#3A4260]":"text-slate-300"}`}>:</span>
      <div className={cell}>
        <button onClick={incM} className={spinBtn}><ChevronUp size={11}/></button>
        <span className={val}>{dr_pad2(m)}</span>
        <button onClick={decM} className={spinBtn}><ChevronDown size={11}/></button>
      </div>
      <button onClick={toggleAP} className={`ml-1 px-2.5 py-2 rounded-lg text-[10px] font-bold tracking-wider transition-all ${
        dk ? "bg-[#0F1117] text-indigo-400 hover:bg-[#1A1D26]" : "bg-slate-50 text-indigo-600 hover:bg-slate-100"
      }`}>{isPM?"PM":"AM"}</button>
    </div>
  );
}

function DR_DateTimeField({ label, date, onDateChange, dk, accentColor, accentBg, accentCalBtn }) {
  const [expanded, setExpanded] = useState(false);
  const handleDaySelect = (d) => { const next=new Date(d); next.setHours(date.getHours(),date.getMinutes(),0,0); onDateChange(next); };
  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      dk ? `bg-[#0F1117] ${expanded?"border-[#3A4260]":"border-[#252A38]"}` : `bg-white ${expanded?"border-slate-300":"border-slate-200"} shadow-sm`
    }`}>
      <button onClick={()=>setExpanded(!expanded)} className={`w-full flex items-center gap-3 px-3.5 py-2.5 transition-colors ${dk?"hover:bg-[#111318]":"hover:bg-slate-50"}`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${dk?"bg-[#1A1D26]":"bg-slate-50"}`}>
          <Calendar size={13} className={accentColor} strokeWidth={1.7}/>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${accentBg}`}/>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${accentColor}`}>{label}</span>
          </div>
          <p className={`text-[13px] font-semibold font-['Exo_2',sans-serif] mt-0.5 truncate ${dk?"text-[#E2E8F4]":"text-slate-800"}`}>
            {dr_fmtDateShort(date)}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0 ${dk?"bg-[#1A1D26]":"bg-slate-100"}`}>
          <Clock size={10} className={dk?"text-[#56657A]":"text-slate-400"}/>
          <span className={`text-[11px] font-bold font-['Exo_2',sans-serif] tabular-nums ${dk?"text-[#A8B4C8]":"text-slate-600"}`}>{dr_fmtTime(date)}</span>
        </div>
        <ChevronDown size={13} className={`shrink-0 transition-transform ${expanded?"rotate-180":""} ${dk?"text-[#56657A]":"text-slate-400"}`}/>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.2,ease:[0.16,1,0.3,1]}} className="overflow-hidden">
            <div className={`border-t ${dk?"border-[#1E2130]":"border-slate-100"}`}>
              <div className="px-3.5 pt-3 pb-2">
                <DR_MiniCalendar date={date} onSelect={handleDaySelect} dk={dk} accentCls={accentCalBtn}/>
              </div>
              <div className={`mx-3.5 h-px ${dk?"bg-[#1E2130]":"bg-slate-100"}`}/>
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={11} className={dk?"text-[#56657A]":"text-slate-400"}/>
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${dk?"text-[#56657A]":"text-slate-400"}`}>Time</span>
                </div>
                <DR_TimePicker date={date} onChange={onDateChange} dk={dk}/>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DateRangeDropdown({ onClose, isDarkMode }) {
  const dk = isDarkMode;
  const now = new Date();
  const { label: currentLabel, setCustomRange, setPreset } = useTimeRange();
  const getInitFrom = () => {
    const p = DR_PRESETS.find(x => x.value === currentLabel);
    return new Date(now.getTime() - (p?.ms ?? 2*3600_000));
  };
  const [fromDate, setFromDate] = useState(getInitFrom);
  const [toDate,   setToDate]   = useState(() => new Date(now));
  const [active,   setActive]   = useState(currentLabel ?? "Last 2h");
  const ref = useRef(null);
  useEffect(() => {
    const handler    = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const keyHandler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    window.addEventListener("keydown", keyHandler);
    return () => { document.removeEventListener("mousedown", handler); window.removeEventListener("keydown", keyHandler); };
  }, [onClose]);
  const applyPreset = (p) => {
    const t = new Date();
    setFromDate(new Date(t.getTime() - p.ms));
    setToDate(new Date(t));
    setActive(p.value);
  };
  const validRange = fromDate < toDate;
  const handleApply = () => {
    if (!validRange) return;
    if (active) { setPreset(active); } else { setCustomRange(fromDate.toISOString(), toDate.toISOString()); }
    onClose();
  };
  const handleReset = () => { applyPreset(DR_PRESETS[2]); setPreset(DR_PRESETS[2].value); };
  return (
    <div ref={ref}
      className={`absolute left-0 top-full mt-2 w-[440px] max-w-[92vw] rounded-2xl border flex flex-col max-h-[85vh] overflow-hidden z-50 ${
        dk ? "bg-[#15181F] border-[#252A38]" : "bg-gradient-to-br from-white to-[#f8f9fd] border-slate-200/80"
      }`}
      style={{ boxShadow: dk ? "0 24px 64px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.04)" : "0 4px 16px rgba(99,102,241,0.06),0 24px 64px rgba(0,0,0,0.14)" }}
    >
      <div className={`flex items-center justify-between px-5 py-3 border-b ${dk?"bg-[#111318] border-[#252A38]":"bg-gradient-to-r from-slate-50 to-[#f8f9fc] border-slate-200/60"}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${dk?"bg-indigo-500/15":"bg-indigo-100"}`}>
            <Calendar size={14} className={dk?"text-indigo-400":"text-indigo-600"} strokeWidth={1.7}/>
          </div>
          <div>
            <p className={`font-['Exo_2',sans-serif] font-bold text-[13px] leading-tight ${dk?"text-[#E2E8F4]":"text-slate-900"}`}>Time Range</p>
            <p className={`text-[10px] ${dk?"text-[#56657A]":"text-slate-400"}`}>{active ?? "Custom selection"}</p>
          </div>
        </div>
        <button onClick={onClose} className={`p-1 rounded-lg transition-colors ${dk?"hover:bg-[#1E2130] text-[#6B84AD]":"hover:bg-slate-200 text-slate-400"}`}>
          <X size={15}/>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto" style={{scrollbarWidth:"none"}}>
        <div className="px-5 pt-4 pb-3">
          <p className={`text-[9px] font-bold uppercase tracking-widest mb-2.5 ${dk?"text-[#56657A]":"text-slate-400"}`}>Quick Select</p>
          <div className="grid grid-cols-2 gap-0.5">
            {DR_PRESETS.map(p => {
              const isA = active === p.value;
              return (
                <button key={p.value} onClick={()=>applyPreset(p)}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-[11.5px] font-medium font-['Exo_2',sans-serif] transition-all ${
                    isA ? dk?"bg-indigo-500/15 text-indigo-300":"bg-indigo-50 text-indigo-700"
                        : dk?"text-[#6B84AD] hover:bg-[#1A1D26] hover:text-[#C8D0E0]":"text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}>
                  <span>{p.label}</span>
                  {isA && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={dk?"text-indigo-400":"text-indigo-600"}><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
              );
            })}
          </div>
        </div>
        <div className={`mx-5 h-px ${dk?"bg-[#252A38]":"bg-slate-200"}`}/>
        <div className="px-5 pt-3 pb-4">
          <p className={`text-[9px] font-bold uppercase tracking-widest mb-3 ${dk?"text-[#56657A]":"text-slate-400"}`}>Custom Range</p>
          <div className="flex flex-col gap-3">
            <DR_DateTimeField label="From" date={fromDate} onDateChange={d=>{setFromDate(d);setActive(null);}} dk={dk}
              accentColor={dk?"text-indigo-400":"text-indigo-600"} accentBg={dk?"bg-indigo-400":"bg-indigo-500"}
              accentCalBtn={dk?"bg-indigo-500 shadow-lg shadow-indigo-500/30":"bg-indigo-500 shadow-md shadow-indigo-500/25"}/>
            <div className="flex items-center justify-center py-0.5">
              <div className={`flex-1 h-px ${dk?"bg-[#252A38]":"bg-slate-200"}`}/>
              <div className={`mx-3 w-6 h-6 rounded-full flex items-center justify-center ${dk?"bg-[#1A1D26] border border-[#252A38]":"bg-slate-100 border border-slate-200"}`}>
                <ArrowRight size={10} className={dk?"text-[#56657A]":"text-slate-400"}/>
              </div>
              <div className={`flex-1 h-px ${dk?"bg-[#252A38]":"bg-slate-200"}`}/>
            </div>
            <DR_DateTimeField label="To" date={toDate} onDateChange={d=>{setToDate(d);setActive(null);}} dk={dk}
              accentColor={dk?"text-emerald-400":"text-emerald-600"} accentBg={dk?"bg-emerald-400":"bg-emerald-500"}
              accentCalBtn={dk?"bg-emerald-500 shadow-lg shadow-emerald-500/30":"bg-emerald-500 shadow-md shadow-emerald-500/25"}/>
          </div>
          <AnimatePresence>
            <motion.div key={`${fromDate.getTime()}-${toDate.getTime()}-${validRange}`} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.15}}>
              <div className={`mt-3 rounded-lg px-3.5 py-2.5 flex items-center gap-2.5 ${
                !validRange
                  ? dk?"bg-red-500/[0.06] border border-red-500/20 text-red-300":"bg-red-50 border border-red-200 text-red-600"
                  : dk?"bg-[#111318] border border-[#252A38]":"bg-slate-50 border border-slate-200"
              }`}>
                <Calendar size={11} className={`shrink-0 ${!validRange?"opacity-70":dk?"text-[#56657A]":"text-slate-400"}`}/>
                {validRange ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-0 min-w-0">
                    <span className={`text-[11px] font-semibold font-['Exo_2',sans-serif] ${dk?"text-[#A8B4C8]":"text-slate-700"}`}>{dr_fmtDT(fromDate)}</span>
                    <span className={`mx-2 text-[11px] hidden sm:inline ${dk?"text-[#3A4260]":"text-slate-300"}`}>→</span>
                    <span className={`text-[11px] font-semibold font-['Exo_2',sans-serif] ${dk?"text-[#A8B4C8]":"text-slate-700"}`}>{dr_fmtDT(toDate)}</span>
                  </div>
                ) : <span className="text-[11px] font-medium">Start must be before end</span>}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className={`flex items-center justify-between px-5 py-3 border-t ${dk?"bg-[#111318] border-[#252A38]":"bg-gradient-to-r from-slate-50 to-[#f8f9fc] border-slate-200/60"}`}>
        <button onClick={handleReset} className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${dk?"text-[#6B84AD] hover:text-[#A8B4C8]":"text-slate-500 hover:text-slate-700"}`}>
          <RotateCcw size={11}/> Reset
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors border ${
            dk?"bg-[#1E2130] border-[#252A38] text-[#A8B4C8] hover:bg-[#252A38]":"bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
          }`}>Cancel</button>
          <button onClick={handleApply} disabled={!validRange} className={`px-4 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
            !validRange ? "opacity-40 cursor-not-allowed bg-indigo-600/50 text-white/60"
              : dk ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
          }`}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TenantHealthBar ────────────────────────────────────────────────────────────
const SIGNALS = [
  { key: "degraded", label: "Degraded Health", Icon: ShieldAlert, color: "text-red-500" },
  { key: "errors",   label: "Service Errors",  Icon: AlertCircle, color: "text-red-400"   },
  { key: "hotspots", label: "Hotspots",         Icon: Flame,       color: "text-amber-500" },
];

function SignalExpandPanel({ signalKey, servicesTop, hotspots, isDarkMode }) {
  const tC = isDarkMode ? "text-[#C8D0E0]" : "text-slate-700";
  const mC = isDarkMode ? "text-[#6B84AD]" : "text-slate-500";
  const hC = isDarkMode ? "text-[#56657A]" : "text-slate-400";
  const bC = isDarkMode ? "border-[#252A38]/60" : "border-slate-100";
  const rowHover = isDarkMode ? "hover:bg-[#111318]" : "hover:bg-slate-50";
  const panelBg = isDarkMode ? "border-[#252A38] bg-[#111318]/50" : "border-slate-200 bg-slate-50/60";
  if (signalKey === "degraded") {
    const layers = [
      { layer: "Infrastructure",    val: "Degraded", color: "text-red-500",     dot: "bg-red-500",     bar: "w-2/5"  },
      { layer: "Application Layer", val: "Impacted", color: "text-amber-500",   dot: "bg-amber-500",   bar: "w-3/5"  },
      { layer: "Network Layer",     val: "Healthy",  color: "text-emerald-500", dot: "bg-emerald-500", bar: "w-full" },
      { layer: "Database Tier",     val: "Degraded", color: "text-red-500",     dot: "bg-red-500",     bar: "w-2/5"  },
    ];
    return (
      <div className={`rounded-xl border overflow-x-auto ${panelBg}`} style={{ scrollbarWidth: "none" }}>
        <div style={{ minWidth: 340 }}>
          <div className={`grid grid-cols-3 px-4 py-2 border-b ${bC} text-[9px] font-bold uppercase tracking-widest ${hC}`}><span>Layer</span><span>Status</span><span className="text-right">Health</span></div>
          {layers.map((r, i) => (
            <div key={r.layer} className={`grid grid-cols-3 items-center px-4 py-2.5 transition-colors ${rowHover} ${i < layers.length - 1 ? `border-b ${bC}` : ""}`}>
              <span className={`text-[12px] font-medium ${tC}`}>{r.layer}</span>
              <div className="flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.dot}`} /><span className={`text-[12px] font-semibold ${r.color}`}>{r.val}</span></div>
              <div className="flex justify-end"><div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDarkMode ? "bg-[#1E2130]" : "bg-slate-200"}`}><div className={`h-full rounded-full ${r.val === "Healthy" ? "bg-emerald-500" : r.val === "Impacted" ? "bg-amber-500" : "bg-red-500"} ${r.bar}`} /></div></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (signalKey === "errors") {
    const errs = (servicesTop || []).filter((s) => Number(s?.error_rate_pct ?? 0) >= 1);
    return (
      <div className={`rounded-xl border overflow-x-auto ${panelBg}`} style={{ scrollbarWidth: "none" }}>
        <div style={{ minWidth: 340 }}>
          <div className={`grid grid-cols-4 px-4 py-2 border-b ${bC} text-[9px] font-bold uppercase tracking-widest ${hC}`}><span className="col-span-2">Service</span><span className="text-right">P95</span><span className="text-right">Error Rate</span></div>
          {errs.length ? errs.map((s, i) => {
            const err = Number(s?.error_rate_pct ?? 0), p95 = Number(s?.latency_p95_ms ?? 0);
            return (
              <div key={i} className={`grid grid-cols-4 items-center px-4 py-2.5 transition-colors ${rowHover} ${i < errs.length - 1 ? `border-b ${bC}` : ""}`}>
                <div className="col-span-2 flex items-center gap-2 min-w-0"><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${err >= 10 ? "bg-red-500" : "bg-amber-500"}`} /><span className={`text-[12px] font-medium truncate ${tC}`}>{s?.service || s?.service_name || "unknown"}</span></div>
                <span className={`text-[12px] font-medium text-right tabular-nums ${mC}`}>{p95 > 0 ? `${p95}ms` : "—"}</span>
                <span className={`text-[12px] font-bold text-right tabular-nums ${err >= 10 ? "text-red-500" : "text-amber-500"}`}>{err.toFixed(1)}%</span>
              </div>
            );
          }) : <div className={`px-4 py-4 text-[12px] ${mC}`}>No services with errors.</div>}
        </div>
      </div>
    );
  }
  const items = [
    ...(hotspots?.alerts || []).map((x) => ({ title: x?.title || "Problem", severity: (x?.severity || "CRITICAL").toUpperCase(), occurrences: Number(x?.incident_count || 0), impact: x?.severity === "critical" ? "P1" : "P2", time: x?.last_seen ? new Date(x.last_seen).toLocaleString() : "—" })),
    ...(hotspots?.logs   || []).map((x) => ({ title: x?.source || "Log pattern", severity: "WARN", occurrences: Number(x?.occurrences || 0), impact: "P3", time: x?.last_seen ? new Date(x.last_seen).toLocaleString() : "—" })),
  ].slice(0, 7);
  return (
    <div className={`rounded-xl border overflow-x-auto ${panelBg}`} style={{ scrollbarWidth: "none" }}>
      <div style={{ minWidth: 480 }}>
        <div className={`grid grid-cols-12 px-4 py-2 border-b ${bC} text-[9px] font-bold uppercase tracking-widest ${hC}`}><span className="col-span-1">Sev</span><span className="col-span-5">Issue</span><span className="col-span-2 text-right">Impact</span><span className="col-span-2 text-right">Count</span><span className="col-span-2 text-right">When</span></div>
        {items.length ? items.map((item, idx) => (
          <div key={idx} className={`grid grid-cols-12 items-center px-4 py-2.5 transition-colors cursor-pointer ${rowHover} ${idx < items.length - 1 ? `border-b ${bC}` : ""}`}>
            <div className="col-span-1"><span className={`inline-block w-2 h-2 rounded-full ${item.severity === "CRITICAL" ? "bg-red-500" : "bg-amber-500"}`} /></div>
            <div className="col-span-5 min-w-0 pr-2"><p className={`text-[11.5px] font-medium truncate ${tC}`}>{item.title}</p></div>
            <span className={`col-span-2 text-[11px] font-bold text-right ${item.impact === "P1" ? "text-red-500" : item.impact === "P2" ? "text-amber-500" : mC}`}>{item.impact}</span>
            <span className={`col-span-2 text-[11px] font-medium text-right tabular-nums ${mC}`}>{item.occurrences}</span>
            <span className={`col-span-2 text-[11px] font-medium text-right ${hC}`}>{item.time}</span>
          </div>
        )) : <div className={`px-4 py-4 text-[12px] ${mC}`}>No hotspots found.</div>}
      </div>
    </div>
  );
}

function TenantHealthBar({ health, servicesTop, hotspots, onViewAnalytics, isDarkMode, loading, hasError }) {
  const [activeSignal, setActiveSignal] = useState(null);
  const open = Number(health?.open_count || 0);
  const crit = Number(health?.critical_open || 0);
  const warn = Number(health?.warning_open || 0);
  const toggle = (key) => setActiveSignal((p) => (p === key ? null : key));
  const cardBg   = isDarkMode ? "bg-gradient-to-br from-[#1A1D26] to-[#15181F] border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.05)]" : "bg-white border-slate-200 shadow-sm";
  const headerBorder = isDarkMode ? "border-[#252A38]/80" : "border-slate-200";
  const tabBg    = isDarkMode ? "bg-[#111318]/40" : "bg-slate-50/70";
  const sepColor = isDarkMode ? "text-[#252A38]"  : "text-slate-200";
  const expandBorder = isDarkMode ? "border-[#252A38]" : "border-slate-100";

  // The bar itself is always mounted (per product requirement) — only its
  // *contents* switch between a loading skeleton, an "unavailable" state,
  // and the live view, so the surrounding layout never collapses/shifts.
  if (loading) {
    const pulseBg = isDarkMode ? "bg-[#252A38]" : "bg-slate-200";
    const pulse = `animate-pulse rounded ${pulseBg}`;
    return (
      <div className={`border rounded-2xl overflow-hidden ${cardBg}`}>
        <div className={`h-0.5 w-full ${pulseBg}`} />
        <div className={`px-4 sm:px-5 py-3 sm:py-3.5 border-b ${headerBorder} flex items-center gap-3`}>
          <div className={`w-8 h-8 rounded-xl shrink-0 ${pulse}`} />
          <div className="min-w-0 flex-1">
            <span className={`block h-3 w-28 mb-1.5 ${pulse}`} />
            <span className={`block h-2 w-44 ${pulse}`} />
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className={`block h-2.5 w-14 ${pulse}`} />
            <span className={`block h-2.5 w-14 ${pulse}`} />
            <span className={`block h-2.5 w-14 ${pulse}`} />
          </div>
        </div>
        <div className={`px-3 sm:px-5 py-2.5 border-b ${headerBorder} ${tabBg} flex items-center gap-4`}>
          <span className={`block h-2.5 w-24 ${pulse}`} />
          <span className={`block h-2.5 w-24 ${pulse}`} />
          <span className={`block h-2.5 w-20 ${pulse}`} />
        </div>
      </div>
    );
  }

  const unavailable = !!hasError;
  const badgeCls = unavailable
    ? (isDarkMode ? "bg-[#252A38] text-[#8896AE] border border-[#3A4260]" : "bg-slate-100 text-slate-500 border border-slate-200")
    : "bg-red-500/10 text-red-500 border border-red-500/20";
  const topBarCls = unavailable ? (isDarkMode ? "bg-[#252A38]" : "bg-slate-200") : "bg-gradient-to-r from-red-500 via-red-400/60 to-red-500/10";
  const iconWrapCls = unavailable ? (isDarkMode ? "bg-[#252A38]" : "bg-slate-100") : "bg-red-500/10";
  const iconCls = unavailable ? (isDarkMode ? "text-[#6B84AD]" : "text-slate-400") : "text-red-400";

  return (
    <div className={`border rounded-2xl overflow-hidden ${cardBg}`}>
      <div className={`h-0.5 w-full ${topBarCls}`} />
      <div className={`px-4 sm:px-5 py-3 sm:py-3.5 border-b ${headerBorder} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconWrapCls}`} style={unavailable ? undefined : { boxShadow: "0 0 16px rgba(239,68,68,0.12)" }}>
            <ShieldAlert size={15} className={iconCls} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-['Exo_2',sans-serif] font-semibold text-[14px] ${isDarkMode ? "text-[#E2E8F4]" : "text-slate-800"}`}>Tenant Health</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badgeCls}`}>{unavailable ? "Unavailable" : "Degraded"}</span>
              {!unavailable && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />}
            </div>
            <p className={`text-[10px] mt-0.5 hidden sm:block ${isDarkMode ? "text-[#56657A]" : "text-slate-400"}`}>
              {unavailable ? "Health data could not be loaded for this range" : "Infrastructure & service layer status overview"}
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-2.5 sm:gap-3 text-[10px] font-semibold font-['Exo_2',sans-serif] flex-wrap pl-11 sm:pl-0`}>
          <span className="flex items-center gap-1.5 tabular-nums text-blue-500"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{open} Open</span>
          <span className={sepColor}>|</span>
          <span className="flex items-center gap-1.5 tabular-nums text-red-500"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{crit} Critical</span>
          <span className={sepColor}>|</span>
          <span className="flex items-center gap-1.5 tabular-nums text-amber-500"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{warn} Warning</span>
        </div>
      </div>
      <div className={`border-b ${headerBorder} ${tabBg}`}>
        <div className="px-3 sm:px-5 flex items-center justify-between gap-2">
          <div className="flex items-center overflow-x-auto flex-1 min-w-0" style={{ scrollbarWidth: "none" }}>
            {SIGNALS.map(({ key, label, Icon, color }) => {
              const isActive = activeSignal === key;
              return (
                <button key={key} onClick={() => toggle(key)}
                  className={`relative flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${isActive ? (isDarkMode ? "text-[#E2E8F4]" : "text-slate-800") : (isDarkMode ? "text-[#56657A] hover:text-[#A8B4C8]" : "text-slate-400 hover:text-slate-600")}`}>
                  <Icon size={12} className={isActive ? "" : color} />
                  {label}
                  <ChevronDown size={10} className={`transition-transform ${isActive ? "rotate-180" : ""}`} />
                  {isActive && <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-indigo-500" />}
                </button>
              );
            })}
          </div>
          <button onClick={onViewAnalytics} className="flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap shrink-0 text-red-500 hover:text-red-600">View Analytics<ArrowRight size={11} /></button>
        </div>
      </div>
      <AnimatePresence>
        {activeSignal && (
          <motion.div key={activeSignal} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeInOut" }} className="overflow-hidden">
            <div className={`px-4 sm:px-5 pb-4 pt-1 border-t ${expandBorder}`}>
              <div className="flex items-center gap-2 mb-3 pt-3">
                {(() => { const sig = SIGNALS.find((s) => s.key === activeSignal); return (<><sig.Icon size={13} className={sig.color} /><span className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-[#6B84AD]" : "text-slate-500"}`}>{sig.label} — Details</span></>); })()}
              </div>
              <SignalExpandPanel signalKey={activeSignal} servicesTop={servicesTop} hotspots={hotspots} isDarkMode={isDarkMode} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── KPI MetricCard ─────────────────────────────────────────────────────────────
// Memoized with React's default shallow prop comparison: as long as `data`
// keeps the same reference (see useDeepMemo above) and the other primitive
// props are unchanged, this card — and its chart — will not re-render at all
// when unrelated parts of the page change (e.g. toggling a date picker).
const MetricCard = React.memo(function MetricCard({ title, sub, value, change, changeDir, accentHex, Icon, data, gradientId, clickLabel, statusDot, onClick, isDarkMode, tooltipMeta, tooltipFormatter, compact }) {
  return (
    <div className={`relative px-5 py-4 cursor-pointer group transition-all ${isDarkMode ? "hover:bg-white/[0.02]" : "hover:bg-slate-50"}`} onClick={onClick}>
      <div className="absolute top-4 right-4">
        <span className="relative flex h-2 w-2">
          {statusDot === "#FF7979" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ backgroundColor: statusDot }} />}
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: statusDot, boxShadow: `0 0 0 3px ${statusDot}25` }} />
        </span>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${accentHex}15`, border: `1px solid ${accentHex}30` }}><Icon size={11} style={{ color: accentHex }} /></div>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-[#56657A]" : "text-slate-400"}`}>{title}</span>
      </div>
      <p className={`text-[10px] mb-2 ${isDarkMode ? "text-[#56657A]" : "text-slate-400"}`}>{sub}</p>
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`font-['Exo_2',sans-serif] font-bold leading-none tracking-tight tabular-nums transition-all duration-500 ${compact ? "text-[16px]" : "text-[22px]"} ${isDarkMode ? "text-[#E2E8F4]" : "text-slate-800"}`}>{value}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${changeDir === "down" ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"}`}>
          {changeDir === "up" ? <TrendingUp size={9} /> : <TrendingDown size={9} />}{change}
        </span>
      </div>
      <div className="h-[52px] w-full mb-2" style={{ overflow: "visible" }}>
        <ResponsiveContainer width="100%" height={52}>
          <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 2, left: 4 }}>
            <Tooltip
              wrapperStyle={{ zIndex: 9999, pointerEvents: "none", transform: "translateY(calc(-100% - 12px))" }}
              cursor={{ stroke: accentHex, strokeOpacity: 0.35, strokeWidth: 1, strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const val = payload[0]?.value;
                const pointVal = typeof tooltipFormatter === "function"
                  ? tooltipFormatter(val)
                  : val != null ? Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—";
                return (
                  <div style={{ background: isDarkMode ? "#0D0F14" : "#fff", border: `1px solid ${accentHex}30`, borderRadius: 8, overflow: "hidden", minWidth: 148, boxShadow: `0 8px 24px rgba(0,0,0,0.4)`, pointerEvents: "none" }}>
                    <div style={{ height: 3, background: `linear-gradient(90deg, ${accentHex}, ${accentHex}55)` }} />
                    <div style={{ padding: "7px 10px" }}>
                      <p style={{ color: isDarkMode ? "#7A8FA8" : "#94a3b8", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{title}</p>
                      <p style={{ color: accentHex, fontSize: 14, fontWeight: 800, fontFamily: "'Exo 2', sans-serif", lineHeight: 1, marginBottom: Array.isArray(tooltipMeta) && tooltipMeta.length ? 6 : 0 }}>{pointVal}</p>
                      {Array.isArray(tooltipMeta) && tooltipMeta.length > 0 && (
                        <div style={{ borderTop: `1px solid ${isDarkMode ? "#1E2130" : "#f1f5f9"}`, paddingTop: 5, display: "flex", flexDirection: "column", gap: 3 }}>
                          {tooltipMeta.map((m, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                              <span style={{ color: isDarkMode ? "#56657A" : "#94a3b8", fontSize: 10 }}>{m.label}</span>
                              <span style={{ color: isDarkMode ? "#A8B4C8" : "#334155", fontSize: 10, fontWeight: 700, fontFamily: "'Exo 2', sans-serif" }}>{m.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="value" stroke={accentHex} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} activeDot={{ r: 5, fill: accentHex, strokeWidth: 2, stroke: isDarkMode ? "#1A1D26" : "#fff" }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <span className={`text-[10px] font-semibold font-['Exo_2',sans-serif] flex items-center gap-1 transition-colors ${isDarkMode ? "text-[#56657A] group-hover:text-indigo-400" : "text-slate-400 group-hover:text-indigo-600"}`}>
        {clickLabel}<ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
    </div>
  );
});

// ── KPI Skeleton Card ──────────────────────────────────────────────────────────
// Shown in place of MetricCard while the very first fetch is in flight, so the
// KPI row never flashes "—" placeholders before settling into real values.
function KpiSkeletonCard({ isDarkMode, compact }) {
  const pulseBg = isDarkMode ? "bg-[#252A38]" : "bg-slate-200";
  const pulse = `animate-pulse rounded ${pulseBg}`;
  return (
    <div className="relative px-5 py-4">
      <div className="absolute top-4 right-4">
        <span className={`block h-2 w-2 rounded-full ${pulse}`} />
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-6 h-6 rounded-lg ${pulse}`} />
        <span className={`h-2.5 w-16 ${pulse}`} />
      </div>
      <span className={`block h-2 w-24 mb-3 ${pulse}`} />
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`block h-[22px] ${compact ? "w-16" : "w-20"} ${pulse}`} />
        <span className={`block h-3.5 w-10 rounded ${pulse}`} />
      </div>
      <div className={`h-[52px] w-full mb-2 rounded-lg ${pulse}`} />
      <span className={`block h-2.5 w-20 ${pulse}`} />
    </div>
  );
}

// ── ServicesTable ──────────────────────────────────────────────────────────────
function ServicesTable({ rows = [], onViewAll, isDarkMode }) {
  const critCount = rows.filter((r) => Number(r?.error_rate_pct ?? 0) >= 10).length;
  const warnCount = rows.filter((r) => { const e = Number(r?.error_rate_pct ?? 0); return e >= 1 && e < 10; }).length;
  const healthOf = (r) => { const e = Number(r?.error_rate_pct ?? 0); return e >= 10 ? 42 : e >= 1 ? 74 : 97; };
  const cardBg    = isDarkMode ? "bg-[#1A1D26] border-[#252A38]"    : "bg-white border-slate-200 shadow-sm";
  const headerBg  = isDarkMode ? "border-[#252A38]"                  : "border-slate-200";
  const colHdrBg  = isDarkMode ? "border-[#252A38] bg-[#111318]"     : "border-slate-100 bg-slate-50";
  const colHdrTxt = isDarkMode ? "text-[#56657A]"                    : "text-slate-400";
  const rowBorder = isDarkMode ? "border-[#1E2130] hover:bg-[#1E2130]" : "border-slate-100/80 hover:bg-slate-50";
  const footerBg  = isDarkMode ? "border-[#252A38] bg-[#111318]"     : "border-slate-100 bg-slate-50";
  const textPri   = isDarkMode ? "text-[#E2E8F4]"  : "text-slate-800";
  const textSec   = isDarkMode ? "text-[#A8B4C8]"  : "text-slate-600";
  const textMut   = isDarkMode ? "text-[#56657A]"  : "text-slate-400";
  const trackBg   = isDarkMode ? "bg-[#252A38]"     : "bg-slate-200";
  return (
    <div className={`border rounded-2xl overflow-hidden flex flex-col h-full max-h-[480px] ${cardBg}`}>
      <div className={`px-5 py-3.5 border-b ${headerBg} flex items-center justify-between gap-2 shrink-0`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? "bg-indigo-500/10" : "bg-indigo-50"}`}><Cpu size={15} className={isDarkMode ? "text-indigo-400" : "text-indigo-600"} /></div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-[14px] ${textPri}`}>Top Services</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isDarkMode ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>{rows.length}</span>
            </div>
            <p className={`text-[10px] mt-0.5 ${textMut}`}>Traffic, errors &amp; health across your tenant</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {critCount > 0 && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-500 border border-red-500/20"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{critCount} Critical</span>}
          {warnCount > 0 && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{warnCount} Warning</span>}
        </div>
      </div>
      <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <div className={`grid grid-cols-[minmax(140px,2.5fr)_minmax(80px,1fr)_minmax(80px,1fr)_minmax(70px,1fr)_80px_minmax(70px,0.8fr)] min-w-[520px] px-5 py-2 border-b ${colHdrBg} text-[10px] font-semibold uppercase tracking-wider ${colHdrTxt} shrink-0`}>
          <span className="flex items-center gap-1">Service <ChevronDown size={9} className="opacity-40" /></span>
          <span className="flex items-center gap-1">Requests <ChevronDown size={9} className="opacity-40" /></span>
          <span className="flex items-center gap-1">Errors <ChevronDown size={9} className="opacity-40" /></span>
          <span className="flex items-center gap-1">P95 <ChevronDown size={9} className="opacity-40" /></span>
          <span>Last Seen</span>
          <span className="text-center">Health</span>
        </div>
      </div>
      <div className="overflow-y-auto overflow-x-auto flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(100,116,139,0.25) transparent" }}>
        {rows.length ? rows.map((r, idx) => {
          const err = Number(r?.error_rate_pct ?? r?.error_rate ?? 0);
          const p95 = Number(r?.latency_p95_ms ?? 0);
          const h   = healthOf(r);
          const st  = err >= 10 ? "critical" : err >= 1 ? "warning" : "healthy";
          return (
            <div key={idx} className={`grid grid-cols-[minmax(140px,2.5fr)_minmax(80px,1fr)_minmax(80px,1fr)_minmax(70px,1fr)_80px_minmax(70px,0.8fr)] min-w-[520px] px-5 py-2.5 border-b items-center cursor-pointer transition-all duration-150 ${rowBorder}`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDot(st)}`} style={st === "critical" ? { boxShadow: "0 0 0 2px rgba(239,68,68,0.2)" } : {}} />
                <span className={`text-[12px] font-medium truncate ${textPri}`}>{r?.service || r?.service_name || "unknown"}</span>
              </div>
              <span className={`text-[12px] font-semibold tabular-nums ${textSec}`}>{fmt.int(Number(r?.requests ?? 0))}</span>
              <div><span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-bold tabular-nums ${getErrorColor(err)} ${getErrorBg(err)}`}>{err.toFixed(1)}%</span></div>
              <span className={`text-[12px] font-semibold tabular-nums ${getP95Color(p95)}`}>{p95 > 0 ? `${p95} ms` : "—"}</span>
              <span className={`text-[11px] tabular-nums ${textMut}`} title={r?.last_seen || "—"}>{relTime(r?.last_seen)}</span>
              <div className="flex items-center gap-2 justify-center">
                <div className={`w-full max-w-[48px] h-1.5 rounded-full ${trackBg}`}><div className={`h-full rounded-full transition-all ${getHealthColor(h)}`} style={{ width: `${h}%` }} /></div>
                <span className={`text-[10px] font-bold tabular-nums w-[24px] text-right ${h >= 90 ? "text-emerald-500" : h >= 70 ? "text-amber-500" : "text-red-500"}`}>{h}</span>
              </div>
            </div>
          );
        }) : <div className={`px-5 py-8 text-sm ${isDarkMode ? "text-[#56657A]" : "text-slate-400"}`}>No service data for this time range.</div>}
      </div>
      <div className={`px-5 py-2.5 border-t flex items-center justify-between shrink-0 ${footerBg}`}>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] ${textMut}`}>Showing {rows.length} services</span>
          <div className={`h-3 w-px ${isDarkMode ? "bg-[#252A38]" : "bg-slate-200"}`} />
          <span className={`text-[10px] tabular-nums ${textMut}`}>Avg Health: <span className="font-bold text-emerald-500">{rows.length ? (rows.reduce((a, r) => a + healthOf(r), 0) / rows.length).toFixed(1) : "—"}</span></span>
        </div>
        <button onClick={onViewAll} className={`flex items-center gap-1 text-[11px] font-semibold ${isDarkMode ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-700"}`}>Explore All Services <ArrowRight size={11} /></button>
      </div>
    </div>
  );
}

// ── HotspotsCard ──────────────────────────────────────────────────────────────
function HotspotsCard({ logs = [], alerts = [], onAnalyze, onItemClick, isDarkMode }) {
  const items = useMemo(() => [
    ...(alerts || []).map((x) => ({ id: x?.id, title: x?.title || "Problem", severity: (x?.severity || "CRITICAL").toUpperCase(), occurrences: Number(x?.incident_count || 0), impact: x?.severity === "critical" ? "P1" : "P2", time: x?.last_seen ? new Date(x.last_seen).toLocaleString() : "—", affected: Number(x?.affected_services || 1) })),
    ...(logs   || []).map((x) => ({ title: x?.source || "Log pattern", severity: "WARN", occurrences: Number(x?.occurrences || 0), impact: "P3", time: x?.last_seen ? new Date(x.last_seen).toLocaleString() : "—", affected: 1 })),
  ].slice(0, 8), [logs, alerts]);
  const critCount = items.filter((i) => i.severity === "CRITICAL" || i.severity === "ERROR").length;
  const warnCount = items.filter((i) => i.severity === "WARN" || i.severity === "WARNING").length;
  const cardBg   = isDarkMode ? "bg-[#1A1D26] border-[#252A38]"    : "bg-white border-slate-200 shadow-sm";
  const hdrBdr   = isDarkMode ? "border-[#252A38]"                  : "border-slate-200";
  const colHdr   = isDarkMode ? "border-[#252A38] bg-[#111318] text-[#56657A]" : "border-slate-100 bg-slate-50 text-slate-400";
  const rowHover = isDarkMode ? "border-[#1E2130] hover:bg-[#1E2130]" : "border-slate-100/80 hover:bg-slate-50";
  const footerBg = isDarkMode ? "border-[#252A38] bg-[#111318]"    : "border-slate-100 bg-slate-50";
  const textPri  = isDarkMode ? "text-[#E2E8F4]"  : "text-slate-800";
  const textMut  = isDarkMode ? "text-[#56657A]"  : "text-slate-400";
  const textStat = isDarkMode ? "text-[#A8B4C8]"  : "text-slate-600";
  const secIcon  = isDarkMode ? "text-[#56657A]"  : "text-slate-400";
  const metaBadge= isDarkMode ? "bg-[#252A38] text-[#7A8FA8]" : "bg-slate-100 text-slate-500";
  return (
    <div className={`border rounded-2xl overflow-hidden flex flex-col h-full max-h-[480px] ${cardBg}`}>
      <div className={`px-5 py-3.5 border-b ${hdrBdr} flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-red-500/10" : "bg-red-50"}`}><Flame size={15} className="text-red-500" /></div>
          <div>
            <div className="flex items-center gap-2"><span className={`font-semibold text-[14px] ${textPri}`}>Error Hotspots</span><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isDarkMode ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"}`}>{items.length}</span></div>
            <p className={`text-[10px] mt-0.5 ${textMut}`}>Correlated problems &amp; active incidents</p>
          </div>
        </div>
      </div>
      <div className={`grid grid-cols-[1fr_auto_auto] px-5 py-2 border-b text-[10px] font-semibold uppercase tracking-wider shrink-0 ${colHdr}`}>
        <span>Problem</span><span className="w-[50px] text-center">Priority</span><span className="w-[60px] text-center">Affected</span>
      </div>
      <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(100,116,139,0.25) transparent" }}>
        {items.length ? items.map((item, idx) => (
          <div key={idx} onClick={() => onItemClick && onItemClick(item)} className={`grid grid-cols-[1fr_auto_auto] px-5 py-3 border-b last:border-0 items-start cursor-pointer transition-all ${rowHover}`}>
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${item.severity === "CRITICAL" || item.severity === "ERROR" ? "bg-red-500/15 text-red-500 border border-red-500/20" : "bg-amber-500/15 text-amber-600 border border-amber-500/20"}`}>{item.severity}</span>
                <span className={`text-[10px] ${textMut}`}>{item.time}</span>
              </div>
              <p className={`text-[12px] font-medium leading-tight line-clamp-2 ${textPri}`}>{item.title}</p>
              <p className={`text-[10px] mt-1 tabular-nums ${textMut}`}>{item.occurrences} {item.occurrences === 1 ? "occurrence" : "occurrences"}</p>
            </div>
            <div className="w-[50px] flex justify-center pt-1"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.impact === "P1" ? "bg-red-500/15 text-red-500" : item.impact === "P2" ? "bg-amber-500/15 text-amber-600" : metaBadge}`}>{item.impact}</span></div>
            <div className="w-[60px] flex justify-center pt-1"><span className={`flex items-center gap-1 text-[11px] font-semibold ${textStat}`}><Server size={10} className={secIcon} />{item.affected}</span></div>
          </div>
        )) : <div className={`px-5 py-8 text-sm ${textMut}`}>No hotspots found for this time range.</div>}
      </div>
      <div className={`px-5 py-2.5 border-t flex items-center justify-between shrink-0 ${footerBg}`}>
        <span className={`text-[10px] ${textMut}`}>{critCount} critical &bull; {warnCount} warnings</span>
        <button onClick={onAnalyze} className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600">Root Cause Analysis <ArrowRight size={11} /></button>
      </div>
    </div>
  );
}

// ── CustomerExperienceCard ─────────────────────────────────────────────────────
function CustomerExperienceCard({ title, mode = "web", cxData, rumData, sparkTimeRange, onClick, isDarkMode }) {
  const cxBlock = cxData || {};
  const rum     = rumData || {};
  const apps    = Array.isArray(cxBlock?.apps) ? cxBlock.apps : [];
  const isWeb   = mode === "web";              // ← moved up here, first thing
  const sat       = cxBlock?.satisfaction_pct ?? null;
  const churn     = cxBlock?.churn_pct        ?? null;
  const crash     = cxBlock?.crash_pct        ?? null;
  const secondary = isWeb ? churn : crash;     // now isWeb is already defined
  const avgRespMs = cxBlock?.avg_response_ms  ?? cxBlock?.avg_resp_ms ?? null;
  const sessions  = Number(cxBlock?.sessions  ?? rum?.sessions   ?? 0);
  const pageviews = Number(cxBlock?.pageviews ?? rum?.pageviews  ?? 0);
  const rumErrors = Number(cxBlock?.rum_errors ?? rum?.rum_errors ?? 0);
  const trendBlock = (cxBlock?.weekly?.series?.length ? cxBlock.weekly : null)
                  ?? (cxBlock?.hourly?.series?.length ? cxBlock.hourly : null)
                  ?? cxBlock?.weekly ?? cxBlock?.hourly ?? {};
  const labels    = Array.isArray(trendBlock.labels) ? trendBlock.labels : [];
  const seriesArr = Array.isArray(trendBlock.series) ? trendBlock.series : [];
  const s1 = seriesArr[0], s2 = seriesArr[1];
  const strokePrimary = isWeb ? "#E1057C" : "#10B981";
  const strokeSecond  = isWeb ? "#0089ED" : "#F43F5E";
  const legendPrimary = s1?.name || "Healthy";
  const legendSecond  = s2?.name || (isWeb ? "Churn" : "Crashes");
  const gradHealthy   = isWeb ? "webHealthyGrad" : "mobHealthyGrad";
  const gradSecond    = isWeb ? "webChurnGrad"   : "mobCrashGrad";
  // ... rest unchanged (delete the old `const isWeb = mode === "web";` line further down)
  const fmtLabel = (ts) => {
    if (!ts) return "";
    try { const d = new Date(ts); if (!isNaN(d.getTime())) return d.toLocaleDateString(undefined, { weekday: "short" }); } catch {}
    return String(ts);
  };
  const chartData = useMemo(() => {
    const len = Math.max(labels.length, s1?.values?.length ?? 0);
    if (!len) return [];
    return Array.from({ length: len }, (_, i) => ({
      label: fmtLabel(labels[i]) || `T${i}`,
      v1: s1?.values?.[i] != null ? Number(s1.values[i]) : null,
      v2: s2?.values?.[i] != null ? Number(s2.values[i]) : null,
      ts: labels[i] ?? null,
    }));
  }, [labels, s1, s2]);
  const dm        = isDarkMode;
  const cardBg    = dm ? "bg-[#1A1D26] border-[#252A38]" : "bg-white border-slate-200 shadow-sm";
  const hdrBdr    = dm ? "border-[#252A38]" : "border-slate-200";
  const kpiBdr    = dm ? "border-[#252A38]" : "border-slate-100";
  const textPri   = dm ? "text-[#E2E8F4]"  : "text-slate-800";
  const textSub   = dm ? "text-[#56657A]"  : "text-slate-400";
  const textKpi   = dm ? "text-[#E2E8F4]"  : "text-slate-700";
  const footerBg  = dm ? "border-[#252A38] bg-[#111318] hover:bg-[#1E2130]" : "border-slate-100 bg-slate-50 hover:bg-slate-100";
  const gridColor = dm ? "#252A38" : "#f1f5f9";
  const axisColor = dm ? "#56657A" : "#94a3b8";
  return (
    <div className={`border rounded-2xl overflow-hidden flex flex-col cursor-pointer ${cardBg}`} onClick={onClick}>
      <div className={`px-5 py-3.5 border-b ${hdrBdr} flex items-center justify-between gap-2 shrink-0`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-red-500/20 to-purple-600/20">
            {isWeb ? <Monitor size={16} className="text-red-500" /> : <Smartphone size={16} className="text-purple-500" />}
          </div>
          <span className="font-['Exo_2',sans-serif] font-bold text-[14px] bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-purple-600">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${sat != null && sat >= 90 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : sat != null && sat >= 70 ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sat != null && sat >= 90 ? "bg-emerald-500" : sat != null && sat >= 70 ? "bg-amber-500" : "bg-red-500"} animate-pulse`} />
            {sat == null ? "No Data" : sat >= 90 ? "Healthy" : sat >= 70 ? "Watch" : "At Risk"}
          </span>
          <span className={`text-[10px] font-medium tabular-nums ${textSub}`}>{Number(cxBlock?.app_count ?? apps.length ?? 0)} Apps</span>
        </div>
      </div>
      <div className={`grid grid-cols-3 gap-0 border-b ${hdrBdr} shrink-0`}>
        <div className={`px-4 py-3 border-r ${kpiBdr}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${textKpi}`}>Satisfaction</p>
          <p className={`text-[22px] font-bold font-['Exo_2',sans-serif] leading-none tabular-nums mt-1.5 ${sat == null ? textSub : "text-emerald-500"}`}>{sat == null ? "—" : `${fmt.num(sat, 1)}%`}</p>
        </div>
        <div className={`px-4 py-3 border-r ${kpiBdr}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${textKpi}`}>{isWeb ? "Churn Rate" : "Crash Rate"}</p>
           <p className={`text-[22px] font-bold font-['Exo_2',sans-serif] leading-none tabular-nums mt-1.5 ${secondary == null ? textSub : "text-amber-500"}`}>{secondary == null ? "—" : `${fmt.num(secondary, 1)}%`}</p>
        </div>
        <div className="px-4 py-3">
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${textKpi}`}>Avg Response</p>
          <p className={`text-[22px] font-bold font-['Exo_2',sans-serif] leading-none tabular-nums mt-1.5 ${avgRespMs == null ? textSub : textPri}`}>{avgRespMs == null ? "—" : `${fmt.num(avgRespMs, 0)} ms`}</p>
        </div>
      </div>
      <div className={`grid grid-cols-3 gap-0 border-b ${hdrBdr} shrink-0`}>
        <div className={`px-4 py-2.5 border-r ${kpiBdr}`}>
          <p className={`text-[9px] font-semibold uppercase tracking-wider ${textSub}`}>{isWeb ? "Pageviews" : "Sessions"}</p>
          <p className={`text-[14px] font-bold font-['Exo_2',sans-serif] tabular-nums ${textPri} mt-0.5`}>{(isWeb ? pageviews : sessions).toLocaleString()}</p>
        </div>
        <div className={`px-4 py-2.5 border-r ${kpiBdr}`}>
          <p className={`text-[9px] font-semibold uppercase tracking-wider ${textSub}`}>RUM Errors</p>
          <p className={`text-[14px] font-bold font-['Exo_2',sans-serif] tabular-nums ${rumErrors > 0 ? "text-red-400" : textPri} mt-0.5`}>{rumErrors.toLocaleString()}</p>
        </div>
        <div className="px-4 py-2.5">
          <p className={`text-[9px] font-semibold uppercase tracking-wider ${textSub}`}>RUNNING Apps</p>
          <div className="flex flex-col gap-0.5 mt-0.5">
            {apps.length ? apps.slice(0, 2).map((a, i) => (
              <div key={i} className="flex items-center gap-1 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === 0 ? "bg-amber-400" : "bg-violet-400"}`} />
                <span className={`text-[10px] truncate ${textSub}`}>{a.name}</span>
                <span className={`text-[10px] font-semibold tabular-nums ml-auto shrink-0 ${textPri}`}>{(a.avg_resp_ms ?? a.avg_response_ms) != null ? `${fmt.num(a.avg_resp_ms ?? a.avg_response_ms, 0)}ms` : "—"}</span>
              </div>
            )) : <span className={`text-[11px] ${textSub}`}>No apps</span>}
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col px-5 py-3 min-h-0">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${textSub}`}>Weekly Performance</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-[2px] rounded-full" style={{ backgroundColor: strokePrimary }} />
              <span className={`text-[10px] font-medium ${textSub}`}>{legendPrimary}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-[2px] rounded-full" style={{ backgroundColor: strokeSecond }} />
              <span className={`text-[10px] font-medium ${textSub}`}>{legendSecond}</span>
            </div>
          </div>
        </div>
        <div className="flex-1 w-full" style={{ minHeight: 180, overflow: "visible" }}>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 5, left: -10 }}>
                <defs>
                  <linearGradient id={gradHealthy} x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={strokePrimary} stopOpacity={0.18} /><stop offset="95%" stopColor={strokePrimary} stopOpacity={0} /></linearGradient>
                  <linearGradient id={gradSecond}  x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={strokeSecond}  stopOpacity={0.18} /><stop offset="95%" stopColor={strokeSecond}  stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: axisColor }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <Tooltip
                  wrapperStyle={{ zIndex: 9999, pointerEvents: "none", transform: "translateY(calc(-100% - 12px))" }}
                  cursor={{ stroke: dm ? "#7A8FA8" : "#cbd5e1", strokeOpacity: 0.5, strokeWidth: 1, strokeDasharray: "3 2" }}
                  content={({ active, payload, label: lbl }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div style={{ background: dm ? "#0F1117" : "#fff", border: `1px solid ${dm ? "#252A38" : "#e2e8f0"}`, borderRadius: 10, overflow: "hidden", minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.35)", pointerEvents: "none" }}>
                        <div style={{ height: 3, background: `linear-gradient(90deg, ${strokePrimary}, ${strokeSecond})` }} />
                        <div style={{ padding: "7px 11px" }}>
                          <p style={{ color: dm ? "#7A8FA8" : "#94a3b8", fontSize: 10, marginBottom: 5, fontWeight: 600 }}>{lbl}</p>
                          {payload.map((pt, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: i < payload.length - 1 ? 3 : 0 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: pt.color, flexShrink: 0 }} />
                              <span style={{ color: dm ? "#7A8FA8" : "#94a3b8", fontSize: 10, flex: 1 }}>{pt.dataKey === "v1" ? legendPrimary : legendSecond}</span>
                              <span style={{ color: pt.color, fontSize: 11, fontWeight: 700, fontFamily: "'Exo 2',sans-serif" }}>{pt.value != null ? `${Number(pt.value).toFixed(1)}%` : "—"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                />
                {s1 && <Area type="monotone" dataKey="v1" stroke={strokePrimary} strokeWidth={2.5} fill={`url(#${gradHealthy})`} fillOpacity={1} dot={false} activeDot={{ r: 4, fill: strokePrimary, strokeWidth: 2, stroke: dm ? "#1A1D26" : "#fff" }} isAnimationActive={false} connectNulls />}
                {s2 && <Area type="monotone" dataKey="v2" stroke={strokeSecond}  strokeWidth={2.5} fill={`url(#${gradSecond})`}  fillOpacity={1} dot={false} activeDot={{ r: 4, fill: strokeSecond,  strokeWidth: 2, stroke: dm ? "#1A1D26" : "#fff" }} isAnimationActive={false} connectNulls />}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className={`flex items-center justify-center h-full text-[12px] ${textSub}`}>No series data available</div>
          )}
        </div>
      </div>
      <div className={`px-5 py-2.5 border-t flex items-center justify-between cursor-pointer group transition-colors shrink-0 ${footerBg}`}>
        <span className="text-[12px] font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#667085] to-[#3d67fc]">View Customer Experience Dashboard</span>
        <ArrowRight size={14} className={`transition-transform group-hover:translate-x-0.5 ${dm ? "text-[#56657A]" : "text-slate-400"}`} />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TenantEnterpriseOverview() {
  const nav = useNavigate();
  const { tenantSlug } = useParams();
  const { token, user } = useAuth();
  const { queryParams, label } = useTimeRange();
  const { isDarkMode, askOpen = false, setAskOpen = () => {}, onQuickActions = () => {} } = useOutletContext() || {};
  const dm = !!isDarkMode;

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangeOpen, setRangeOpen] = useState(false);

  // True only for the very first fetch (no data yet). Subsequent refreshes
  // keep showing the last-known data while `loading` is true, so cards and
  // the health bar don't blank out or flash skeletons on every refresh —
  // only on first mount / when there's genuinely nothing to show yet.
  const isInitialLoad = loading && !data;

  const qpFrom = queryParams?.from_ts ?? queryParams?.from ?? "";
  const qpTo   = queryParams?.to_ts   ?? queryParams?.to   ?? "";

  const tenantId = user?.tenant_id     ?? "";
  const envId    = user?.environment_id ?? "";

  const headers = useMemo(() => {
    const h = {};
    if (token)    h.Authorization            = `Bearer ${token}`;
    if (tenantId) h["X-Edge-Tenant-Id"]      = String(tenantId);
    if (envId)    h["X-Edge-Environment-Id"] = String(envId);
    return h;
  }, [token, tenantId, envId]);

  const loadAbortRef = useRef(null);

  const load = useCallback(async () => {
    if (!token) return;

    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    try {
      const rangeParams = {};
      if (qpFrom) rangeParams.from_ts = qpFrom;
      if (qpTo)   rangeParams.to_ts   = qpTo;
      //comment out console .log
      ("[TenantEnterpriseOverview] API request:", {
        url: "/overview/enterprise",
        params: { ...rangeParams, include_service_last_seen: true, include_sparklines: true, bucket_minutes: 5 },
        headers,
      });
      const res = await apiClient.get("/overview/enterprise", {
        params: { ...rangeParams, include_service_last_seen: true, include_sparklines: true, bucket_minutes: 5 },
        headers,
        signal,
      });

      if (signal.aborted) return;

      setData(res.data);
      //tODO: Temporary, remove after debugging
     // console.log("[TenantEnterpriseOverview] API response:", res.data);
     // console.log("[overview] golden_signals:", res.data?.golden_signals);
     // console.log("[overview] services_top:", res.data?.services_top);
     // console.log("[overview] sparklines:", res.data?.sparklines);
    } catch (e) {
      if (signal.aborted || e?.name === "AbortError" || e?.name === "CanceledError" || e?.message === "canceled") return;
      setData({ __error: true, message: "Overview data temporarily unavailable." });
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [token, qpFrom, qpTo, headers]);

  useEffect(() => {
    load();
    return () => loadAbortRef.current?.abort();
  }, [load]);

  const health      = data?.health           || {};
  const golden      = data?.golden_signals   || {};
  const infra       = data?.infra            || {};
  const servicesTop = Array.isArray(data?.services_top) ? data.services_top : [];
  const hotspots    = data?.error_hotspots   || { logs: [], alerts: [] };
  const sparklines  = data?.sparklines       || null;
  const synthetic    = data?.synthetic || {};
  const syntheticArr = Array.isArray(synthetic?.monitors) ? synthetic.monitors : [];
  const hostsAlive = Number(infra?.hosts_alive ?? 0);
  const hostsTotal = Number(infra?.hosts_total ?? hostsAlive);
  const hostsDown  = Math.max(0, hostsTotal - hostsAlive);
  const hostFleet  = Array.isArray(data?.infra?.hosts) ? data.infra.hosts : [];

  const rum      = data?.rum || {};
  const cxRoot   = data?.customer_experience || {};
  const cxWeb    = cxRoot.web_app || cxRoot.web || {};
  const cxMobile = cxRoot.mobile_app || cxRoot.mobile || {};

  // useDeepMemo keeps these arrays referentially stable across polls/renders
  // unless their actual contents changed, which is what stops the KPI charts
  // from redrawing themselves on every unrelated re-render.
  const seriesTraffic = useDeepMemo(sparklines?.traffic_rps    || []);
  const seriesErrRate = useDeepMemo(sparklines?.error_rate_pct || []);
  const seriesP95     = useDeepMemo(sparklines?.latency_p95_ms || []);
  const seriesCpu     = useDeepMemo(sparklines?.cpu_avg        || []);
  const seriesMem     = useDeepMemo(sparklines?.mem_avg        || []);

  const sparkTimeRange = useMemo(() => ({
    from: qpFrom || null,
    to:   qpTo   || null,
  }), [qpFrom, qpTo]);

  const critCount = Number(health?.critical_open || 0);
  const warnCount = Number(health?.warning_open   || 0);
  const healthStatus = health?.status || null;
  const satCpu    = infra?.cpu_avg != null ? Number(infra.cpu_avg) : null;
  const satMem    = infra?.mem_avg != null ? Number(infra.mem_avg) : null;

  const toRechartsData = (arr) =>
    (Array.isArray(arr) ? arr : []).map((p, i) => ({
      name: `p${i}`,
      value: p?.value != null ? Number(p.value) : 0,
      ts: p?.ts ?? p?.t ?? p?.timestamp ?? null,
    }));

  const seriesTrend = (arr) => {
    const pts = (Array.isArray(arr) ? arr : []).filter(p => p?.value != null);
    if (pts.length < 2) return null;
    const first = Number(pts[0].value), last = Number(pts[pts.length - 1].value);
    const pct = first === 0 ? (last === 0 ? 0 : 100) : ((last - first) / Math.abs(first)) * 100;
    return { pct, dir: pct > 0 ? "up" : "down", label: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` };
  };

  const seriesStats = (arr) => {
    const vals = (Array.isArray(arr) ? arr : []).map(p => Number(p?.value)).filter(v => !isNaN(v));
    if (!vals.length) return null;
    return { min: Math.min(...vals), max: Math.max(...vals), avg: vals.reduce((a, b) => a + b, 0) / vals.length };
  };

  const infraBars = [
    { name: "CPU",     value: infra?.cpu_avg  != null ? Number(Number(infra.cpu_avg).toFixed(2))  : null, color: "#3b82f6" },
    { name: "Memory",  value: infra?.mem_avg  != null ? Number(Number(infra.mem_avg).toFixed(2))  : null, color: "#8b5cf6" },
    { name: "Disk",    value: infra?.disk_avg != null ? Number(Number(infra.disk_avg).toFixed(2)) : null, color: "#f59e0b" },
    { name: "Network", value: infra?.net_avg  != null ? Number(Number(infra.net_avg).toFixed(2))  : null, color: "#10b981" },
  ];

  const infraTrend = useDeepMemo(toRechartsData(sparklines?.metric_ingestion || sparklines?.cpu_avg || []).slice(-5));

  const synthSparkline = useDeepMemo(useMemo(() => {
    const raw = synthetic?.sparkline ?? synthetic?.latency_trend ?? [];
    return (Array.isArray(raw) ? raw : []).map((v, i) => ({ name: `p${i}`, value: Number(v), ts: null }));
  }, [synthetic]));

  const trendTraffic = seriesTrend(seriesTraffic);
  const trendErrRate = seriesTrend(seriesErrRate);
  const trendP95     = seriesTrend(seriesP95);
  const trendCpu     = seriesTrend(seriesCpu);
  const trendMem     = seriesTrend(seriesMem);

  const statsTraffic = seriesStats(seriesTraffic);
  const statsErrRate = seriesStats(seriesErrRate);
  const statsP95     = seriesStats(seriesP95);

  const cpuPct = satCpu;
  const memPct = satMem;

  const scalePct = (arr) =>
    (Array.isArray(arr) ? arr : []).map(p => ({ ...p, value: p?.value != null ? Number(p.value) : 0 }));
  const seriesCpuPct = scalePct(seriesCpu);
  const seriesMemPct = scalePct(seriesMem);
  const statsCpuPct = seriesStats(seriesCpuPct);
  const statsMemPct = seriesStats(seriesMemPct);

  // Stable chart-ready arrays: same reference in/out unless the underlying
  // series actually changed (see useDeepMemo). Passed straight into the
  // KPI sparklines below.
  const trafficChartData    = useDeepMemo(toRechartsData(seriesTraffic));
  const errorChartData      = useDeepMemo(toRechartsData(seriesErrRate));
  const latencyChartData    = useDeepMemo(toRechartsData(seriesP95));
  const saturationChartData = useDeepMemo(toRechartsData(seriesCpuPct));

  const trendSat = (() => {
    const a = trendCpu?.pct, b = trendMem?.pct;
    if (a == null && b == null) return null;
    const avg = a != null && b != null ? (a + b) / 2 : (a ?? b);
    return { pct: avg, label: `${avg >= 0 ? "+" : ""}${avg.toFixed(1)}%` };
  })();

  const KPI_DEFS = [
    {
      title: "Traffic", sub: "Requests Per Second",
      value: golden?.traffic_rps != null ? `${fmt.num(golden.traffic_rps, 3)} rps` : "—",
      change: trendTraffic?.label ?? "—", changeDir: trendTraffic ? (trendTraffic.pct > 0 ? "up" : "down") : "down",
      accentHex: "#22c55e", Icon: Zap, data: trafficChartData, gradientId: "grad-traffic",
      clickLabel: "View Traces", statusDot: "#5BB140",
      tooltipMeta: [
        { label: "Current", value: golden?.traffic_rps != null ? `${fmt.num(golden.traffic_rps, 3)} rps` : "—" },
        statsTraffic ? { label: "Peak", value: `${fmt.num(statsTraffic.max, 3)} rps` } : null,
        statsTraffic ? { label: "Avg",  value: `${fmt.num(statsTraffic.avg, 3)} rps` } : null,
        statsTraffic ? { label: "Min",  value: `${fmt.num(statsTraffic.min, 3)} rps` } : null,
      ].filter(Boolean),
      tooltipFormatter: (v) => `${fmt.num(v, 3)} rps`,
      fn: () => nav(`/tenant/${tenantSlug}/traces`),
    },
    {
      title: "Errors", sub: "Error Rate",
      value: golden?.error_rate_pct != null ? fmt.pct(golden.error_rate_pct, 2) : "—",
      change: trendErrRate?.label ?? "—", changeDir: trendErrRate ? (trendErrRate.pct > 0 ? "up" : "down") : "up",
      accentHex: "#ef4444", Icon: AlertCircle, data: errorChartData, gradientId: "grad-errors",
      clickLabel: "View Problems", statusDot: (golden?.error_rate_pct ?? 0) > 30 ? "#FF7979" : "#5BB140",
      tooltipMeta: [
        { label: "Current", value: golden?.error_rate_pct != null ? fmt.pct(golden.error_rate_pct, 2) : "—" },
        statsErrRate ? { label: "Peak", value: fmt.pct(statsErrRate.max, 2) } : null,
        statsErrRate ? { label: "Avg",  value: fmt.pct(statsErrRate.avg, 2) } : null,
        statsErrRate ? { label: "Min",  value: fmt.pct(statsErrRate.min, 2) } : null,
      ].filter(Boolean),
      tooltipFormatter: (v) => fmt.pct(v, 2),
      fn: () => nav(`/tenant/${tenantSlug}/problems`),
    },
    {
      title: "Latency", sub: "Response Time (P95)",
      value: golden?.latency_p95_ms != null ? `${fmt.num(golden.latency_p95_ms, 0)} ms` : "—",
      change: trendP95?.label ?? "—", changeDir: trendP95 ? (trendP95.pct > 0 ? "up" : "down") : "up",
      accentHex: "#8b5cf6", Icon: Clock, data: latencyChartData, gradientId: "grad-latency",
      clickLabel: "View Services",
      statusDot: (golden?.latency_p95_ms ?? 0) > 500 ? "#FF7979" : (golden?.latency_p95_ms ?? 0) > 300 ? "#f59e0b" : "#5BB140",
      tooltipMeta: [
        { label: "P95 (now)",      value: golden?.latency_p95_ms != null ? `${fmt.num(golden.latency_p95_ms, 0)} ms` : "—" },
        statsP95 ? { label: "Peak in range", value: `${fmt.num(statsP95.max, 0)} ms` } : null,
        statsP95 ? { label: "Avg in range",  value: `${fmt.num(statsP95.avg, 0)} ms` } : null,
        statsP95 ? { label: "Min in range",  value: `${fmt.num(statsP95.min, 0)} ms` } : null,
      ].filter(Boolean),
      tooltipFormatter: (v) => `${fmt.num(v, 0)} ms`,
      fn: () => nav(`/tenant/${tenantSlug}/apps/services`),
    },
    {
      title: "Saturation", sub: "Avg CPU / Memory",
      value: cpuPct != null || memPct != null ? `${fmt.num(cpuPct, 2)} / ${fmt.num(memPct, 2)}%` : "—",
      change: trendSat?.label ?? "—", changeDir: trendSat ? (trendSat.pct > 0 ? "up" : "down") : "up",
      accentHex: "#3b82f6", Icon: Gauge, data: saturationChartData, gradientId: "grad-saturation",
      clickLabel: "View Infra", statusDot: "#4FB9F5", compact: true,
      tooltipMeta: [
        cpuPct  != null ? { label: "CPU Avg",     value: `${fmt.num(cpuPct, 2)}%`  } : null,
        memPct  != null ? { label: "Memory Avg",  value: `${fmt.num(memPct, 2)}%`  } : null,
        statsCpuPct ? { label: "CPU Peak",    value: `${fmt.num(statsCpuPct.max, 2)}%` } : null,
        statsCpuPct ? { label: "CPU Min",     value: `${fmt.num(statsCpuPct.min, 2)}%` } : null,
        statsMemPct ? { label: "Memory Peak", value: `${fmt.num(statsMemPct.max, 2)}%` } : null,
        statsMemPct ? { label: "Memory Min",  value: `${fmt.num(statsMemPct.min, 2)}%` } : null,
        infra?.hosts_alive != null ? { label: "Hosts alive", value: `${fmt.int(infra.hosts_alive)} / ${fmt.int(infra.hosts_total ?? infra.hosts_alive)}` } : null,
        infra?.metric_points != null ? { label: "Metric points", value: fmt.int(infra.metric_points) } : null,
      ].filter(Boolean),
      tooltipFormatter: (v) => `${fmt.num(v, 2)}%`,
      fn: () => nav(`/tenant/${tenantSlug}/infrastructure`),
    },
  ].map((d) => ({ ...d, data: d.data.length >= 2 ? d.data : EMPTY_SPARK_FALLBACK }));

  const divider    = dm ? "bg-[#252A38]"  : "bg-slate-200";
  const textPri    = dm ? "text-[#E2E8F4]" : "text-slate-800";
  const textSec    = dm ? "text-[#7A8FA8]" : "text-slate-500";
  const textMut    = dm ? "text-[#56657A]" : "text-slate-400";
  const btnBorder  = dm ? "border-[#252A38]"  : "border-slate-200";
  const btnBg      = dm ? "bg-[#1E2130] hover:bg-[#252A38]" : "bg-white hover:bg-slate-50";
  const kpiBorder  = dm ? "border-[#252A38]"  : "border-slate-200";
  const kpiBg      = dm ? "bg-[#1A1D26]/80 backdrop-blur-xl" : "bg-white";
  const cardFooter = dm ? "border-[#252A38] bg-[#111318]" : "border-slate-100 bg-slate-50";
  const colHdrCls  = dm ? "border-[#252A38] bg-[#111318] text-[#56657A]" : "border-slate-100 bg-slate-50 text-slate-400";
  const synthRowBorder = dm ? "border-[#1E2130] hover:bg-[#1E2130]" : "border-slate-100 hover:bg-slate-50";
  const infraBarBg = dm ? "bg-[#252A38]" : "bg-slate-200";
  const iconFill = dm ? "#E2E8F4" : "#334155";

  return (
    <div className="flex flex-col gap-4 w-full">

      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="grad-traffic"    x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} /></linearGradient>
          <linearGradient id="grad-errors"     x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} /></linearGradient>
          <linearGradient id="grad-latency"    x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} /></linearGradient>
          <linearGradient id="grad-saturation" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} /></linearGradient>
          <linearGradient id="webHealthyGrad"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%"  stopColor="#E1057C" stopOpacity={0.15}/><stop offset="100%" stopColor="#E1057C" stopOpacity={0.01} /></linearGradient>
          <linearGradient id="webChurnGrad"    x1="0" y1="0" x2="0" y2="1"><stop offset="0%"  stopColor="#0089ED" stopOpacity={0.15}/><stop offset="100%" stopColor="#0089ED" stopOpacity={0.01} /></linearGradient>
          <linearGradient id="mobHealthyGrad"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%"  stopColor="#10B981" stopOpacity={0.15}/><stop offset="100%" stopColor="#10B981" stopOpacity={0.01} /></linearGradient>
          <linearGradient id="mobCrashGrad"    x1="0" y1="0" x2="0" y2="1"><stop offset="0%"  stopColor="#F43F5E" stopOpacity={0.15}/><stop offset="100%" stopColor="#F43F5E" stopOpacity={0.01} /></linearGradient>
          <linearGradient id="synthUptimeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} /></linearGradient>
        </defs>
      </svg>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 13.5 13.5" fill="none">
              <path d="M12 4.5897e-07C12.8284 4.95181e-07 13.5 0.671573 13.5 1.5V4.5C13.5 5.32843 12.8284 6 12 6L1.5 6C0.671572 6 -3.62117e-08 5.32843 0 4.5L1.31134e-07 1.5C1.67346e-07 0.671573 0.671572 -3.62117e-08 1.5 0L12 4.5897e-07ZM12 4.5V1.5L1.5 1.5L1.5 4.5L12 4.5Z" fill={iconFill} />
              <path d="M12 7.5C12.8284 7.5 13.5 8.17157 13.5 9V12C13.5 12.8284 12.8284 13.5 12 13.5H1.5C0.671572 13.5 -3.62117e-08 12.8284 0 12L1.31134e-07 9C1.67346e-07 8.17157 0.671572 7.5 1.5 7.5L12 7.5ZM12 12V9L1.5 9L1.5 12H12Z" fill={iconFill} />
            </svg>
            <span className={`font-['Exo_2',sans-serif] font-bold text-[15px] ${textPri}`}>Tenant Overview</span>
            {healthStatus === "CRITICAL" && <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[9px] font-['Exo_2',sans-serif] font-bold border border-red-500/20 tabular-nums">Critical ({critCount})</span>}
            {healthStatus === "DEGRADED" && <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-['Exo_2',sans-serif] font-bold border border-amber-500/20 tabular-nums">Degraded ({warnCount})</span>}
          </div>
          <p className={`font-['Exo_2',sans-serif] font-medium text-[11px] ml-[26px] ${textSec}`}>Executive health across services, infrastructure, logs, RUM &amp; synthetics.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[{ lbl: "View Problems", fn: () => nav(`/tenant/${tenantSlug}/problems`) }, { lbl: "Logs", fn: () => nav(`/tenant/${tenantSlug}/logs`) }, { lbl: "Traces", fn: () => nav(`/tenant/${tenantSlug}/traces`) }].map(({ lbl, fn }) => (
            <button key={lbl} onClick={fn} className={`font-['Exo_2',sans-serif] font-semibold text-[13px] cursor-pointer transition-colors ${dm ? "text-[#7A8FA8] hover:text-[#E2E8F4]" : "text-slate-400 hover:text-slate-700"}`}>{lbl}</button>
          ))}
          <button className={`flex items-center justify-center w-[28px] h-[26px] rounded-full border cursor-pointer transition-colors ${btnBorder} ${textMut} ${dm ? "hover:bg-[#1E2130]" : "hover:bg-slate-100"}`}><MoreHorizontal size={12} /></button>
          <button onClick={load} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-['Exo_2',sans-serif] font-semibold transition-colors border ${btnBorder} ${btnBg} ${textPri}`}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />Refresh
          </button>
        </div>
      </div>

      <div className={`h-px ${divider}`} />

      {/* ── Action Bar ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative">
          <button
            onClick={() => setRangeOpen((v) => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
              dm
                ? `border-[#252A38] hover:border-[#2A2F3E] hover:bg-[#1E2130] ${rangeOpen ? "bg-[#1E2130] border-[#2A2F3E]" : ""}`
                : `border-slate-200 hover:border-slate-300 hover:bg-slate-50 ${rangeOpen ? "bg-slate-50 border-slate-300" : ""}`
            }`}>
            <Clock size={13} className={dm ? "text-[#7A8FA8]" : "text-slate-500"} strokeWidth={1.8} />
            <span className={`font-['Inter',sans-serif] text-[12px] font-semibold ${dm ? "text-[#A8B4C8]" : "text-slate-700"}`}>{label || "Last 2 hours"}</span>
            <ChevronDown size={12} className={`transition-transform duration-200 ${rangeOpen ? "rotate-180" : ""} ${dm ? "text-[#56657A]" : "text-slate-400"}`} />
          </button>
          {rangeOpen && <DateRangeDropdown onClose={() => setRangeOpen(false)} isDarkMode={dm} />}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onQuickActions}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[12px] font-['Inter',sans-serif] font-semibold transition-all ${
              dm ? "border-[#252A38] text-[#A8B4C8] hover:bg-[#1E2130] hover:border-[#2A2F3E] hover:text-[#E2E8F4]" : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
            }`}>
            <Zap size={13} className={dm ? "text-amber-400" : "text-amber-500"} strokeWidth={1.8} />
            Quick Actions
          </button>
          <button onClick={() => setAskOpen(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-white text-[12px] font-['Plus_Jakarta_Sans',sans-serif] font-bold tracking-[-0.03px] bg-gradient-to-r from-orange-500 to-pink-600 hover:opacity-90 transition-opacity shadow-sm">
            <Sparkles size={13} />Overwatch
          </button>
        </div>
      </div>

      {/* ── Tenant Health Bar ── */}
      {/* Always mounted — it shows a skeleton while the first load is in
          flight and a neutral "Unavailable" state on error, but never
          disappears, so the page layout stays put. */}
      <TenantHealthBar
        health={health}
        servicesTop={servicesTop}
        hotspots={hotspots}
        onViewAnalytics={() => nav(`/tenant/${tenantSlug}/problems`)}
        isDarkMode={dm}
        loading={isInitialLoad}
        hasError={!!data?.__error}
      />

      {/* ── Row 1: KPI Cards ── */}
      <div className={`rounded-2xl border overflow-visible ${kpiBg} ${kpiBorder}`} style={{ isolation: "isolate" }}>
        <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-violet-400/40 to-blue-500/30" />
        <div className={`px-5 py-3 border-b ${kpiBorder} flex items-center justify-between gap-2`}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${dm ? "bg-emerald-500/10" : "bg-emerald-50"}`}><Zap size={12} className="text-emerald-500" /></div>
            <span className={`font-['Exo_2',sans-serif] font-semibold text-[13px] ${textPri}`}>Key Performance Indicators</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 ${dm ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
              <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" /></span>Live
            </span>
            {loading && !isInitialLoad && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 ${dm ? "bg-[#1E2130] text-[#7A8FA8]" : "bg-slate-100 text-slate-500"}`}>
                <RefreshCw size={9} className="animate-spin" />Refreshing
              </span>
            )}
          </div>
          <span className={`text-[10px] ${textMut}`}>Auto-refresh on demand · {label || "Last 2 hours"}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4">
          {KPI_DEFS.map((m, ci) => {
            const cellCls = `relative overflow-visible ${kpiBorder} ${ci < 2 ? "border-b md:border-b-0" : ""} ${ci % 2 === 0 ? "border-r" : ""} ${ci < 3 ? "md:border-r" : ""} ${ci === 1 ? "border-r-0 md:border-r" : ""}`;
            return (
              <div key={m.title} className={cellCls}>
                {isInitialLoad
                  ? <KpiSkeletonCard isDarkMode={dm} compact={m.compact} />
                  : <MetricCard {...m} onClick={m.fn} isDarkMode={dm} tooltipMeta={m.tooltipMeta} tooltipFormatter={m.tooltipFormatter} compact={m.compact} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Row 2: Top Services + Hotspots ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
        <div className="lg:col-span-3 flex flex-col"><ServicesTable rows={servicesTop} onViewAll={() => nav(`/tenant/${tenantSlug}/apps/services`)} isDarkMode={dm} /></div>
        <div className="lg:col-span-2 flex flex-col"><HotspotsCard logs={hotspots?.logs || []} alerts={hotspots?.alerts || []} onAnalyze={() => nav(`/tenant/${tenantSlug}/problems`)} onItemClick={(item) => item.id ? nav(`/tenant/${tenantSlug}/problems/${item.id}`) : nav(`/tenant/${tenantSlug}/problems`)} isDarkMode={dm} /></div>
      </div>

      {/* ── Row 3: Customer Experience ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CustomerExperienceCard title="Customer Experience (Web)"    mode="web"    cxData={cxWeb}    rumData={rum} sparkTimeRange={sparkTimeRange} onClick={() => nav(`/tenant/${tenantSlug}/rum`)} isDarkMode={dm} />
        <CustomerExperienceCard title="Customer Experience (Mobile)" mode="mobile" cxData={cxMobile} rumData={rum} sparkTimeRange={sparkTimeRange} onClick={() => nav(`/tenant/${tenantSlug}/people/mobile-rum/apps`)} isDarkMode={dm} />
      </div>

      {/* ── Row 4: Synthetic + Infrastructure ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Synthetic Monitoring */}
        <div className={`border rounded-2xl overflow-hidden flex flex-col ${dm ? "bg-[#1A1D26] border-[#252A38]" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className={`px-5 py-3.5 border-b ${dm ? "border-[#252A38]" : "border-slate-200"} flex items-center justify-between gap-2 shrink-0`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dm ? "bg-cyan-500/10" : "bg-cyan-50"}`}>
                <Activity size={15} className={dm ? "text-cyan-400" : "text-cyan-600"} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-['Inter',sans-serif] font-semibold text-[14px] ${textPri}`}>Synthetic Monitoring</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${dm ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600"}`}>{Number(synthetic?.monitors_total ?? 0)}</span>
                </div>
                <p className={`text-[10px] mt-0.5 ${textMut}`}>Live synthetic checks across configured monitors</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {(() => {
                const raw = synthetic?.uptime_pct;
                if (raw == null) return null;
                const successPct = Number(raw).toFixed(1);
                const failPct    = (100 - Number(raw)).toFixed(1);
                return (<>
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tabular-nums ${dm ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{successPct}% Success
                  </span>
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tabular-nums ${dm ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-red-50 text-red-600 border border-red-200"}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{failPct}% Fail
                  </span>
                </>);
              })()}
            </div>
          </div>

          <div className={`grid grid-cols-[1fr_1fr_1.2fr] gap-0 border-b ${dm ? "border-[#252A38]" : "border-slate-100"}`}>
            <div className={`px-4 py-3 border-r ${dm ? "border-[#252A38]" : "border-slate-100"}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMut}`}>Checks (24h)</p>
              <div className="flex items-end gap-1.5 mt-1">
                <p className={`text-[22px] font-bold font-['Exo_2',sans-serif] leading-none tabular-nums ${textPri}`}>{Number(synthetic?.checks_total ?? 0).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {(() => {
                  const raw = synthetic?.uptime_pct;
                  if (raw == null) return <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${textMut}`}>No data</span>;
                  const sPct = Number(raw).toFixed(1);
                  const fPct = (100 - Number(raw)).toFixed(1);
                  return (<>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded tabular-nums ${dm ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>Success: {sPct}%</span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded tabular-nums ${dm ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"}`}>Fail: {fPct}%</span>
                  </>);
                })()}
              </div>
            </div>
            <div className={`px-4 py-3 border-r ${dm ? "border-[#252A38]" : "border-slate-100"}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMut}`}>Avg Uptime</p>
              {(() => {
                const raw = synthetic?.uptime_pct;
                if (raw == null) return (
                  <>
                    <p className={`text-[22px] font-bold font-['Exo_2',sans-serif] leading-none mt-1 ${textMut}`}>—</p>
                    <p className={`text-[10px] mt-1 ${textMut}`}>No data for this window</p>
                  </>
                );
                const avg = +(Number(raw)).toFixed(1);
                return (
                  <>
                    <p className={`text-[22px] font-bold font-['Exo_2',sans-serif] leading-none mt-1 tabular-nums ${avg >= 90 ? "text-emerald-500" : avg >= 70 ? "text-amber-500" : "text-red-500"}`}>{avg}%</p>
                    <p className={`text-[10px] mt-1 ${textMut}`}>Current window availability</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      {avg < 90 ? <TrendingDown size={10} className="text-red-500" /> : <TrendingUp size={10} className="text-emerald-500" />}
                      <span className={`text-[10px] font-semibold tabular-nums ${avg < 90 ? "text-red-500" : "text-emerald-500"}`}>
                        {avg < 90 ? "-" : "+"}{Math.abs(+(100 - avg).toFixed(1))}%
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="px-4 py-3">
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${textMut}`}>Avg Latency Trend</p>
              <div style={{ height: 56, overflow: "visible" }}>
                <ResponsiveContainer width="100%" height={56}>
                  <AreaChart data={synthSparkline} margin={{ top: 4, right: 4, bottom: 2, left: 4 }}>
                    <Tooltip
                      wrapperStyle={{ zIndex: 9999, pointerEvents: "none", transform: "translateY(calc(-100% - 12px))" }}
                      cursor={{ stroke: "#ef4444", strokeOpacity: 0.35, strokeWidth: 1, strokeDasharray: "3 3" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const val = payload[0]?.value;
                        const uptime = Number(synthetic?.uptime_pct ?? 0).toFixed(1);
                        const up = Number(synthetic?.up_count ?? 0);
                        const down = Number(synthetic?.down_count ?? 0);
                        const total = Number(synthetic?.monitors_total ?? 0);
                        const checks = Number(synthetic?.checks_total ?? 0);
                        return (
                          <div style={{ background: dm ? "#0D0F14" : "#fff", border: "1px solid #ef444430", borderRadius: 8, overflow: "hidden", minWidth: 158, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", pointerEvents: "none" }}>
                            <div style={{ height: 3, background: "linear-gradient(90deg, #ef4444, #ef444455)" }} />
                            <div style={{ padding: "7px 10px" }}>
                              <p style={{ color: dm ? "#7A8FA8" : "#94a3b8", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>Avg Latency</p>
                              <p style={{ color: "#ef4444", fontSize: 14, fontWeight: 800, fontFamily: "'Exo 2',sans-serif", lineHeight: 1, marginBottom: 6 }}>{val != null ? `${Number(val).toFixed(0)} ms` : "—"}</p>
                              <div style={{ display: "flex", flexDirection: "column", gap: 3, borderTop: `1px solid ${dm ? "#1E2130" : "#f1f5f9"}`, paddingTop: 5 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                  <span style={{ color: dm ? "#56657A" : "#94a3b8", fontSize: 10 }}>Uptime</span>
                                  <span style={{ color: Number(uptime) >= 90 ? "#10b981" : Number(uptime) >= 70 ? "#f59e0b" : "#ef4444", fontSize: 10, fontWeight: 700, fontFamily: "'Exo 2',sans-serif" }}>{uptime}%</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                  <span style={{ color: dm ? "#56657A" : "#94a3b8", fontSize: 10 }}>Monitors</span>
                                  <span style={{ color: dm ? "#A8B4C8" : "#334155", fontSize: 10, fontWeight: 700, fontFamily: "'Exo 2',sans-serif" }}><span style={{ color: "#10b981" }}>{up} up</span>{down > 0 ? <> · <span style={{ color: "#ef4444" }}>{down} down</span></> : ""} / {total}</span>
                                </div>
                                {checks > 0 && (
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                    <span style={{ color: dm ? "#56657A" : "#94a3b8", fontSize: 10 }}>Total checks</span>
                                    <span style={{ color: dm ? "#A8B4C8" : "#334155", fontSize: 10, fontWeight: 700, fontFamily: "'Exo 2',sans-serif" }}>{checks.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} fill="url(#synthUptimeGrad)" dot={false} activeDot={{ r: 5, fill: "#ef4444", strokeWidth: 2, stroke: dm ? "#1A1D26" : "#fff" }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(100,116,139,0.25) transparent", maxHeight: 200 }}>
            {syntheticArr.length > 0 ? syntheticArr.map((mon, i) => {
              const isUp   = ["up", "healthy", "active", "ok"].includes(String(mon.status ?? "").toLowerCase()) || (mon.status == null && Number(mon?.uptime_pct ?? 0) > 0);
              const latMs  = Number(mon?.latency_ms || mon?.latency || 0);
              const uptime = Number(mon?.uptime_pct || mon?.uptime || 0);
              const loc    = mon?.location || mon?.region || "—";
              const lastChk = mon?.last_check_sec ?? mon?.lastCheckSec;
              return (
                <div key={mon.monitor_id ?? i} className={`flex items-center gap-3 px-5 py-2.5 border-b last:border-0 cursor-pointer transition-all duration-150 group ${dm ? "border-[#1E2130] hover:bg-[#1E2130]" : "border-slate-100/80 hover:bg-indigo-50/20"}`}>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isUp ? (dm ? "bg-emerald-500/10" : "bg-emerald-50") : (dm ? "bg-red-500/10" : "bg-red-50")}`}>
                    {isUp ? <Wifi size={12} className="text-emerald-500" /> : <WifiOff size={12} className="text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-medium truncate ${textPri}`}>{mon?.name || mon?.monitor_name || "Monitor"}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MapPin size={9} className={textMut} />
                      <span className={`text-[10px] ${textMut}`}>{loc}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[11px] font-semibold tabular-nums ${latMs === 0 ? "text-red-500" : (dm ? "text-[#A8B4C8]" : "text-slate-700")}`}>
                      {latMs > 0 ? (latMs >= 1000 ? `${(latMs / 1000).toFixed(1)}s` : `${Math.round(latMs)}ms`) : "—"}
                    </p>
                    {lastChk != null && <p className={`text-[9px] mt-0.5 tabular-nums ${textMut}`}>{lastChk < 60 ? `${lastChk}s ago` : `${Math.floor(lastChk / 60)}m ago`}</p>}
                  </div>
                  <div className="w-[70px] shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold tabular-nums ${uptime >= 99 ? "text-emerald-500" : uptime >= 80 ? "text-amber-500" : "text-red-500"}`}>{uptime.toFixed(1)}%</span>
                    </div>
                    <div className={`h-1.5 rounded-full ${dm ? "bg-[#252A38]" : "bg-slate-200"}`}>
                      <div className={`h-full rounded-full transition-all ${uptime >= 99 ? "bg-emerald-500" : uptime >= 80 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${uptime}%` }} />
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className={`px-5 py-8 text-sm text-center ${textMut}`}>No monitor detail data available.</div>
            )}
          </div>

          <div className={`mt-auto border-t shrink-0 ${cardFooter}`}>
            <div className="px-5 py-2 flex items-center justify-between">
              <span className={`flex items-center gap-1.5 text-[10px] font-semibold tabular-nums ${Number(synthetic?.down_count ?? 0) > 0 ? "text-amber-500" : textMut}`}>
                <AlertTriangle size={10} />{Number(synthetic?.down_count ?? 0)} monitors need attention
              </span>
              <button onClick={() => nav(`/tenant/${tenantSlug}/synthetic`)} className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${dm ? "text-cyan-400 hover:bg-cyan-500/10" : "text-cyan-600 hover:bg-cyan-50"}`}>
                Explore All Monitors <ArrowRight size={11} />
              </button>
            </div>
          </div>
        </div>

        {/* Infrastructure Snapshot */}
        <div className={`border rounded-2xl overflow-hidden flex flex-col ${dm ? "bg-[#1A1D26] border-[#252A38]" : "bg-white border-slate-200 shadow-sm"}`}>
          <div className={`px-5 py-3.5 border-b ${dm ? "border-[#252A38]" : "border-slate-200"} flex items-center justify-between gap-2 shrink-0`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dm ? "bg-violet-500/10" : "bg-violet-50"}`}><Server size={15} className={dm ? "text-violet-400" : "text-violet-600"} /></div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-[14px] ${textPri}`}>Infrastructure Snapshot</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${dm ? "bg-violet-500/10 text-violet-400" : "bg-violet-50 text-violet-600"}`}>{hostsTotal || hostFleet.length || "—"}</span>
                </div>
                <p className={`text-[10px] mt-0.5 ${textMut}`}>Host fleet &amp; resource utilization.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tabular-nums bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{hostsAlive} Alive</span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tabular-nums bg-red-900/30 text-red-400 border border-red-800/40"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{hostsDown} Down</span>
            </div>
          </div>
          <div className={`grid grid-cols-[1fr_1.2fr] gap-0 border-b ${dm ? "border-[#1E2232]" : "border-slate-100"}`}>
            <div className={`px-5 py-4 border-r ${dm ? "border-[#1E2232]" : "border-slate-100"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-4 ${textMut}`}>Avg Utilization</p>
              <div className="flex flex-col gap-4">
                {infraBars.map((item) => {
                  const hasValue = item.value != null;
                  return (
                    <div key={item.name} className="flex items-center gap-2.5">
                      <span className={`text-[12px] font-medium w-[54px] shrink-0 ${textSec}`}>{item.name}</span>
                      <div className="w-[3px] h-5 rounded-full shrink-0" style={{ backgroundColor: hasValue ? item.color : (dm ? "#2A3348" : "#e2e8f0") }} />
                      <span className="text-[15px] font-bold tabular-nums" style={{ color: hasValue ? item.color : (dm ? "#3D4F68" : "#94a3b8") }}>
                        {hasValue ? `${fmt.num(item.value, 0)}%` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${textMut}`}>Metric Ingestion</p>
                <span className={`text-[13px] font-bold font-['Exo_2',sans-serif] tabular-nums ${textPri}`}>
                  {infra?.metric_points != null ? Number(infra.metric_points).toLocaleString() : infraTrend.length ? Math.round(infraTrend[infraTrend.length - 1].value).toLocaleString() : "—"}
                </span>
              </div>
              <div style={{ height: 72, overflow: "visible" }}>
                <ResponsiveContainer width="100%" height={72}>
                  <BarChart data={infraTrend} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="10%" barSize={36}>
                    <Tooltip
                      cursor={{ fill: "#8b5cf610" }}
                      wrapperStyle={{ zIndex: 9999, pointerEvents: "none", transform: "translateY(calc(-100% - 12px))" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const val = payload[0]?.value;
                        const cpuBar = infraBars.find(b => b.name === "CPU");
                        const memBar = infraBars.find(b => b.name === "Memory");
                        return (
                          <div style={{ background: dm ? "#0D0F16" : "#fff", border: "1px solid #8b5cf630", borderRadius: 8, overflow: "hidden", minWidth: 148, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", pointerEvents: "none" }}>
                            <div style={{ height: 3, background: "linear-gradient(90deg, #8b5cf6, #8b5cf655)" }} />
                            <div style={{ padding: "7px 10px" }}>
                              <p style={{ color: dm ? "#7A8FA8" : "#94a3b8", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>Metric Ingestion</p>
                              <p style={{ color: "#8b5cf6", fontSize: 14, fontWeight: 700, fontFamily: "'Exo 2',sans-serif", lineHeight: 1, marginBottom: 6 }}>{val != null ? Number(val).toLocaleString() : "—"} pts</p>
                              <div style={{ borderTop: `1px solid ${dm ? "#1E2130" : "#f1f5f9"}`, paddingTop: 5, display: "flex", flexDirection: "column", gap: 3 }}>
                                {cpuBar?.value != null && <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: dm ? "#56657A" : "#94a3b8", fontSize: 10 }}>Avg CPU</span><span style={{ color: "#3b82f6", fontSize: 10, fontWeight: 700, fontFamily: "'Exo 2',sans-serif" }}>{cpuBar.value.toFixed(1)}%</span></div>}
                                {memBar?.value != null && <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: dm ? "#56657A" : "#94a3b8", fontSize: 10 }}>Avg Mem</span><span style={{ color: "#8b5cf6", fontSize: 10, fontWeight: 700, fontFamily: "'Exo 2',sans-serif" }}>{memBar.value.toFixed(1)}%</span></div>}
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                      {infraTrend.map((_, i) => <Cell key={i} fill={i === infraTrend.length - 1 ? "#8b5cf6" : (dm ? "#1E2232" : "#e2e8f0")} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {(() => {
                if (infraTrend.length < 2) return null;
                const prev = infraTrend[infraTrend.length - 2]?.value;
                const curr = infraTrend[infraTrend.length - 1]?.value;
                if (!prev || !curr) return null;
                const delta = ((curr - prev) / prev) * 100;
                const down  = delta < 0;
                return (
                  <div className="flex items-center gap-1 mt-2">
                    <span style={{ fontSize: 12, color: down ? "#10b981" : "#ef4444" }}>{down ? "↘" : "↗"}</span>
                    <span className={`text-[10px] font-semibold tabular-nums ${down ? "text-emerald-500" : "text-red-500"}`}>{delta.toFixed(1)}%</span>
                    <span className={`text-[10px] ${textMut}`}>vs prev period</span>
                  </div>
                );
              })()}
            </div>
          </div>
          {hostFleet.length > 0 ? (
            <div className="overflow-y-auto overflow-x-auto" style={{ scrollbarWidth: "none", maxHeight: 260 }}>
              <div className={`grid grid-cols-[minmax(140px,2fr)_minmax(80px,1fr)_minmax(80px,1fr)_minmax(80px,1fr)] min-w-[360px] px-5 py-2 border-b sticky top-0 z-10 text-[10px] font-bold uppercase tracking-widest ${colHdrCls}`}>
                <span>Host</span><span>CPU</span><span>Memory</span><span>Disk</span>
              </div>
              {hostFleet.map((host, i) => {
                const lastSeen = host?.last_seen_at ? new Date(host.last_seen_at) : null;
                const isAlive  = host?.status === "alive" || host?.status === "up"
                  || (lastSeen != null && (Date.now() - lastSeen.getTime()) < 10 * 60 * 1000);
                const cpu  = Number(host?.cpu_avg  ?? host?.cpu_pct  ?? host?.cpu  ?? 0);
                const mem  = Number(host?.mem_avg  ?? host?.mem_pct  ?? host?.mem  ?? 0);
                const disk = Number(host?.disk_avg ?? host?.disk_pct ?? host?.disk ?? 0);
                const cpuColor  = cpu  >= 80 ? "text-red-500"  : cpu  >= 60 ? "text-amber-500" : "text-blue-400";
                const memColor  = mem  >= 80 ? "text-red-500"  : mem  >= 60 ? "text-amber-500" : "text-violet-400";
                const diskColor = disk >= 80 ? "text-red-500"  : disk >= 60 ? "text-amber-500" : "text-emerald-500";
                return (
                  <div key={host?.host_id ?? i} className={`grid grid-cols-[minmax(140px,2fr)_minmax(80px,1fr)_minmax(80px,1fr)_minmax(80px,1fr)] min-w-[360px] px-5 py-3.5 border-b items-center cursor-pointer transition-all ${synthRowBorder}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isAlive ? "bg-emerald-500" : "bg-red-500"}`} style={isAlive ? { boxShadow: "0 0 0 3px rgba(16,185,129,0.15)" } : { boxShadow: "0 0 0 3px rgba(239,68,68,0.15)" }} />
                      <span className={`text-[13px] font-semibold truncate ${textPri}`}>{host?.hostname || host?.name || "host"}</span>
                      {!isAlive && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-red-500/10 text-red-500 shrink-0">DOWN</span>}
                    </div>
                    <div className="flex flex-col gap-1 px-1">
                      {isAlive ? (<><div className={`w-full h-[5px] rounded-full ${dm ? "bg-[#1E2232]" : "bg-slate-200"}`}><div className="h-full rounded-full" style={{ width: `${Math.min(cpu, 100)}%`, backgroundColor: cpu >= 80 ? "#ef4444" : cpu >= 60 ? "#f59e0b" : "#60a5fa" }} /></div><span className={`text-[13px] font-bold tabular-nums ${cpuColor}`}>{cpu.toFixed(0)}%</span></>) : <span className={`text-[13px] font-bold tabular-nums ${textMut}`}>—</span>}
                    </div>
                    <div className="flex flex-col gap-1 px-1">
                      {isAlive ? (<><div className={`w-full h-[5px] rounded-full ${dm ? "bg-[#1E2232]" : "bg-slate-200"}`}><div className="h-full rounded-full" style={{ width: `${Math.min(mem, 100)}%`, backgroundColor: mem >= 80 ? "#ef4444" : mem >= 60 ? "#f59e0b" : "#a78bfa" }} /></div><span className={`text-[13px] font-bold tabular-nums ${memColor}`}>{mem.toFixed(0)}%</span></>) : <span className={`text-[13px] font-bold tabular-nums ${textMut}`}>—</span>}
                    </div>
                    <div className="flex flex-col gap-1 px-1">
                      {isAlive ? (<><div className={`w-full h-[5px] rounded-full ${dm ? "bg-[#1E2232]" : "bg-slate-200"}`}><div className="h-full rounded-full" style={{ width: `${Math.min(disk, 100)}%`, backgroundColor: disk >= 80 ? "#ef4444" : disk >= 60 ? "#f59e0b" : "#34d399" }} /></div><span className={`text-[13px] font-bold tabular-nums ${diskColor}`}>{disk.toFixed(0)}%</span></>) : <span className={`text-[13px] font-bold tabular-nums ${textMut}`}>—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`px-5 py-8 text-sm text-center ${textMut}`}>No infrastructure host data available.</div>
          )}
          <div className={`px-5 py-2.5 border-t flex items-center justify-between shrink-0 ${cardFooter}`}>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] ${textMut}`}>{hostsTotal || hostFleet.length} hosts tracked</span>
              <div className={`h-3 w-px ${divider}`} />
              <span className={`text-[10px] tabular-nums ${textMut}`}>Avg CPU: <span className="font-bold text-blue-500">{cpuPct != null ? fmt.num(cpuPct, 2) : "—"}%</span></span>
            </div>
            <button onClick={() => nav(`/tenant/${tenantSlug}/infrastructure`)} className={`flex items-center gap-1 text-[11px] font-semibold ${dm ? "text-violet-400 hover:text-violet-300" : "text-violet-600 hover:text-violet-700"}`}>View All Hosts <ArrowRight size={11} /></button>
          </div>
        </div>
      </div>

      {data?.__error && (
        <div className="rounded-2xl p-4 border border-red-500/30 bg-red-500/10 text-red-600 text-sm">
          <div className="flex items-center gap-2 font-semibold"><TriangleAlert className="h-4 w-4" /> {data?.message || "Overview unavailable"}</div>
        </div>
      )}

      <AskEdgeDashboardModal open={askOpen} onClose={() => setAskOpen(false)} tenantSlug={tenantSlug} />
    </div>
  );
}