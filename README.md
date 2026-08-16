# andjam.es-content

A small, static publishing subsystem for [andjam.es](https://andjam.es). It produces only `/writing/`, `/projects/`, `/experiments/`, `/notebook/`, feeds, and content JSON; it does not replace or redesign the existing homepage or portfolio.

## Architecture

- Astro builds static HTML with durable, trailing-slash URLs.
- One Git-backed Astro Content Collection (`src/content/entries`) has a required `type`: `writing`, `project`, or `experiment`.
- MDX is the normal authoring format. React is available only for focused interactive components, hydrated explicitly with a `client:*` directive.
- `public/` is copied to `dist/` without image processing or rewriting. Put byte-sensitive PNGs, WAVs, datasets, and binaries there.
- Metadata, schema.org JSON-LD, sitemap, and RSS are generated at build time. The central factual author record is `src/lib/site.ts`.

## Commands

```sh
npm install
npm run dev
npm run check
npm run build
npm run preview
npm run verify:assets
```

`npm run build` creates `dist/`. This is a static deployment artifact; no database, login, CMS, or server runtime is required.

## Add content

Create an `.mdx` file in `src/content/entries/`. The filename becomes the slug.

```mdx
---
title: A durable title
type: writing # writing | project | experiment
description: A concise, factual description.
date: 2026-08-16
topics: [satellite-data, data-sonification]
draft: false
---

Your MDX body goes here.
```

The lean shared schema also supports `updated`, `featured`, `canonical`, `image`, `imageAlt`, `status`, `technologies`, `links`, `related`, and `role`. Set `draft: true` to exclude an entry from routes, indexes, sitemap, RSS, `latest.json`, and `all.json`.

- **Writing** gets `/writing/[slug]/` and is suited to prose plus occasional embeds.
- **Projects** get `/projects/[slug]/`; optional role, status, technologies, and links display in the project presentation.
- **Experiments** get `/experiments/[slug]/`. An entry can be prose, or link to/host an iframe, Canvas, WebGL, map, audio, or a purpose-built component. When an experiment needs a radically different shell, add a focused page/layout rather than making all entries conform.

### Embed an interactive

Import a component in MDX and choose hydration deliberately:

```mdx
import NDVIExplorer from '../../components/NDVIExplorer';

<NDVIExplorer client:visible />
```

`client:visible` defers JavaScript until the component nears the viewport. Use `client:idle` or `client:load` only when the interaction requires it. MDX prose is server-rendered into static HTML regardless. `Ears on the Ground` is the working example.

## Generated feeds and homepage integration

- `/content/latest.json` contains the eight newest published entries.
- `/content/all.json` contains all published entries.
- `/rss.xml` is the combined Notebook feed; `/writing/rss.xml` is writing-only.
- `/sitemap-index.xml` is emitted by the sitemap integration.

The existing homepage can remain framework-free. Copy/adapt [examples/homepage-latest-content.js](examples/homepage-latest-content.js) and include a target such as `<section data-latest-content></section>`. It fetches `/content/latest.json` and renders links to the production paths. No Astro component is needed on the existing site.

## Assets and byte preservation

`public/` is the preservation boundary: Astro copies its files into `dist/` as static files. Use `public/images/`, `public/audio/`, `public/data/`, or `public/static/` for originals that must keep exact bytes. Do not import byte-sensitive files into an image optimization pipeline. `public/static/binary-fixture.bin` and `npm run verify:assets` demonstrate the copy check after a build.

## Integration with the current andjam.es deployment

Recommended: build this repository independently, then copy/sync only these paths from `dist/` into the existing site's final static artifact or hosting target: `writing/`, `projects/`, `experiments/`, `notebook/`, `content/`, `rss.xml`, `writing/rss.xml`, and the sitemap files. This keeps deployment ownership clear and does not let this project overwrite `/`, `/instrument/`, `/signal/`, or `llms.txt`.

Alternative: configure the existing site's deployment pipeline to download this repository's successful build artifact and merge the same allowlisted paths. This works well if both projects deploy from separate repositories; ensure the merge occurs after the existing site build and is restricted to the list above.

For either approach, configure the host's standard static fallback so `/writing/foo/` resolves to `/writing/foo/index.html` (most static hosts already do). Do not copy this repository's root `index.html`, and do not deploy its `llms.txt`—it deliberately has none. Add selected generated URLs manually to the existing, manually maintained `/llms.txt` as desired.

## SEO and retrieval

Every entry has a title, description, canonical URL, Open Graph/Twitter metadata, semantic `article`/heading structure, JSON-LD, sitemap membership, and RSS where relevant. Writing uses `Article`, projects use `SoftwareApplication`, and experiments use `CreativeWork`. The author is a reused reference in JSON-LD rather than a separately repeated, inflated profile page. Add `image` and accurate `imageAlt` to entries with an appropriate social/accessible image.

## Deliberate omissions

No CMS, database, authentication, analytics, heavyweight UI framework, client-side filtering, automatic asset optimization, current-site migration, or `llms.txt` generation. Keystatic can be layered onto the same collection files later without moving content.

## Importing selected Substack writing next

Start with 3–5 evergreen posts. Export/copy each into a single MDX file, preserve its original publication date, add a concise description/topics, replace embedded platform widgets with local images or small purpose-built components, and add a canonical URL only while the Substack copy remains the preferred canonical version. Review links, headings, image alt text, and any licensing/attribution before publishing; then add redirects on the existing host if you ultimately move canonical ownership.
