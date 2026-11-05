(() => {
  const registry = [
    ['San Diego', 0], ['Los Angeles', 120], ['Santa Barbara', 205], ['Port San Luis', 295], ['Monterey', 405], ['San Francisco', 505], ['Point Reyes', 555], ['Arena Cove', 645], ['North Spit', 805], ['Crescent City', 950]
  ];
  const windows = [
    ['2015-10-01', '01–14 Oct 2015'], ['2015-12-03', '03–16 Dec 2015'], ['2016-01-01', '01–14 Jan 2016'], ['2016-02-12', '12–25 Feb 2016']
  ];
  const $ = selector => document.querySelector(selector);
  const fmt = d3.utcFormat('%d %b');
  let model = [], windowStart = new Date(`${windows[2][0]}T00:00:00Z`), pressureCorrection = true;

  function residualBins(hours, usePressure) {
    const source = hours.map(row => ({ date: new Date(row.t), value: +row.r, pressure: +row.p }));
    const referencePressure = d3.mean(source.filter(row => Number.isFinite(row.pressure)), row => row.pressure);
    const selected = source.map(row => ({ ...row, value: usePressure ? KelvinAnalysis.inverseBarometerResidual(row.value, row.pressure, referencePressure) : row.value })).filter(row => Number.isFinite(row.value));
    const step = 3 * 36e5, start = Math.ceil(+selected[0].date / step) * step, end = Math.floor(+selected.at(-1).date / step) * step;
    return d3.range(start, end + step, step).map(time => {
      const window = selected.filter(row => Math.abs(+row.date - time) <= 20 * 36e5);
      return { date: new Date(time), value: window.length >= 26 && KelvinAnalysis.continuous(window, 2 * 36e5) ? d3.mean(window, row => row.value) : null };
    });
  }

  function correlationAtLag(reference, target, lagHours) {
    const map = new Map(target.map(point => [+point.date, point.value]));
    return KelvinAnalysis.correlation(reference.flatMap(point => Number.isFinite(map.get(+point.date + lagHours * 36e5)) ? [[point.value, map.get(+point.date + lagHours * 36e5)]] : []));
  }

  function lagRows(fields) {
    const start = +windowStart, end = start + 14 * 864e5;
    const reference = fields[0].points.filter(point => +point.date >= start && +point.date < end && Number.isFinite(point.value));
    return fields.map((station, index) => {
      if (!index) return { ...station, lag: 0, r: 1, pairs: reference.length, weak: false };
      const target = station.points.filter(point => Number.isFinite(point.value));
      const scores = d3.range(-168, 169, 3).map(lag => ({ lag, r: correlationAtLag(reference, target, lag) })).filter(score => Number.isFinite(score.r));
      const best = d3.greatest(scores, score => score.r);
      const zero = scores.find(score => score.lag === 0);
      return { ...station, lag: best?.lag ?? null, r: best?.r ?? null, pairs: reference.length, weak: !best || reference.length < 24 || best.r < .45 || (best.lag && best.r - (zero?.r ?? -1) < .08) };
    });
  }

  function renderLag(fields) {
    const rows = lagRows(fields), mount = $('#benchmarkLag'), width = Math.max(540, mount.clientWidth), height = Math.max(205, rows.length * 25 + 40), margin = { top: 24, right: 55, bottom: 22, left: 120 };
    mount.innerHTML = ''; const svg = d3.select(mount).append('svg').attr('width', width).attr('height', height);
    const x = d3.scaleLinear().domain([-168, 168]).range([margin.left, width - margin.right]), y = d3.scaleBand().domain(rows.map(row => row.name)).range([margin.top, height - margin.bottom]).padding(.38), ticks = [-168, -120, -72, -24, 0, 24, 72, 120, 168];
    svg.selectAll('.guide').data(ticks).join('line').attr('x1', x).attr('x2', x).attr('y1', margin.top - 8).attr('y2', height - margin.bottom).attr('stroke', value => value === 0 ? '#d85d51' : '#c7d4cf').attr('stroke-width', value => value === 0 ? 1.5 : .7).attr('stroke-dasharray', value => value === 0 ? null : '2 3');
    svg.selectAll('.tick').data(ticks).join('text').attr('x', x).attr('y', 11).attr('text-anchor', 'middle').attr('font-family', 'DM Mono').attr('font-size', 8).attr('fill', '#60787d').text(value => value ? `${value > 0 ? '+' : ''}${value}` : '0 h');
    svg.selectAll('.station').data(rows).join('text').attr('x', margin.left - 9).attr('y', row => y(row.name) + y.bandwidth() / 2 + 3).attr('text-anchor', 'end').attr('font-family', 'DM Mono').attr('font-size', 8).attr('fill', '#31545e').text(row => row.name);
    svg.selectAll('.dot').data(rows.filter(row => row.lag !== null)).join('circle').attr('cx', row => x(row.lag)).attr('cy', row => y(row.name) + y.bandwidth() / 2).attr('r', row => row.weak ? 4 : 5).attr('fill', row => row.weak ? '#f5f2eb' : '#d85d51').attr('stroke', '#31545e').attr('stroke-width', 1.1).append('title').text(row => `${row.name}: ${row.lag > 0 ? '+' : ''}${row.lag} h, r=${row.r.toFixed(2)}${row.weak ? ' (weak/unstable)' : ''}`);
    const stable = rows.slice(1).filter(row => !row.weak && row.lag > 0);
    const increasing = stable.length >= 2 && stable.every((row, index) => !index || row.lag >= stable[index - 1].lag);
    $('#benchmarkVerdict').innerHTML = increasing ? '<b>Some stations have stable, later best-fit lags in this window.</b> This is a method check, not proof of one shared traveling wave.' : '<b>No consistent northward progression is resolved in this selected window.</b> That is a valid benchmark result; inspect another window and the uncorrected sensitivity.';
  }

  function renderField(fields) {
    const mount = $('#benchmarkField'), width = mount.clientWidth, height = mount.clientHeight, margin = { top: 11, right: 14, bottom: 31, left: 132 }, start = +windowStart, end = start + 14 * 864e5;
    const rows = fields.flatMap(station => station.points.filter(point => +point.date >= start && +point.date < end).map(point => ({ ...point, station })));
    const values = rows.map(row => Math.abs(row.value)).filter(Number.isFinite).sort(d3.ascending), limit = Math.max(4, d3.quantileSorted(values, .9) || 4);
    mount.innerHTML = ''; const svg = d3.select(mount).append('svg').attr('width', width).attr('height', height), x = d3.scaleUtc().domain([new Date(start), new Date(end)]).range([margin.left, width - margin.right]), y = d3.scaleLinear().domain([0, 950]).range([margin.top + 8, height - margin.bottom - 8]), color = d3.scaleLinear().domain([-limit, 0, limit]).range(['#287c9a', '#e8eadb', '#d6574f']).clamp(true), binWidth = Math.max(1, x(new Date(start + 3 * 36e5)) - x(new Date(start)) + .2);
    svg.selectAll('.row').data(fields).join('text').attr('x', margin.left - 9).attr('y', station => y(station.miles) + 3).attr('text-anchor', 'end').attr('font-family', 'DM Mono').attr('font-size', 8).attr('fill', '#d3e1de').text(station => `${station.name} · ${station.miles} mi`);
    svg.selectAll('.guide').data(fields).join('line').attr('x1', margin.left).attr('x2', width - margin.right).attr('y1', station => y(station.miles)).attr('y2', station => y(station.miles)).attr('stroke', '#6c9197').attr('stroke-opacity', .35).attr('stroke-dasharray', '2 3');
    svg.selectAll('.cell').data(rows.filter(row => Number.isFinite(row.value))).join('rect').attr('x', row => x(row.date)).attr('y', row => y(row.station.miles) - 7).attr('width', binWidth).attr('height', 14).attr('fill', row => color(row.value)).append('title').text(row => `${row.station.name} · ${row.date.toISOString()} · ${row.value.toFixed(1)} cm`);
    svg.selectAll('.date').data(d3.utcDay.every(2).range(new Date(start), new Date(end))).join('text').attr('x', date => x(date)).attr('y', height - 9).attr('text-anchor', 'middle').attr('font-family', 'DM Mono').attr('font-size', 8).attr('fill', '#a8c4c1').text(fmt);
    $('#benchmarkRange').textContent = `${fmt(new Date(start)).toUpperCase()}–${fmt(new Date(end - 864e5)).toUpperCase()} · ±${limit.toFixed(1)} CM`;
    renderLag(fields);
  }

  function render() {
    const fields = model.map(station => ({ ...station, points: residualBins(station.hours, pressureCorrection) }));
    renderField(fields);
  }

  async function init() {
    const select = $('#benchmarkWindow');
    select.innerHTML = windows.map(([date, label], index) => `<option value="${date}" ${index === 2 ? 'selected' : ''}>${label}</option>`).join('');
    select.addEventListener('change', event => { windowStart = new Date(`${event.target.value}T00:00:00Z`); render(); });
    $('#benchmarkPressure').addEventListener('change', event => { pressureCorrection = event.target.checked; render(); });
    try {
      const response = await fetch('data/benchmark-2015-16.json'); if (!response.ok) throw new Error('missing');
      const payload = await response.json(); const miles = new Map(registry);
      model = payload.stations.filter(station => miles.has(station.name)).map(station => ({ ...station, miles: miles.get(station.name) })).sort((a, b) => a.miles - b.miles);
      $('#benchmarkStatus').textContent = `${model.length} gauges · ${payload.start}–${payload.end}`;
      render();
    } catch { $('#benchmarkStatus').textContent = 'Benchmark cache unavailable.'; }
  }
  init();
})();
