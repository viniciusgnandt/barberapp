// components/ui/Charts.jsx — Gráficos SVG interativos

import { useState, useRef, useId } from 'react';
import { cn } from '../../utils/cn';

// ── Horizontal Bar Chart ──────────────────────────────────────────────────────
export function HBarChart({
  items,
  getLabel,
  getValue,
  getTooltipMain,
  getTooltipSub,
  colorClass = 'bg-brand-500',
  emptyText = 'Nenhum dado.',
}) {
  const [hovered, setHovered] = useState(null);
  if (!items?.length) {
    return <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">{emptyText}</p>;
  }
  const max = Math.max(...items.map(getValue), 1);

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const pct  = (getValue(item) / max) * 100;
        const isHov = hovered === i;
        return (
          <div
            key={i}
            className="group cursor-default"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate leading-none">
                {getLabel(item)}
              </span>
              <span className={cn(
                'text-xs ml-3 shrink-0 transition-colors leading-none',
                isHov ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-400 dark:text-gray-500',
              )}>
                {isHov && getTooltipSub ? getTooltipSub(item) : getTooltipMain(item)}
              </span>
            </div>
            <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-xl transition-all duration-500 ease-out flex items-center',
                  colorClass,
                  isHov ? 'brightness-110' : '',
                )}
                style={{ width: `${Math.max(pct, getValue(item) > 0 ? 3 : 0)}%` }}
              >
                {pct > 12 && (
                  <span className="text-xs text-white font-bold px-2.5 truncate">{getValue(item)}</span>
                )}
              </div>
              {pct <= 12 && getValue(item) > 0 && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {getValue(item)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Area / Line Chart (SVG) ───────────────────────────────────────────────────
export function AreaChart({
  data,
  xKey,
  yKey,
  formatX,
  formatY,
  color = '#6366f1',
  secondaryYKey,
  secondaryColor = '#10b981',
  secondaryLabel,
}) {
  const uid  = useId().replace(/:/g, '');
  const ref  = useRef(null);
  const [tip, setTip] = useState(null);

  if (!data?.length) return null;

  const W = 600, H = 200, pL = 6, pR = 6, pT = 28, pB = 36;
  const plotW = W - pL - pR;
  const plotH = H - pT - pB;

  const allY = data.flatMap(d => [d[yKey], secondaryYKey ? d[secondaryYKey] : 0]);
  const maxY = Math.max(...allY, 1);

  const sx = i => pL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const sy = v => pT + plotH - (v / maxY) * plotH;

  // Smooth bezier path
  const makePath = (key) => {
    const pts = data.map((d, i) => ({ x: sx(i), y: sy(d[key]) }));
    return pts.reduce((p, pt, i, arr) => {
      if (i === 0) return `M${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      const cp = (arr[i - 1].x + pt.x) / 2;
      return `${p} C${cp.toFixed(1)},${arr[i-1].y.toFixed(1)} ${cp.toFixed(1)},${pt.y.toFixed(1)} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }, '');
  };

  const linePath     = makePath(yKey);
  const secLinePath  = secondaryYKey ? makePath(secondaryYKey) : null;
  const areaPath     = `${linePath} L${sx(data.length - 1).toFixed(1)},${(pT + plotH).toFixed(1)} L${sx(0).toFixed(1)},${(pT + plotH).toFixed(1)} Z`;

  // Y tick labels
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => maxY * f);

  // X label step
  const step = data.length <= 12 ? 1 : Math.ceil(data.length / 12);

  return (
    <div ref={ref} className="relative select-none">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height: 200 }}>
        <defs>
          <linearGradient id={`ag-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={color} stopOpacity="0.28" />
            <stop offset="90%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {yTicks.slice(1, 4).map((v, i) => (
          <line key={i} x1={pL} y1={sy(v)} x2={W - pR} y2={sy(v)}
            stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" strokeDasharray="5 3" />
        ))}

        {/* Area + primary line */}
        <path d={areaPath} fill={`url(#ag-${uid})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Secondary line */}
        {secLinePath && (
          <path d={secLinePath} fill="none" stroke={secondaryColor} strokeWidth="2"
            strokeLinejoin="round" strokeLinecap="round" strokeDasharray="6 3" />
        )}

        {/* Hover vertical line + dot */}
        {tip !== null && (() => {
          const px = sx(tip);
          const py = sy(data[tip][yKey]);
          return (
            <>
              <line x1={px} y1={pT} x2={px} y2={pT + plotH}
                stroke={color} strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="4 3" />
              <circle cx={px} cy={py} r={5} fill={color} stroke="white" strokeWidth="2.5" />
              {secondaryYKey && (
                <circle cx={px} cy={sy(data[tip][secondaryYKey])} r={4}
                  fill={secondaryColor} stroke="white" strokeWidth="2" />
              )}
            </>
          );
        })()}

        {/* Invisible hover zones */}
        {data.map((_, i) => {
          const w = plotW / Math.max(data.length - 1, 1);
          return (
            <rect key={i}
              x={Math.max(pL, sx(i) - w / 2)} y={pT}
              width={w} height={plotH}
              fill="transparent"
              onMouseEnter={() => setTip(i)}
              onMouseLeave={() => setTip(null)}
            />
          );
        })}

        {/* X labels */}
        {data.map((d, i) => {
          if (i % step !== 0 && i !== data.length - 1) return null;
          return (
            <text key={i} x={sx(i)} y={H - 8} fontSize="9.5" fill="currentColor"
              opacity="0.4" textAnchor="middle">
              {formatX ? formatX(d[xKey]) : d[xKey]}
            </text>
          );
        })}

        {/* Y tick labels */}
        <text x={pL} y={pT - 8} fontSize="9" fill="currentColor" opacity="0.4" textAnchor="start">
          {formatY ? formatY(maxY) : maxY}
        </text>
      </svg>

      {/* HTML tooltip */}
      {tip !== null && ref.current && (() => {
        const d = data[tip];
        const cW = ref.current.offsetWidth;
        const xPct = (sx(tip) - pL) / plotW;
        const left = Math.min(Math.max(xPct * cW, 70), cW - 70);
        return (
          <div
            className="absolute top-0 pointer-events-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl px-3 py-2 text-xs z-10"
            style={{ left, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
          >
            <p className="text-gray-400 dark:text-gray-500 mb-0.5">
              {formatX ? formatX(d[xKey]) : d[xKey]}
            </p>
            <p className="font-bold" style={{ color }}>{formatY ? formatY(d[yKey]) : d[yKey]}</p>
            {secondaryYKey && (
              <p className="font-semibold mt-0.5" style={{ color: secondaryColor }}>
                {secondaryLabel && `${secondaryLabel}: `}
                {formatY ? formatY(d[secondaryYKey]) : d[secondaryYKey]}
              </p>
            )}
          </div>
        );
      })()}

      {/* Legend */}
      {secondaryYKey && secondaryLabel && (
        <div className="flex items-center gap-4 mt-2 justify-center text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded inline-block" style={{ background: color }} />
            Faturamento
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded inline-block border-t-2 border-dashed" style={{ borderColor: secondaryColor }} />
            {secondaryLabel}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Donut Chart (SVG) ─────────────────────────────────────────────────────────
export function DonutChart({ segments, size = 140 }) {
  const [hovered, setHovered] = useState(null);
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const R = 52, r = 34, cx = 70, cy = 70;
  let cumAngle = -Math.PI / 2;

  const arcs = segments.map(seg => {
    const sweep = (seg.value / total) * 2 * Math.PI;
    const a1 = cumAngle, a2 = cumAngle + sweep;
    cumAngle += sweep;
    const isHov = hovered === seg.label;
    const OR = isHov ? R + 5 : R;

    const x1 = cx + OR * Math.cos(a1), y1 = cy + OR * Math.sin(a1);
    const x2 = cx + OR * Math.cos(a2), y2 = cy + OR * Math.sin(a2);
    const ix1 = cx + r * Math.cos(a1), iy1 = cy + r * Math.sin(a1);
    const ix2 = cx + r * Math.cos(a2), iy2 = cy + r * Math.sin(a2);
    const large = sweep > Math.PI ? 1 : 0;

    return {
      ...seg,
      path: `M${x1.toFixed(1)},${y1.toFixed(1)} A${OR},${OR},0,${large},1,${x2.toFixed(1)},${y2.toFixed(1)} L${ix2.toFixed(1)},${iy2.toFixed(1)} A${r},${r},0,${large},0,${ix1.toFixed(1)},${iy1.toFixed(1)} Z`,
    };
  });

  const active = hovered ? segments.find(s => s.label === hovered) : null;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 140 140" style={{ width: size, height: size, flexShrink: 0 }}>
        {arcs.map(arc => (
          <path
            key={arc.label}
            d={arc.path}
            fill={arc.color}
            className="transition-all duration-150 cursor-pointer"
            onMouseEnter={() => setHovered(arc.label)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="22" fontWeight="700" fill="currentColor">
          {active ? active.value : total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9.5" fill="currentColor" opacity="0.5">
          {active ? active.label : 'total'}
        </text>
        {active && (
          <text x={cx} y={cy + 28} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.4">
            {Math.round((active.value / total) * 100)}%
          </text>
        )}
      </svg>

      {/* Legend */}
      <div className="space-y-2">
        {segments.map(seg => (
          <div
            key={seg.label}
            className={cn(
              'flex items-center gap-2 cursor-default transition-opacity',
              hovered && hovered !== seg.label ? 'opacity-40' : 'opacity-100',
            )}
            onMouseEnter={() => setHovered(seg.label)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-xs text-gray-600 dark:text-gray-400">{seg.label}</span>
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-1">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
