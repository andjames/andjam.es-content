import { arc, chord, ribbon, type ChordGroup, interpolateSpectral } from 'd3';
import { useMemo, useRef } from 'react';
import type { LugsailProject } from '../types';
import type { LugsailChartMeta } from '../types';
import LugsailChartMetaBlock from '../../components/LugsailChartMeta';

export default function ChordDiagram({ project, meta }: { project: LugsailProject; meta: LugsailChartMeta }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { rawData, mapping, userInput, visualOptions = {} } = project.project;
  const sourceColumn = mapping.source?.value?.[0];
  const targetColumn = mapping.target?.value?.[0];
  const sizeColumn = mapping.size?.value?.[0];

  const model = useMemo(() => {
    const headers = userInput?.split(/\r?\n/, 1)[0]?.split(',') ?? [];
    const indexFor = (key: 'source' | 'target' | 'size', column?: string) => {
      const id = Number(mapping[key]?.ids?.[0]);
      if (Number.isInteger(id) && id > 0) return id - 1;
      return headers.indexOf(column ?? '');
    };
    const sourceIndex = indexFor('source', sourceColumn);
    const targetIndex = indexFor('target', targetColumn);
    const sizeIndex = indexFor('size', sizeColumn);
    if ([sourceIndex, targetIndex, sizeIndex].some(index => index < 0)) return undefined;
    const includesHeaders = rawData[0]?.[sourceIndex] === sourceColumn && rawData[0]?.[targetIndex] === targetColumn;
    const rows = includesHeaders ? rawData.slice(1) : rawData;
    const labels = Array.from(new Set(rows.flatMap(row => [row[sourceIndex!], row[targetIndex!]])).values()).filter(Boolean);
    const index = new Map(labels.map((label, position) => [label, position]));
    const matrix = Array.from({ length: labels.length }, () => Array(labels.length).fill(0));
    rows.forEach(row => {
      const from = index.get(row[sourceIndex!]); const to = index.get(row[targetIndex!]);
      const value = Number(row[sizeIndex!]);
      if (from !== undefined && to !== undefined && Number.isFinite(value)) matrix[from][to] += value;
    });
    return { labels, matrix };
  }, [mapping, rawData, sizeColumn, sourceColumn, targetColumn, userInput]);

  if (!model) return <p className="lugsail-status" role="alert">This Lugsail project is missing a source, target, or size mapping.</p>;
  const width = 900; const height = 900; const outerRadius = 320; const innerRadius = 304;
  const layout = chord().padAngle(Number(visualOptions.chordPadding ?? 0.03) / 100)(model.matrix);
  const arcPath = arc<ChordGroup>().innerRadius(innerRadius).outerRadius(outerRadius);
  const ribbonPath = ribbon<any, any>().radius(innerRadius);
  const color = (index: number) => interpolateSpectral(model.labels.length === 1 ? .5 : index / (model.labels.length - 1));
  const highlight = (region: number | null) => {
    svgRef.current?.querySelectorAll<SVGPathElement>('[data-ribbon]').forEach(path => {
      const related = region === null || Number(path.dataset.source) === region || Number(path.dataset.target) === region;
      path.style.fillOpacity = related ? '.68' : '.09';
    });
  };

  return <figure className="lugsail-chart"><LugsailChartMetaBlock {...meta} /><svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="migration-chart-title"><title id="migration-chart-title">Migration flows between world regions</title><g transform={`translate(${width / 2},${height / 2})`}>
    {layout.groups.map(group => <g key={group.index} onPointerEnter={() => highlight(group.index)} onPointerLeave={() => highlight(null)}>
      <path d={arcPath(group) ?? undefined} fill={color(group.index)}><title>{`${model.labels[group.index]}: ${group.value.toFixed(2)} million people`}</title></path>
      {(() => { const angle = (group.startAngle + group.endAngle) / 2; const flip = angle > Math.PI / 2 && angle < Math.PI * 1.5; return <text className="lugsail-label" transform={`rotate(${(angle * 180 / Math.PI) - 90}) translate(${outerRadius + 18})${flip ? ' rotate(180)' : ''}`} textAnchor={flip ? 'end' : 'start'}>{model.labels[group.index]}</text>; })()}
    </g>)}
    {layout.map((item, index) => <path key={index} data-ribbon data-source={item.source.index} data-target={item.target.index} d={ribbonPath(item) ?? undefined} fill={color(item.source.index)} fillOpacity=".68"><title>{`${model.labels[item.source.index]} → ${model.labels[item.target.index]}: ${item.source.value.toFixed(2)} million people`}</title></path>)}
  </g></svg><figcaption>Hover a region to highlight its connections. Values are in millions of people.</figcaption></figure>;
}
