import { curveBumpX, curveLinear, extent, interpolateSpectral, line, scaleLinear, scaleTime, timeFormat } from 'd3';
import { useMemo } from 'react';
import type { LugsailChartMeta, LugsailProject } from '../types';
import LugsailChartMetaBlock from '../../components/LugsailChartMeta';

type Point = { date: Date; value: number; series: string };

export default function LineChart({ project, meta }: { project: LugsailProject; meta: LugsailChartMeta }) {
  const { rawData, mapping, userInput, visualOptions = {} } = project.project;
  const xColumn = mapping.x?.value?.[0];
  const yColumn = mapping.y?.value?.[0];
  const seriesColumn = mapping.lines?.value?.[0];
  const model = useMemo(() => {
    const headerLine = userInput?.split(/\r?\n/, 1)[0] ?? '';
    const delimiter = headerLine.includes('\t') ? '\t' : ',';
    const headers = headerLine.split(delimiter);
    const indexFor = (key: 'x' | 'y' | 'lines', column?: string) => {
      const headerIndex = headers.indexOf(column ?? '');
      if (headerIndex >= 0 && headerIndex < (rawData[0]?.length ?? 0)) return headerIndex;
      const id = Number(mapping[key]?.ids?.[0]);
      const idIndex = id - 1;
      return Number.isInteger(id) && id > 0 && idIndex < (rawData[0]?.length ?? 0) ? idIndex : -1;
    };
    const xIndex = indexFor('x', xColumn); const yIndex = indexFor('y', yColumn); const seriesIndex = indexFor('lines', seriesColumn);
    if (xIndex < 0 || yIndex < 0) return undefined;
    const points: Point[] = rawData.map(row => ({ date: new Date(row[xIndex]), value: Number(row[yIndex]), series: seriesIndex >= 0 ? row[seriesIndex] : yColumn ?? 'Series' }))
      .filter(point => !Number.isNaN(point.date.getTime()) && Number.isFinite(point.value))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const series = Array.from(new Set(points.map(point => point.series)));
    return { points, series };
  }, [mapping, rawData, seriesColumn, userInput, xColumn, yColumn]);

  if (!model || model.points.length === 0) return <p className="lugsail-status" role="alert">This Lugsail project is missing usable x- and y-axis data.</p>;
  const width = Number(visualOptions.width ?? 1200); const height = Number(visualOptions.height ?? 675);
  const margin = { top: Number(visualOptions.marginTop ?? 20), right: Number(visualOptions.marginRight ?? 24), bottom: Number(visualOptions.marginBottom ?? 54), left: Number(visualOptions.marginLeft ?? 72) };
  const [minDate, maxDate] = extent(model.points, point => point.date) as [Date, Date];
  const [minValue, maxValue] = extent(model.points, point => point.value) as [number, number];
  const x = scaleTime().domain([minDate, maxDate]).range([margin.left, width - margin.right]);
  const y = scaleLinear().domain([visualOptions.yOrigin ? 0 : minValue, maxValue]).nice().range([height - margin.bottom, margin.top]);
  const generator = line<Point>().x(point => x(point.date)).y(point => y(point.value)).curve(visualOptions.interpolation === 'curveBumpX' ? curveBumpX : curveLinear);
  const formatDate = timeFormat('%b %-d');
  const formatValue = (value: number) => value >= 1e12 ? `$${(value / 1e12).toFixed(1)}T` : value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const pointsFor = (series: string) => model.points.filter(point => point.series === series);

  return <figure className="lugsail-chart"><LugsailChartMetaBlock {...meta} /><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="lugsail-line-title" style={{ background: String(visualOptions.background ?? '#fff') }}><title id="lugsail-line-title">{meta.title ?? `${yColumn ?? 'Value'} over time`}</title>
    {visualOptions.showGrid !== false && y.ticks(5).map(tick => <line key={tick} className="lugsail-grid" x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} />)}
    <line className="lugsail-axis" x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} />
    <line className="lugsail-axis" x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} />
    {x.ticks(5).map(tick => <text key={tick.toISOString()} className="lugsail-tick" x={x(tick)} y={height - margin.bottom + 20} textAnchor="middle">{formatDate(tick)}</text>)}
    {y.ticks(5).map(tick => <text key={tick} className="lugsail-tick" x={margin.left - 10} y={y(tick) + 4} textAnchor="end">{formatValue(tick)}</text>)}
    {model.series.map((series, index) => <path key={series} className="lugsail-line" d={generator(pointsFor(series)) ?? undefined} stroke={interpolateSpectral(model.series.length === 1 ? .16 : index / (model.series.length - 1))}>
      <title>{series}</title>
    </path>)}
  </svg></figure>;
}
