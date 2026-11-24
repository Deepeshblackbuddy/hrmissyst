import * as XLSX from 'xlsx';

// Columns (case-insensitive): Employee ID | Department | Category | Type | Snapshot Date | Date of Joining | Date of Leaving
// One row per employee. Leave "Date of Leaving" blank for active staff; fill it for resignations/exits.
const pick = (row, names) => { for (const k of Object.keys(row)) if (names.includes(k.trim().toLowerCase())) return row[k]; };
const toDate = (v) => { if (!v) return null; const d = v instanceof Date ? v : new Date(v); return isNaN(d) ? null : d; };

export function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  const rows = []; let snapshot = null;
  for (const r of raw) {
    const dept = String(pick(r, ['department', 'dept']) ?? '').trim();
    const cat = String(pick(r, ['category', 'cat']) ?? '').trim();
    const t = String(pick(r, ['type', 'direct/indirect', 'manpower type']) ?? '').trim().toLowerCase();
    if (!dept || !cat || !(t.startsWith('d') || t.startsWith('i'))) continue;
    rows.push({
      id: String(pick(r, ['employee id', 'emp id', 'id']) ?? ''), dept, cat, type: t.startsWith('d') ? 'Direct' : 'Indirect',
      n: Number(pick(r, ['count', 'headcount']) ?? 1) || 1,
      doj: toDate(pick(r, ['date of joining', 'doj', 'joining date'])),
      dol: toDate(pick(r, ['date of leaving', 'dol', 'date of resignation', 'leaving date', 'resignation date'])),
    });
    snapshot ||= toDate(pick(r, ['snapshot date', 'snapshot', 'date']));
  }
  if (!rows.length) throw new Error('No valid rows found. Check the column names: Department, Category, Type.');
  snapshot ||= new Date();
  return { rows, snapshot, hasDates: rows.some((r) => r.doj) };
}

export const activeRows = (rows, snap) => rows.filter((r) => !r.dol || r.dol >= snap);
const sum = (a) => a.reduce((s, r) => s + r.n, 0);

export function aggregate(rows, dept, snap) {
  const f = activeRows(rows, snap).filter((r) => !dept || r.dept === dept);
  const direct = sum(f.filter((r) => r.type === 'Direct')), total = sum(f);
  const cats = {}; f.forEach((r) => (cats[r.cat] = (cats[r.cat] || 0) + r.n));
  const categories = Object.entries(cats).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v);
  return { total, direct, indirect: total - direct, categories };
}

export function byDepartment(rows, snap) {
  const m = {};
  activeRows(rows, snap).forEach((r) => {
    m[r.dept] ??= { name: r.dept, direct: 0, indirect: 0 };
    m[r.dept][r.type === 'Direct' ? 'direct' : 'indirect'] += r.n;
  });
  return Object.values(m).map((d) => ({ ...d, total: d.direct + d.indirect })).sort((a, b) => b.total - a.total);
}

export function byCategory(rows, dept, snap) {
  const m = {};
  activeRows(rows, snap).filter((r) => !dept || r.dept === dept).forEach((r) => {
    m[r.cat] ??= { name: r.cat, direct: 0, indirect: 0 };
    m[r.cat][r.type === 'Direct' ? 'direct' : 'indirect'] += r.n;
  });
  return Object.values(m).map((d) => ({ ...d, total: d.direct + d.indirect })).sort((a, b) => b.total - a.total);
}

// Month-end active headcount (Direct vs Indirect) for the 12 full months before the snapshot.
// Someone counts as active on a month-end if they had joined before it and had not yet left.
export function headcountTrend(rows, snap) {
  const y = snap.getFullYear(), mo = snap.getMonth(), out = [];
  for (let i = 12; i >= 1; i--) {
    const s = new Date(y, mo - i, 1), e = new Date(y, mo - i + 1, 1);
    const live = rows.filter((r) => (!r.doj || r.doj < e) && (!r.dol || r.dol >= e));
    const direct = sum(live.filter((r) => r.type === 'Direct')), total = sum(live);
    out.push({ label: s.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), direct, indirect: total - direct, total });
  }
  return out;
}

const BANDS = ['< 3 months', '3–6 months', '6–12 months', '1–2 years', '2+ years'];
const band = (m) => (m < 3 ? 0 : m < 6 ? 1 : m < 12 ? 2 : m < 24 ? 3 : 4);

// Trailing 12 full months before the snapshot date
export function attrition(rows, snap) {
  const y = snap.getFullYear(), mo = snap.getMonth(), months = [];
  for (let i = 12; i >= 1; i--) {
    const s = new Date(y, mo - i, 1), e = new Date(y, mo - i + 1, 1);
    const opening = sum(rows.filter((r) => r.doj && r.doj < s && (!r.dol || r.dol >= s)));
    const joins = sum(rows.filter((r) => r.doj && r.doj >= s && r.doj < e));
    const exits = sum(rows.filter((r) => r.dol && r.dol >= s && r.dol < e));
    const closing = opening + joins - exits, avg = (opening + closing) / 2;
    months.push({ label: s.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), opening, joins, exits, closing, rate: avg ? (exits / avg) * 100 : 0 });
  }
  const start = new Date(y, mo - 12, 1);
  const leavers = rows.filter((r) => r.dol && r.dol >= start && r.dol < snap);
  const bands = [0, 0, 0, 0, 0]; let tenSum = 0, tenN = 0;
  leavers.forEach((r) => { if (!r.doj) return; const m = (r.dol - r.doj) / 2629800000; bands[band(m)] += r.n; tenSum += m * r.n; tenN += r.n; });
  const joinersList = rows.filter((r) => r.doj && r.doj >= start && r.doj < snap);
  const earlyList = leavers.filter((r) => r.doj && (r.dol - r.doj) / 2629800000 < 12);
  const exits = sum(leavers), joins = months.reduce((s, m) => s + m.joins, 0);
  const avgHC = months.reduce((s, m) => s + (m.opening + m.closing) / 2, 0) / 12;
  return { months, exits, joins, net: joins - exits, avgHC, rate: avgHC ? (exits / avgHC) * 100 : 0,
    avgTenure: tenN ? tenSum / tenN : 0, early: exits ? ((bands[0] + bands[1] + bands[2]) / exits) * 100 : 0,
    bands, bandLabels: BANDS, leavers, joinersList, earlyList };
}

export const groupBy = (list, key) => {
  const m = {}; list.forEach((r) => (m[r[key]] = (m[r[key]] || 0) + r.n));
  return Object.entries(m).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v);
};
