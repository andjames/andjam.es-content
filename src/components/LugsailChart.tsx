import { type ComponentType, useEffect, useState } from 'react';
import type { LugsailChartMeta, LugsailProject } from '../lugsail/types';
import ChordDiagram from '../lugsail/renderers/ChordDiagram';
import LineChart from '../lugsail/renderers/LineChart';

type Renderer = ComponentType<{ project: LugsailProject; meta: LugsailChartMeta }>;
const renderers: Record<string, Renderer> = {
  'rawgraphs.chorddiagram': ChordDiagram,
  'rawgraphs.linechart': LineChart,
};

export default function LugsailChart({ src, showMeta = true, ...meta }: { src: string; showMeta?: boolean } & LugsailChartMeta) {
  const [project, setProject] = useState<LugsailProject>();
  const [Renderer, setRenderer] = useState<Renderer>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error(`Could not load chart data (${response.status}).`);
        const nextProject = await response.json() as LugsailProject;
        if (nextProject.format !== 'lugsail-project') throw new Error('This is not a Lugsail project file.');
        const renderer = renderers[nextProject.project.chart];
        if (!renderer) throw new Error(`Chart type “${nextProject.project.chart}” is not supported yet.`);
        if (!cancelled) { setProject(nextProject); setRenderer(() => renderer); }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load this chart.');
      }
    }
    load();
    return () => { cancelled = true; };
  }, [src]);

  if (error) return <p className="lugsail-status" role="alert">{error}</p>;
  if (!project || !Renderer) return <p className="lugsail-status">Loading interactive chart…</p>;
  const theme = project.brandTheme ?? project.project.brandTheme;
  const resolvedMeta: LugsailChartMeta = {
    title: meta.title ?? theme?.title,
    subtitle: meta.subtitle ?? theme?.subtitle,
    source: meta.source,
    accentColor: meta.accentColor ?? theme?.secondaryColor,
  };
  return <Renderer project={project} meta={showMeta ? resolvedMeta : {}} />;
}
