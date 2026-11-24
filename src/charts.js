export const C = { mint: '#2de2b0', violet: '#9b7bff', amber: '#ffc857', coral: '#ff6b6b', sky: '#4cc9f0', txt: '#e9eef5', mute: '#8b97a8', grid: 'rgba(255,255,255,.07)' };
const fmt = (n) => n.toLocaleString('en-IN');
const axis = { labels: { style: { color: C.mute, fontSize: '11px' } }, gridLineColor: C.grid, title: { text: undefined } };
const cat = (c) => ({ categories: c, lineColor: 'rgba(255,255,255,.12)', tickLength: 0, labels: { style: { color: C.txt, fontSize: '11px' } } });
const PAL = [C.mint, C.sky, '#5a8dff', C.violet, '#d36bf0', '#ff6bb0', C.coral, '#ff9a5a', C.amber, '#c8e65a'];

export const donutOptions = ({ direct, indirect, total }) => ({
  chart: { height: 240, spacing: [0, 0, 0, 0] },
  title: { useHTML: true, align: 'center', verticalAlign: 'middle', y: 6,
    text: `<div style="text-align:center;color:${C.txt}"><b style="font-size:26px">${fmt(total)}</b><br><span style="font-size:12px;color:${C.mute}">Active</span></div>` },
  tooltip: { pointFormat: '<b>{point.y:,.0f}</b> ({point.percentage:.1f}%)' },
  plotOptions: { pie: { innerSize: '68%', borderWidth: 0, size: '94%', borderRadius: 8, dataLabels: { enabled: true, distance: -26, format: '{point.percentage:.0f}%', style: { color: '#06281f', fontSize: '13px', fontWeight: '700', textOutline: 'none' } } } },
  series: [{ type: 'pie', name: 'Workforce', data: [{ name: 'Direct', y: direct, color: C.mint }, { name: 'Indirect', y: indirect, color: C.violet }] }],
});

export const gaugeOptions = (rate) => ({
  chart: { height: 190, spacing: [0, 0, 0, 0] },
  title: { useHTML: true, align: 'center', verticalAlign: 'middle', y: 34,
    text: `<div style="text-align:center;color:${C.txt}"><b style="font-size:30px">${rate.toFixed(1)}%</b><br><span style="font-size:12px;color:${C.mute}">12M attrition</span></div>` },
  tooltip: { enabled: false },
  plotOptions: { pie: { startAngle: -100, endAngle: 100, innerSize: '74%', center: ['50%', '72%'], size: '150%', borderWidth: 0, borderRadius: 8, dataLabels: { enabled: false } } },
  series: [{ type: 'pie', data: [{ name: 'Attrition', y: Math.min(rate, 40), color: rate > 20 ? C.coral : rate > 12 ? C.amber : C.mint }, { name: 'Retained', y: Math.max(40 - rate, 0), color: 'rgba(255,255,255,.08)' }] }],
});

export const categoryOptions = (cs) => ({
  chart: { type: 'bar', height: Math.max(300, cs.length * 26 + 50), spacing: [4, 24, 8, 0] }, legend: { enabled: false },
  xAxis: { ...cat(cs.map((c) => c.name)), reversed: true }, yAxis: { ...axis, min: 0 },
  plotOptions: { bar: { colorByPoint: true, colors: PAL, borderWidth: 0, borderRadius: 4, pointPadding: 0.14, groupPadding: 0.04,
    dataLabels: { enabled: true, format: '{y:,.0f}', style: { color: C.txt, fontSize: '11px', fontWeight: '500', textOutline: 'none' } } } },
  tooltip: { pointFormat: 'Headcount: <b>{point.y:,.0f}</b>' }, series: [{ name: 'Headcount', data: cs.map((c) => c.v) }],
});

