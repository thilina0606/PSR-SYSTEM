import React from 'react';

const colors = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#EC4899",
  "#84CC16",
  "#F97316",
  "#6366F1"
];

// Custom SVG Bar Chart
interface BarChartProps {
  data: Record<string, number>;
  title: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title }) => {
  const entries = Object.entries(data) as [string, number][];
  const maxValue = Math.max(...entries.map(([, val]) => val), 1);
  const chartHeight = 160;

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col h-full">
      <h3 className="text-sm font-semibold mb-6 tracking-tight" style={{ color: '#0F172A' }}>{title}</h3>
      {entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">No data available</div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex items-end justify-between gap-3 pt-4">
            {entries.map(([label, value], i) => {
              const barHeight = (value / maxValue) * chartHeight;
              const color = colors[i % colors.length];
              return (
                <div key={label} className="flex-1 flex flex-col items-center group">
                  <div className="w-full flex justify-center mb-1">
                    <span className="opacity-0 group-hover:opacity-100 bg-white border border-slate-200 text-[10px] py-0.5 px-1.5 rounded transition-opacity absolute -translate-y-6 pointer-events-none shadow-sm font-semibold" style={{ color: '#0F172A' }}>
                      {value}
                    </span>
                  </div>
                  <div
                    className="w-full rounded-md transition-all duration-300 relative cursor-pointer"
                    style={{ 
                      height: `${Math.max(barHeight, 6)}px`,
                      backgroundColor: `${color}20`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = `${color}20`;
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 rounded-md" />
                  </div>
                  <span className="text-[10px] font-medium truncate w-full text-center mt-2.5" style={{ color: '#334155' }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Custom Legend Badges */}
          <div className="flex flex-wrap gap-2 mt-6 justify-center">
            {entries.map(([label, value], i) => {
              const color = colors[i % colors.length];
              return (
                <div 
                  key={label}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderColor: '#E2E8F0',
                    color: '#334155',
                    borderWidth: '1px'
                  }}
                >
                  <div 
                    className="w-2 h-2 rounded-full shrink-0" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate max-w-[120px]">{label}</span>
                  <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Custom SVG Line Chart
interface LineChartProps {
  data: Record<string, number>;
  title: string;
}

const formatMonth = (monthStr: string) => {
  const parts = monthStr.split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (month >= 1 && month <= 12) {
      return `${months[month - 1]} ${year}`;
    }
  }
  return monthStr;
};

export const LineChart: React.FC<LineChartProps> = ({ data, title }) => {
  const sortedMonths = Object.keys(data).sort();
  const values = sortedMonths.map(m => data[m]);
  const maxValue = Math.max(...values, 1);
  const chartHeight = 160;
  const chartWidth = 320;
  const padding = 28;

  // Generate SVG path coordinates
  const points = sortedMonths.map((_, index) => {
    const x = sortedMonths.length === 1
      ? chartWidth / 2
      : padding + (index / (sortedMonths.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - (values[index] / maxValue) * (chartHeight - padding * 2 - 12);
    return { x, y };
  });

  // Smooth bezier curve through points
  const getBezierPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    if (pts.length === 2) {
      return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    }
    
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const pathD = getBezierPath(points);
  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`
    : '';

  const primaryColor = colors[0];

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col h-full">
      <h3 className="text-sm font-semibold mb-6 tracking-tight" style={{ color: '#0F172A' }}>{title}</h3>
      {sortedMonths.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">No data available</div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          <div className="relative w-full">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primaryColor} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={primaryColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              {/* Grid Lines */}
              <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#CBD5E1" strokeWidth="1.5" />

              {/* Vertical coordinates lines */}
              {points.map((p, i) => (
                <line 
                  key={`v-grid-${i}`} 
                  x1={p.x} 
                  y1={padding} 
                  x2={p.x} 
                  y2={chartHeight - padding} 
                  stroke="#E2E8F0" 
                  strokeWidth="1" 
                  strokeDasharray="3 3" 
                />
              ))}

              {/* Area Under Curve */}
              {areaD && sortedMonths.length > 1 && <path d={areaD} fill="url(#lineGrad)" />}

              {/* Line Curve */}
              {pathD && sortedMonths.length > 1 && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={primaryColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* If only 1 data point, show an elegant vertical helper anchor line */}
              {sortedMonths.length === 1 && (
                <line
                  x1={chartWidth / 2}
                  y1={chartHeight - padding}
                  x2={chartWidth / 2}
                  y2={points[0].y}
                  stroke={primaryColor}
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}

              {/* Dots & Interactivity */}
              {points.map((p, i) => (
                <g key={i} className="group cursor-pointer">
                  {/* Hover visual vertical highlight */}
                  <line 
                    x1={p.x} 
                    y1={padding} 
                    x2={p.x} 
                    y2={chartHeight - padding} 
                    stroke={primaryColor} 
                    strokeWidth="1.5" 
                    strokeDasharray="2 2" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150" 
                  />

                  {/* Outer glow hover circle */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="10"
                    fill={primaryColor}
                    fillOpacity="0"
                    className="group-hover:fill-opacity-15 transition-all duration-200"
                  />

                  {/* Inner styled circle */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="5.5"
                    fill="#ffffff"
                    stroke={primaryColor}
                    strokeWidth="3"
                    className="transition-all duration-150 group-hover:scale-110"
                  />

                  {/* Tooltip Card (Always visible for clarity) */}
                  <g className="transition-all duration-150">
                    <rect
                      x={p.x - 20}
                      y={p.y - 30}
                      width="40"
                      height="18"
                      rx="5"
                      fill="#0F172A"
                    />
                    <text
                      x={p.x}
                      y={p.y - 18}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      className="text-[9px] font-bold"
                    >
                      {values[i]}
                    </text>
                    <path
                      d={`M ${p.x - 4} ${p.y - 12} L ${p.x + 4} ${p.y - 12} L ${p.x} ${p.y - 8} Z`}
                      fill="#0F172A"
                    />
                  </g>
                </g>
              ))}

              {/* X-Axis Month Labels */}
              {points.map((p, i) => (
                <text
                  key={`month-lbl-${i}`}
                  x={p.x}
                  y={chartHeight - 8}
                  textAnchor="middle"
                  fill="#475569"
                  className="text-[10px] font-semibold tracking-tight"
                >
                  {formatMonth(sortedMonths[i])}
                </text>
              ))}
            </svg>
          </div>

          {/* Custom Legend Badges */}
          <div className="flex justify-center gap-2 mt-6">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-full text-xs font-medium"
              style={{
                backgroundColor: '#F8FAFC',
                borderColor: '#E2E8F0',
                color: '#334155',
                borderWidth: '1px'
              }}
            >
              <div 
                className="w-2 h-2 rounded-full shrink-0" 
                style={{ backgroundColor: primaryColor }}
              />
              <span>Monthly Requests</span>
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {values.reduce((acc, curr) => acc + curr, 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Custom SVG Doughnut Chart
interface DoughnutChartProps {
  data: Record<string, number>;
  title: string;
}

export const DoughnutChart: React.FC<DoughnutChartProps> = ({ data, title }) => {
  const entries = Object.entries(data) as [string, number][];
  const total = entries.reduce((acc, [, val]) => acc + val, 0);

  let accumulatedPercent = 0;

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col h-full">
      <h3 className="text-sm font-semibold mb-6 tracking-tight" style={{ color: '#0F172A' }}>{title}</h3>
      {entries.length === 0 || total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">No data available</div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
              {entries.map(([label, value], i) => {
                const percent = total > 0 ? (value / total) * 100 : 0;
                const strokeDasharray = `${percent} ${100 - percent}`;
                const strokeDashoffset = 100 - accumulatedPercent + 25;
                accumulatedPercent += percent;
                const color = colors[i % colors.length];

                return (
                  <circle
                    key={label}
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke={color}
                    strokeWidth="4.5"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="hover:stroke-[5.5] cursor-pointer transition-all duration-150"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold" style={{ color: '#0F172A' }}>{total}</span>
              <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#475569' }}>Total</span>
            </div>
          </div>

          {/* Custom Legend Badges */}
          <div className="flex-1 flex flex-col gap-2 w-full justify-center">
            {entries.map(([label, value], i) => {
              const color = colors[i % colors.length];
              return (
                <div 
                  key={label}
                  className="inline-flex items-center justify-between gap-2 px-3 py-1.5 border rounded-full text-xs font-medium w-full"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderColor: '#E2E8F0',
                    color: '#334155',
                    borderWidth: '1px'
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate">{label}</span>
                  </div>
                  <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0">
                    {value} ({total > 0 ? ((value / total) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
