import { type ComponentType, useEffect, useState } from 'react';
import type { LugsailProject } from '../lugsail/types';
import ChordDiagram from '../lugsail/renderers/ChordDiagram';

type Renderer = ComponentType<{ project: LugsailProject }>;
const renderers: Record<string, Renderer> = {
  'rawgraphs.chorddiagram': ChordDiagram,
};

export default function LugsailChart({ src }: { src: string }) {
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
  return <Renderer project={project} />;
}