export const deptOptions = (depts, sel, onSelect) => {
  const dim = (d, c) => (sel && sel !== d.name ? c + '40' : c);
  return { chart: { type: 'column', height: 290, spacing: [18, 8, 4, 0] }, legend: { enabled: false },
    xAxis: cat(depts.map((d) => d.name)),
    yAxis: { ...axis, min: 0, stackLabels: { enabled: true, format: '{total:,.0f}', style: { color: C.txt, fontWeight: '600', textOutline: 'none' } } },
    plotOptions: { column: { stacking: 'normal', borderWidth: 0, borderRadius: 4, pointPadding: 0.1, cursor: 'pointer',
      point: { events: { click() { onSelect(this.category === sel ? '' : this.category); } } } } },
    tooltip: { shared: true, headerFormat: '<b>{point.key}</b><br/>' },
    series: [{ name: 'Indirect', color: C.violet, data: depts.map((d) => ({ y: d.indirect, color: dim(d, C.violet) })) },
             { name: 'Direct', color: C.mint, data: depts.map((d) => ({ y: d.direct, color: dim(d, C.mint) })) }] };
};

export const trendOptions = (months) => ({
  chart: { height: 320, spacing: [16, 8, 4, 0] }, legend: { itemStyle: { color: C.mute, fontWeight: '500' }, itemHoverStyle: { color: C.txt } },
  xAxis: cat(months.map((m) => m.label)),
  yAxis: [{ ...axis, min: 0 }, { ...axis, opposite: true, gridLineWidth: 0, min: 0, labels: { format: '{value}%', style: { color: C.amber, fontSize: '11px' } } }],
  tooltip: { shared: true }, plotOptions: { column: { borderWidth: 0, borderRadius: 4, pointPadding: 0.08, groupPadding: 0.12 } },
  series: [{ type: 'column', name: 'Joiners', color: C.mint, data: months.map((m) => m.joins) },
           { type: 'column', name: 'Exits', color: C.coral, data: months.map((m) => m.exits) },
           { type: 'spline', name: 'Attrition %', yAxis: 1, color: C.amber, lineWidth: 3, marker: { radius: 4, fillColor: '#0b1016', lineWidth: 2, lineColor: C.amber },
             data: months.map((m) => +m.rate.toFixed(2)), tooltip: { valueSuffix: '%' } }],
});

export const tenureOptions = (labels, vals) => ({
  chart: { type: 'column', height: 250, spacing: [16, 8, 4, 0] }, legend: { enabled: false }, xAxis: cat(labels), yAxis: { ...axis, min: 0 },
  plotOptions: { column: { colorByPoint: true, colors: [C.coral, '#ff8a5a', C.amber, C.sky, C.violet], borderWidth: 0, borderRadius: 6, dataLabels: { enabled: true, style: { color: C.txt, textOutline: 'none' } } } },
  tooltip: { pointFormat: 'Exits: <b>{point.y}</b>' }, series: [{ name: 'Exits', data: vals }],
});

export const deptAttrOptions = (stats, sel, onSelect) => ({
  chart: { type: 'bar', height: 300, spacing: [4, 28, 8, 0] }, legend: { enabled: false },
  xAxis: { ...cat(stats.map((s) => s.name)), reversed: true }, yAxis: { ...axis, min: 0, labels: { format: '{value}%', style: { color: C.mute, fontSize: '11px' } } },
  plotOptions: { bar: { borderWidth: 0, borderRadius: 4, pointPadding: 0.16, cursor: 'pointer', dataLabels: { enabled: true, format: '{y:.1f}%', style: { color: C.txt, fontSize: '11px', textOutline: 'none' } },
    point: { events: { click() { onSelect(this.category === sel ? '' : this.category); } } } } },
  tooltip: { pointFormat: 'Attrition: <b>{point.y:.1f}%</b>' },
  series: [{ name: 'Attrition', data: stats.map((s) => ({ y: +s.rate.toFixed(2), color: (sel && sel !== s.name ? '#ff6b6b40' : s.rate > 20 ? C.coral : s.rate > 12 ? C.amber : C.mint) })) }],
});

