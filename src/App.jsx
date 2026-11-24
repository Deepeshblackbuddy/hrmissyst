import { useEffect, useMemo, useRef, useState } from 'react';
import { Users, User, Building2, Layers, LayoutDashboard, Lightbulb, Upload, TrendingDown, CalendarX, Factory,
  BedDouble, PartyPopper, ChevronDown, UserPlus, UserMinus, Clock, Activity, TreePine, X, ArrowRight } from 'lucide-react';
import Chart from './Chart.jsx';
import { parseWorkbook, aggregate, byDepartment, byCategory, headcountTrend, attrition, groupBy } from './data.js';
import { donutOptions, gaugeOptions, categoryOptions, deptOptions, trendOptions, tenureOptions, deptAttrOptions,
  mixTrendOptions, lineOptions, columnOptions, stackedBarOptions, C } from './charts.js';

const fmt = (n) => Math.round(n).toLocaleString('en-IN');
const fd = (d) => (d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const signed = (n) => `${n > 0 ? '+' : ''}${fmt(n)}`;
const NAV = [{ id: 'manpower', label: 'Manpower', icon: LayoutDashboard }, { id: 'attrition', label: 'Attrition', icon: TrendingDown },
  { label: 'Absenteeism', icon: CalendarX }, { label: 'MSE', icon: Factory }, { label: 'Hostel', icon: BedDouble }, { label: 'Holidays', icon: PartyPopper }];

export default function App() {
  const [data, setData] = useState(null), [error, setError] = useState(''), [dept, setDept] = useState(''), [page, setPage] = useState('manpower');
  const [sel, setSel] = useState(''); // which KPI card is open
  const fileRef = useRef();
  const load = (buf) => { try { setData(parseWorkbook(buf)); setError(''); setDept(''); setSel(''); } catch (e) { setError(e.message); } };
  useEffect(() => { fetch(`${import.meta.env.BASE_URL}data/manpower.xlsx`).then((r) => r.arrayBuffer()).then(load).catch(() => setError('Could not load data/manpower.xlsx. Upload a file instead.')); }, []);
  const goPage = (p) => { setPage(p); setSel(''); };

  const rows = data?.rows ?? [], snap = data?.snapshot;
  const scoped = useMemo(() => (dept ? rows.filter((r) => r.dept === dept) : rows), [data, dept]);
  const depts = useMemo(() => (data ? byDepartment(rows, snap) : []), [data]);
  const k = useMemo(() => (data ? aggregate(rows, dept, snap) : null), [data, dept]);
  const all = useMemo(() => (data ? aggregate(rows, '', snap) : null), [data]);
  const cats = useMemo(() => (data ? byCategory(rows, dept, snap) : []), [data, dept]);
  const trend = useMemo(() => (data?.hasDates ? headcountTrend(scoped, snap) : null), [data, dept]);
  const att = useMemo(() => (data?.hasDates ? attrition(scoped, snap) : null), [data, dept]);
  const deptAtt = useMemo(() => (data?.hasDates ? depts.map((d) => ({ name: d.name, ...attrition(rows.filter((r) => r.dept === d.name), snap) })).sort((a, b) => b.rate - a.rate) : []), [data]);
  const pct = (n, t) => (t ? ((n / t) * 100).toFixed(1) : '0.0');
  const top = k?.categories[0], worst = deptAtt[0];
  const pickDept = (name) => setDept(name === dept ? '' : name);

  /* ---------- KPI drill-down content ---------- */
  const manDetail = (id) => {
    const metric = { total: 'total', direct: 'direct', indirect: 'indirect' }[id];
    if (metric) {
      const col = { total: C.mint, direct: C.sky, indirect: C.violet }[id], nm = { total: 'Total manpower', direct: 'Direct manpower', indirect: 'Indirect manpower' }[id];
      const items = (dept ? cats : depts).map((x) => ({ name: x.name, v: x[metric], label: fmt(x[metric]), sub: `${pct(x[metric], k[metric])}% of ${dept || 'company'}` })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
      return { title: nm, color: col, sub: `${fmt(k[metric])} active · ${dept || 'all departments'}`,
        left: trend && { t: '12-month headcount trend', o: lineOptions({ labels: trend.map((m) => m.label), name: nm, data: trend.map((m) => m[metric]), color: col }) },
        list: { t: dept ? 'By category' : 'By department (click to filter)', items, pick: !dept } };
    }
    if (id === 'depts') return { title: 'Departments', color: C.amber, sub: 'Direct vs indirect split in every business unit',
      left: { t: 'Direct vs indirect by department', o: stackedBarOptions(depts) },
      list: { t: 'Ranked by headcount (click to filter)', items: depts.map((d) => ({ name: d.name, v: d.total, label: fmt(d.total), sub: `${pct(d.direct, d.total)}% direct` })), pick: true } };
    if (id === 'cats') return { title: 'Categories', color: '#d36bf0', sub: `Employment types in ${dept || 'all departments'}`,
      left: { t: 'Direct vs indirect by category', o: stackedBarOptions(cats) },
      list: { t: 'Ranked by headcount', items: cats.map((c) => ({ name: c.name, v: c.total, label: fmt(c.total), sub: `${pct(c.total, k.total)}% of ${dept || 'total'}` })) } };
    if (id === 'attr' && att) return { title: 'Attrition (last 12 months)', color: C.coral, sub: `${att.rate.toFixed(1)}% · ${fmt(att.exits)} exits vs ${fmt(att.joins)} joiners`,
      left: { t: 'Joiners vs exits', o: trendOptions(att.months) },
      list: { t: 'Attrition rate by department (click to filter)', items: deptAtt.map((d) => ({ name: d.name, v: d.rate, label: `${d.rate.toFixed(1)}%`, sub: `${fmt(d.exits)} exits` })), pick: true },
      action: { label: 'Open full attrition analysis', go: () => goPage('attrition') } };
    return null;
  };

  const attDetail = (id) => {
    if (!att) return null;
    const L = att.months.map((m) => m.label), by = dept ? 'category' : 'department', split = (list) => groupBy(list, dept ? 'cat' : 'dept').map((x) => ({ name: x.name, v: x.v, label: fmt(x.v) }));
    switch (id) {
      case 'rate': return { title: 'Attrition rate', color: C.coral, sub: 'Monthly exits ÷ average headcount',
        left: { t: 'Monthly attrition %', o: lineOptions({ labels: L, name: 'Attrition', data: att.months.map((m) => +m.rate.toFixed(2)), color: C.coral, suffix: '%', dec: 1 }) },
        list: { t: 'By department (click to filter)', items: deptAtt.map((d) => ({ name: d.name, v: d.rate, label: `${d.rate.toFixed(1)}%`, sub: `${fmt(d.exits)} exits` })), pick: true } };
      case 'exits': return { title: 'Exits', color: C.amber, sub: `${fmt(att.exits)} people left in the last 12 months`,
        left: { t: 'Exits per month', o: columnOptions({ labels: L, name: 'Exits', data: att.months.map((m) => m.exits), color: C.amber }) },
        list: { t: `Exits by ${by}`, items: split(att.leavers) } };
      case 'joiners': return { title: 'Joiners', color: C.mint, sub: `${fmt(att.joins)} people joined in the last 12 months`,
        left: { t: 'Joiners per month', o: columnOptions({ labels: L, name: 'Joiners', data: att.months.map((m) => m.joins), color: C.mint }) },
        list: { t: `Joiners by ${by}`, items: split(att.joinersList) } };
      case 'net': return { title: 'Net change', color: att.net >= 0 ? C.mint : C.coral, sub: 'Joiners minus exits',
        left: { t: 'Net change per month', o: columnOptions({ labels: L, name: 'Net change', data: att.months.map((m) => m.joins - m.exits), color: C.mint, negativeColor: C.coral }) },
        list: { t: 'Net change by department (click to filter)', items: [...deptAtt].sort((a, b) => b.net - a.net).map((d) => ({ name: d.name, v: d.net, label: signed(d.net), sub: `${fmt(d.joins)} in · ${fmt(d.exits)} out` })), pick: true, signed: true } };
      case 'tenure': return { title: 'Tenure at exit', color: C.sky, sub: `Average ${(att.avgTenure / 12).toFixed(1)} years before leaving`,
        left: { t: 'Exits by tenure band', o: tenureOptions(att.bandLabels, att.bands) },
        list: { t: 'Average tenure at exit (click to filter)', items: deptAtt.filter((d) => d.avgTenure > 0).sort((a, b) => b.avgTenure - a.avgTenure).map((d) => ({ name: d.name, v: d.avgTenure, label: `${(d.avgTenure / 12).toFixed(1)} yrs`, sub: `${fmt(d.exits)} exits` })), pick: true } };
      case 'early': return { title: 'Early exits', color: C.violet, sub: `${fmt(att.earlyList.reduce((s, r) => s + r.n, 0))} people left within their first year`,
        left: { t: 'Leavers inside the first year', o: columnOptions({ labels: att.bandLabels.slice(0, 3), name: 'Exits', data: att.bands.slice(0, 3), color: C.violet }) },
        list: { t: `Early exits by ${by}`, items: split(att.earlyList) } };
      default: return null;
    }
  };

  const detail = data && sel ? (page === 'manpower' ? manDetail(sel) : attDetail(sel)) : null;
  const kp = { sel, setSel };

  return (
    <div className="app">
      <aside className="rail">
        <div className="logo"><TreePine size={26} /></div>
        <nav>{NAV.map(({ id, label, icon: I }) => (
          <button key={label} className={`nav ${page === id ? 'on' : ''}`} disabled={!id} onClick={() => id && goPage(id)} title={id ? label : `${label} · coming soon`}>
            <I size={21} /><span>{label}</span>
          </button>))}</nav>
      </aside>

      <main className="main">
        <header className="top">
          <div><h1>{page === 'manpower' ? 'Manpower Overview' : 'Attrition Analysis'}</h1>
            <p>{dept || 'All departments'}{snap && <> · Snapshot {fd(snap)}</>}</p></div>
          <div className="controls">
            <DeptSelect value={dept} depts={depts} onChange={setDept} />
            <button className="pill solid" onClick={() => fileRef.current.click()}><Upload size={16} />Upload Excel</button>
            <input ref={fileRef} type="file" hidden accept=".xlsx,.xls,.csv" onChange={(e) => { e.target.files[0]?.arrayBuffer().then(load); e.target.value = ''; }} />
          </div>
        </header>

        {error && <div className="err">{error}</div>}
        {!data && !error && <div className="err">Loading data…</div>}

        {data && page === 'manpower' && (<>
          <section className="kpis">
            <Kpi {...kp} id="total" c={C.mint} icon={Users} label="Total Manpower" v={fmt(k.total)} sub={dept ? `${pct(k.total, all.total)}% of company` : 'Active headcount'} />
            <Kpi {...kp} id="direct" c={C.sky} icon={User} label="Direct" v={fmt(k.direct)} sub={`${pct(k.direct, k.total)}% of workforce`} />
            <Kpi {...kp} id="indirect" c={C.violet} icon={User} label="Indirect" v={fmt(k.indirect)} sub={`${pct(k.indirect, k.total)}% of workforce`} />
            <Kpi {...kp} id="depts" c={C.amber} icon={Building2} label="Departments" v={dept ? 1 : depts.length} sub="Business units" />
            <Kpi {...kp} id="cats" c="#d36bf0" icon={Layers} label="Categories" v={k.categories.length} sub="Employment types" />
            {att && <Kpi {...kp} id="attr" c={C.coral} icon={Activity} label="Attrition (12M)" v={`${att.rate.toFixed(1)}%`} sub={`${fmt(att.exits)} exits`} />}
          </section>
          <p className="kpi-hint">Click any card above to see the data behind it</p>
          {detail && <Detail d={detail} dept={dept} pickDept={pickDept} close={() => setSel('')} />}
          <section className="grid g-man">
            <Card t="Workforce Mix" cls="mix"><Chart options={donutOptions(k)} />
              <ul className="legend"><li><i style={{ background: C.mint }} />Direct <b>{fmt(k.direct)}</b></li><li><i style={{ background: C.violet }} />Indirect <b>{fmt(k.indirect)}</b></li></ul></Card>
            <Card t="Department Headcount" cls="dept" hint="Click a bar to filter the whole dashboard" lg><Chart options={deptOptions(depts, dept, setDept)} /></Card>
            <Card t="Top Departments" cls="topd"><ol>{depts.slice(0, 8).map((d, i) => (
              <li key={d.name} className={dept === d.name ? 'sel' : ''} onClick={() => pickDept(d.name)}>
                <span className="rank">{i + 1}</span><span className="nm">{d.name}<em style={{ width: `${(d.total / depts[0].total) * 100}%` }} /></span><span className="ct">{fmt(d.total)}</span></li>))}</ol></Card>
            <Card t="Direct vs Indirect Trend" cls="mtr" hint="Month-end active headcount, last 12 months · left axis Direct, right axis Indirect">
              {trend ? <Chart options={mixTrendOptions(trend)} /> : <div className="empty">Add “Date of Joining” and “Date of Leaving” columns to the Excel to see the trend.</div>}</Card>
            <Card t="Manpower by Category" cls="cat"><Chart options={categoryOptions(k.categories)} /></Card>
            <div className="card insight"><Lightbulb size={28} color={C.amber} /><ul>
              {top && <li><b>{top.name}</b> is the largest category: {fmt(top.v)} people ({pct(top.v, k.total)}% of {dept || 'total'}).</li>}
              <li>Direct workforce share is <b>{Math.round((k.direct / k.total) * 100) || 0}%</b>{dept && <> vs {Math.round((all.direct / all.total) * 100)}% company-wide</>}.</li>
              {trend && <li>Over the last 12 months Direct headcount moved <b>{growth(trend[0].direct, trend.at(-1).direct)}</b> and Indirect <b>{growth(trend[0].indirect, trend.at(-1).indirect)}</b>.</li>}</ul></div>
          </section></>)}

        {data && page === 'attrition' && (att ? (<>
          <section className="kpis">
            <Kpi {...kp} id="rate" c={C.coral} icon={Activity} label="Attrition Rate" v={`${att.rate.toFixed(1)}%`} sub="Last 12 months" />
            <Kpi {...kp} id="exits" c={C.amber} icon={UserMinus} label="Exits" v={fmt(att.exits)} sub="Resigned / left" />
            <Kpi {...kp} id="joiners" c={C.mint} icon={UserPlus} label="Joiners" v={fmt(att.joins)} sub="Last 12 months" />
            <Kpi {...kp} id="net" c={att.net >= 0 ? C.mint : C.coral} icon={Users} label="Net Change" v={signed(att.net)} sub="Joiners − exits" />
            <Kpi {...kp} id="tenure" c={C.sky} icon={Clock} label="Avg Tenure at Exit" v={`${(att.avgTenure / 12).toFixed(1)} yrs`} sub={`${Math.round(att.avgTenure)} months`} />
            <Kpi {...kp} id="early" c={C.violet} icon={TrendingDown} label="Early Exits" v={`${att.early.toFixed(0)}%`} sub="Left within 1 year" />
          </section>
          <p className="kpi-hint">Click any card above to see the data behind it</p>
          {detail && <Detail d={detail} dept={dept} pickDept={pickDept} close={() => setSel('')} />}
          <section className="grid g-att">
            <Card t="Joiners vs Exits" cls="trend"><Chart options={trendOptions(att.months)} /></Card>
            <Card t="Attrition Rate" cls="gauge"><Chart options={gaugeOptions(att.rate)} /><p className="hint">Healthy &lt; 12% · Watch 12–20% · High &gt; 20%</p></Card>
            <Card t="Exits by Tenure" cls="ten"><Chart options={tenureOptions(att.bandLabels, att.bands)} /></Card>
            <Card t="Attrition by Department" cls="dat" hint="Click a bar to filter"><Chart options={deptAttrOptions(deptAtt, dept, setDept)} /></Card>
            <Card t="Exits by Category" cls="exc"><ol className="bars">{groupBy(att.leavers, 'cat').slice(0, 7).map((c, _, a) => (
              <li key={c.name}><span>{c.name}</span><em><i style={{ width: `${(c.v / a[0].v) * 100}%` }} /></em><b>{c.v}</b></li>))}</ol></Card>
            <div className="card insight"><Lightbulb size={28} color={C.amber} /><ul>
              {worst && !dept && <li><b>{worst.name}</b> has the highest attrition at <b>{worst.rate.toFixed(1)}%</b>.</li>}
              <li><b>{att.early.toFixed(0)}%</b> of leavers exited within their first year — review onboarding and early-tenure engagement.</li>
              <li>Peak exit month: <b>{[...att.months].sort((a, b) => b.exits - a.exits)[0].label}</b> ({[...att.months].sort((a, b) => b.exits - a.exits)[0].exits} exits).</li></ul></div>
          </section></>) : <div className="err">Add “Date of Joining” and “Date of Leaving” columns to the Excel to see attrition.</div>)}
        {data && <footer>Source: Manpower Data · HR snapshot as on {fd(snap)}</footer>}
      </main>
    </div>
  );
}

const growth = (a, b) => (a ? `${b >= a ? '+' : ''}${(((b - a) / a) * 100).toFixed(1)}%` : '—');

const Card = ({ t, cls, hint, lg, children }) => (
  <div className={`card ${cls}`}><h2>{t}{lg && <span className="lg"><i style={{ background: C.mint }} />Direct<i style={{ background: C.violet }} />Indirect</span>}</h2>{children}{hint && <p className="hint">{hint}</p>}</div>
);

function Kpi({ id, sel, setSel, c, icon: I, label, v, sub }) {
  const on = sel === id;
  return (
    <button type="button" className={`kpi ${on ? 'on' : ''}`} style={{ '--c': c }} aria-pressed={on} onClick={() => setSel(on ? '' : id)}>
      <div className="ico"><I size={22} /></div><small>{label}</small><strong>{v}</strong><span>{sub}</span><ChevronDown className="chev" size={16} />
    </button>
  );
}

// Panel that opens under the KPI row: a chart on the left, a ranked list on the right.
function Detail({ d, dept, pickDept, close }) {
  const { list } = d, max = Math.max(...list.items.map((x) => Math.abs(x.v)), 1);
  return (
    <section className="card detail" style={{ '--c': d.color }}>
      <div className="d-head">
        <div><h2>{d.title}</h2><p>{d.sub}</p></div>
        {d.action && <button type="button" className="d-act" onClick={d.action.go}>{d.action.label}<ArrowRight size={15} /></button>}
        <button type="button" className="d-x" aria-label="Close" onClick={close}><X size={18} /></button>
      </div>
      <div className={`d-body ${d.left ? '' : 'one'}`}>
        {d.left && <div className="d-chart"><h3>{d.left.t}</h3><Chart key={d.title + dept} options={d.left.o} /></div>}
        <div className="d-list"><h3>{list.t}</h3>
          <ol>{list.items.length ? list.items.map((x) => (
            <li key={x.name} className={`${list.pick ? 'pick' : ''} ${dept === x.name ? 'sel' : ''}`} onClick={() => list.pick && pickDept(x.name)}>
              <span className="r-top"><span>{x.name}</span><b style={{ color: list.signed && x.v < 0 ? C.coral : undefined }}>{x.label}</b></span>
              <em><i style={{ width: `${(Math.abs(x.v) / max) * 100}%`, background: list.signed && x.v < 0 ? C.coral : undefined }} /></em>
              {x.sub && <small>{x.sub}</small>}
            </li>)) : <li className="none">No data</li>}</ol></div>
      </div>
    </section>
  );
}

// Custom dropdown (replaces the native <select>) so it always opens, closes and styles the same way.
function DeptSelect({ value, depts, onChange }) {
  const [open, setOpen] = useState(false), ref = useRef();
  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  const pick = (v) => { onChange(v); setOpen(false); };
  const key = (v) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(v); } };
  return (
    <div className="dd" ref={ref}>
      <button type="button" className={`pill ${value ? 'active' : ''}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Layers size={16} /><span className="dd-v">{value || 'All Departments'}</span><ChevronDown size={14} className={open ? 'flip' : ''} />
      </button>
      {open && (
        <ul className="menu" role="listbox">
          <li role="option" tabIndex={0} aria-selected={!value} className={!value ? 'on' : ''} onClick={() => pick('')} onKeyDown={key('')}>All Departments</li>
          {depts.map((d) => (
            <li key={d.name} role="option" tabIndex={0} aria-selected={value === d.name} className={value === d.name ? 'on' : ''} onClick={() => pick(d.name)} onKeyDown={key(d.name)}>
              {d.name}<b>{fmt(d.total)}</b></li>))}
        </ul>)}
    </div>
  );
}
