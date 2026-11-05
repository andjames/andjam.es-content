(() => {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet'; stylesheet.href = 'dashboard/sst.css'; document.head.appendChild(stylesheet);

  const section = document.createElement('section');
  section.className = 'sst-context';
  section.innerHTML = `<div class="sst-copy"><div class="eyebrow">SURFACE-WARMTH CONTEXT / EXPLORATORY</div><h2>Does surface warmth move up the coast?</h2><p>Daily Copernicus OSTIA foundation sea-surface temperature sampled at fixed offshore grid cells from northern Baja to southern Oregon. Color shows each cell’s temperature relative to its preceding seven-day mean. Rows are measured grid-cell values: blank cells are not filled and space between rows is not an estimate.</p><p class="sst-status" id="sstStatus">SST cache not loaded.</p></div><div class="sst-card"><div class="card-top"><span>DAILY SST ANOMALY <b>°C</b></span><span id="sstUpdated">WAITING FOR DATA</span></div><div class="sst-legend"><span>cooler than local week</span><span>local 7-day mean</span><span>warmer than local week</span></div><div id="sstViz" aria-live="polite"></div></div>`;
  const anchor = document.querySelector('.satellite-context') || document.querySelector('.sources');
  anchor.insertAdjacentElement('afterend', section);

  function message(text) {
    document.querySelector('#sstStatus').textContent = text;
    document.querySelector('#sstViz').innerHTML = '<div class="sst-empty">Daily SST context will appear after the Copernicus cache has been refreshed.</div>';
  }

  function anomalies(points) {
    const byStation = d3.group(points, point => point.station);
    return points.map(point => {
      const station = [...byStation.get(point.station)].sort((a, b) => a.date.localeCompare(b.date));
      const index = station.findIndex(candidate => candidate.date === point.date);
      const prior = station.slice(Math.max(0, index - 7), index);
      const baseline = prior.length >= 5 ? d3.mean(prior, candidate => candidate.sst_c) : null;
      return { ...point, anomaly_c: Number.isFinite(baseline) ? point.sst_c - baseline : null };
    });
  }

  function render(points, updatedAt, exclusions = []) {
    const mount = document.querySelector('#sstViz');
    const stations = [...new Set(points.map(point => point.station))];
    const dates = [...new Set(points.map(point => point.date))].sort();
    const width = Math.max(320, mount.clientWidth);
    const height = Math.max(270, stations.length * 19 + 38);
    const margin = { top: 10, right: 10, bottom: 28, left: 146 };
    const rows = anomalies(points);
    const valid = rows.filter(point => Number.isFinite(point.anomaly_c));
    const range = Math.max(.5, Math.ceil((d3.max(valid, point => Math.abs(point.anomaly_c)) || .5) * 2) / 2);
    const x = d3.scaleBand().domain(dates).range([margin.left, width - margin.right]).padding(0);
    const y = d3.scaleBand().domain(stations).range([margin.top, height - margin.bottom]).padding(.1);
    const color = d3.scaleLinear().domain([-range, 0, range]).range(['#287c9a', '#e8eadb', '#d6574f']).clamp(true);
    mount.innerHTML = '';
    const svg = d3.select(mount).append('svg').attr('width', width).attr('height', height).attr('aria-label', 'Daily offshore sea surface temperature anomaly along the California coastal transect');
    svg.selectAll('.sst-cell').data(rows).join('rect').attr('class', 'sst-cell')
      .attr('x', point => x(point.date)).attr('y', point => y(point.station))
      .attr('width', x.bandwidth()).attr('height', y.bandwidth())
      .attr('fill', point => Number.isFinite(point.anomaly_c) ? color(point.anomaly_c) : '#d8dfd8')
      .append('title').text(point => Number.isFinite(point.anomaly_c)
        ? `${point.station} · ${point.date} · ${point.sst_c.toFixed(1)} °C · ${point.anomaly_c >= 0 ? '+' : ''}${point.anomaly_c.toFixed(2)} °C vs preceding 7-day mean`
        : `${point.station} · ${point.date} · insufficient prior daily observations`);
    svg.selectAll('.sst-label').data(stations).join('text').attr('x', margin.left - 8)
      .attr('y', station => y(station) + y.bandwidth() / 2 + 3).attr('text-anchor', 'end')
      .attr('font-family', 'DM Mono').attr('font-size', 8).attr('fill', '#31545e')
      .text(station => station.replace(' offshore', ''));
    svg.selectAll('.sst-date').data(dates.filter((_, index) => index % 14 === 0 || index === dates.length - 1)).join('text')
      .attr('x', date => x(date) + x.bandwidth() / 2).attr('y', height - 8).attr('text-anchor', 'middle')
      .attr('font-family', 'DM Mono').attr('font-size', 8).attr('fill', '#60787d').text(date => date.slice(5));
    const exclusionNote = exclusions.length ? ` · ${exclusions.map(item => item.station.replace(' offshore', '')).join(', ')} omitted: no valid sampled SST.` : '';
    document.querySelector('#sstStatus').textContent = `${valid.length} valid daily point-days · fixed offshore samples · ±${range.toFixed(1)} °C anomaly scale${exclusionNote}`;
    document.querySelector('#sstUpdated').textContent = updatedAt ? `UPDATED ${updatedAt.slice(0, 10)}` : 'NRT EXTRACT';
  }

  window.loadSstContext = async ({ start, end }) => {
    try {
      const response = await fetch('data/sst-transect.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('extract unavailable');
      const payload = await response.json();
      const points = (payload.points || []).filter(point => point.date >= start && point.date <= end);
      if (!points.length) throw new Error('empty extract');
      render(points, payload.updated_at, payload.exclusions || []);
    } catch {
      message('SST extract not found. Run scripts/fetch_sst.py to create the local Copernicus cache.');
    }
  };
  message('SST cache not loaded. NOAA gauge analysis remains available.');
})();
