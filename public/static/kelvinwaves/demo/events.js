/* Season field-log renderer.
   Add entries to src/data/season-events.json; the demo and embedded copies
   load the GitHub-hosted file first so the log can update independently. */
(() => {
  "use strict";
  const REMOTE_URL = "https://raw.githubusercontent.com/andjames/kelvinWaves/main/src/data/season-events.json";
  const mount = document.querySelector("#season-events");
  if (!mount) return;
  const formatDate = value => new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00Z`));
  const escape = value => String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
  })[character]);

  function render(events) {
    if (!events.length) {
      mount.innerHTML = '<p class="demo-events__empty">No season events logged yet.</p>';
      return;
    }
    mount.innerHTML = events
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(event => `<article class="season-event">
        <div class="season-event__date"><time datetime="${escape(event.date)}">${formatDate(event.date)}</time><span>${escape(event.place)}</span></div>
        <div class="season-event__body">
          <p class="season-event__kind">${escape(event.kind)}</p>
          <h4>${escape(event.title)}</h4>
          <p>${escape(event.summary)}</p>
          <details>
            <summary>Why this is in the log</summary>
            <p>${escape(event.why_it_matters)}</p>
            <p class="season-event__caveat"><b>Interpretation limit:</b> ${escape(event.caveat)}</p>
            <p class="season-event__sources">${(event.sources || []).map(source => `<a href="${escape(source.url)}" target="_blank" rel="noreferrer">${escape(source.label)} ↗</a>`).join("<span> · </span>")}</p>
          </details>
        </div>
      </article>`).join("");
  }

  async function load() {
    try {
      let response = await fetch(REMOTE_URL, { cache: "no-store" });
      if (!response.ok) response = await fetch("/static/kelvinwaves/data/season-events.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Event log unavailable");
      const payload = await response.json();
      render(payload.events || []);
    } catch (error) {
      console.warn("Season event log unavailable.", error);
      mount.innerHTML = '<p class="demo-events__empty">The event log is temporarily unavailable.</p>';
    }
  }
  load();
})();
