import type { CSSProperties } from 'react';
import type { LugsailChartMeta } from '../lugsail/types';

export default function LugsailChartMeta({ title, subtitle, source, accentColor }: LugsailChartMeta) {
  if (!title && !subtitle && !source) return null;
  const style = accentColor ? ({ '--lugsail-accent': accentColor } as CSSProperties) : undefined;
  return <header className="lugsail-chart-meta" style={style}>
    {title && <h2>{title}</h2>}
    {subtitle && <p>{subtitle}</p>}
    {source && <p className="lugsail-source">{source}</p>}
  </header>;
}