// ---- Direct vs Indirect headcount trend (two axes so both lines stay readable) ----
export const mixTrendOptions = (t) => ({
  chart: { height: 290, spacing: [16, 8, 4, 0] }, legend: { itemStyle: { color: C.mute, fontWeight: '500' }, itemHoverStyle: { color: C.txt } },
  xAxis: cat(t.map((m) => m.label)),
  yAxis: [{ ...axis, labels: { style: { color: C.mint, fontSize: '11px' } } },
          { ...axis, opposite: true, gridLineWidth: 0, labels: { style: { color: C.violet, fontSize: '11px' } } }],
  tooltip: { shared: true, formatter() {
    const d = this.points.find((p) => p.series.name === 'Direct')?.y ?? 0, i = this.points.find((p) => p.series.name === 'Indirect')?.y ?? 0, tot = d + i;
    return `<b>${this.x}</b><br/><span style="color:${C.mint}">●</span> Direct: <b>${fmt(d)}</b><br/><span style="color:${C.violet}">●</span> Indirect: <b>${fmt(i)}</b><br/>Total: <b>${fmt(tot)}</b> · Direct share <b>${tot ? ((d / tot) * 100).toFixed(1) : 0}%</b>`;
  } },
  series: [{ type: 'areaspline', name: 'Direct', yAxis: 0, color: C.mint, lineWidth: 3, threshold: null, data: t.map((m) => m.direct),
             fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, C.mint + '40'], [1, C.mint + '05']] },
             marker: { radius: 4, fillColor: '#0b1016', lineWidth: 2, lineColor: C.mint } },
           { type: 'spline', name: 'Indirect', yAxis: 1, color: C.violet, lineWidth: 3, data: t.map((m) => m.indirect),
             marker: { radius: 4, fillColor: '#0b1016', lineWidth: 2, lineColor: C.violet } }],
});

// ---- Generic charts used by the KPI drill-down panel ----
export const lineOptions = ({ labels, name, data, color, suffix = '', dec = 0 }) => ({
  chart: { height: 280, spacing: [16, 12, 4, 0] }, legend: { enabled: false }, xAxis: cat(labels),
  yAxis: { ...axis, labels: { format: `{value}${suffix}`, style: { color: C.mute, fontSize: '11px' } } },
  tooltip: { headerFormat: '<b>{point.key}</b><br/>', pointFormat: `${name}: <b>{point.y:,.${dec}f}</b>${suffix}` },
  series: [{ type: 'areaspline', name, data, color, lineWidth: 3, threshold: null,
    fillColor: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, color + '45'], [1, color + '05']] },
    marker: { radius: 4, fillColor: '#0b1016', lineWidth: 2, lineColor: color } }],
});

export const columnOptions = ({ labels, name, data, color, negativeColor }) => ({
  chart: { type: 'column', height: 280, spacing: [16, 12, 4, 0] }, legend: { enabled: false }, xAxis: cat(labels), yAxis: { ...axis },
  plotOptions: { column: { borderWidth: 0, borderRadius: 4, pointPadding: 0.08, groupPadding: 0.1,
    dataLabels: { enabled: true, style: { color: C.txt, fontSize: '10px', fontWeight: '500', textOutline: 'none' } } } },
  tooltip: { headerFormat: '<b>{point.key}</b><br/>', pointFormat: `${name}: <b>{point.y:,.0f}</b>` },
  series: [{ name, data, color, negativeColor: negativeColor || color }],
});

export const stackedBarOptions = (items) => ({
  chart: { type: 'bar', height: Math.max(260, items.length * 30 + 70), spacing: [4, 28, 8, 0] },
  legend: { itemStyle: { color: C.mute, fontWeight: '500' }, itemHoverStyle: { color: C.txt } },
  xAxis: { ...cat(items.map((d) => d.name)), reversed: true },
  yAxis: { ...axis, min: 0, stackLabels: { enabled: true, format: '{total:,.0f}', style: { color: C.txt, fontSize: '11px', fontWeight: '600', textOutline: 'none' } } },
  plotOptions: { bar: { stacking: 'normal', borderWidth: 0, borderRadius: 3, pointPadding: 0.14, groupPadding: 0.04 } },
  tooltip: { shared: true, headerFormat: '<b>{point.key}</b><br/>' },
  series: [{ name: 'Indirect', color: C.violet, data: items.map((d) => d.indirect) }, { name: 'Direct', color: C.mint, data: items.map((d) => d.direct) }],
});
