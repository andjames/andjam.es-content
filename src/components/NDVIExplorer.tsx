import { useState } from 'react';

export default function NDVIExplorer() {
  const [value, setValue] = useState(0.62);
  const state = value < 0.3 ? 'low vegetation' : value < 0.6 ? 'mixed vegetation' : 'healthy vegetation';
  return <section className="ndvi-explorer" aria-label="NDVI demonstration">
    <p className="eyebrow">Interactive demonstration</p>
    <label htmlFor="ndvi">Vegetation index: <output>{value.toFixed(2)}</output></label>
    <input id="ndvi" type="range" min="0" max="1" step="0.01" value={value} onChange={(event) => setValue(Number(event.target.value))} />
    <p aria-live="polite">This reading suggests <strong>{state}</strong>.</p>
  </section>;
}
