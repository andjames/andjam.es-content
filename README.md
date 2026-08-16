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
npm run deploy:prepare
npm run deploy:with-sitemap -- /path/to/downloaded/sitemap.xml
npm run preview
npm run verify:assets
```

`npm run build` creates `dist/`. `npm run deploy:prepare` rebuilds and creates a disposable `deploy/` directory containing only the approved publishing output. Neither command requires a database, login, CMS, or server runtime.

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

The lean shared schema also supports `updated`, `featured`, `canonical`, `image`, `imageAlt`, `status`, `technologies`, `links`, `related`, `role`, and `layout`. Set `draft: true` to exclude an entry from routes, indexes, sitemap, RSS, `latest.json`, and `all.json`.

- **Writing** gets `/writing/[slug]/` and is suited to prose plus occasional embeds.
- **Projects** get `/projects/[slug]/`; optional role, status, technologies, and links display in the project presentation.
- **Experiments** get `/experiments/[slug]/`. An entry can be prose, or link to/host an iframe, Canvas, WebGL, map, audio, or a purpose-built component. When an experiment needs a radically different shell, add a focused page/layout rather than making all entries conform.

Set `layout: custom` when an entry needs a fully bespoke route. It remains in indexes, related links, feeds, and JSON, but is excluded from the shared dynamic route. Create the matching focused Astro page (for example `src/pages/experiments/my-piece.astro`) and load/render that entry with `getEntry()` and `render()`. This is the intentional escape hatch for full-screen maps, audio instruments, or unusual project presentations.

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
- `/notebook/rss.xml` is the combined Notebook feed; `/writing/rss.xml` is writing-only.
- `/sitemap-index.xml` is emitted by the sitemap integration.

The existing homepage can remain framework-free. Copy/adapt [examples/homepage-latest-content.js](examples/homepage-latest-content.js) and include a target such as `<section data-latest-content></section>`. It fetches `/content/latest.json` and renders links to the production paths. No Astro component is needed on the existing site.

## Assets and byte preservation

`public/` is the preservation boundary: Astro copies its files into `dist/` as static files. Use `public/images/`, `public/audio/`, `public/data/`, or `public/static/` for originals that must keep exact bytes. Do not import byte-sensitive files into an image optimization pipeline. `public/static/binary-fixture.bin` and `npm run verify:assets` demonstrate the copy check after a build.

## Integration with the current andjam.es deployment

For the current cPanel/Apache deployment, run `npm run deploy:prepare` and upload/sync the contents of `deploy/` into the existing site document root. The folder contains only `writing/`, `projects/`, `experiments/`, `notebook/`, `content/`, `_astro/`, any needed public asset directories, and RSS files beneath their section paths. It contains no root `index.html`, `llms.txt`, `signal/`, `instrument/`, sitemap, or other current-site files.

`deploy/` is rebuilt from scratch and is safe to treat as disposable. It is generated only from the checksummed allowlist in `content/deployment-manifest.json`; the preparation script rejects forbidden paths before copying. For an eventual Git-based receiver, retain the additive-only [`integration/merge-content-output.mjs`](integration/merge-content-output.mjs) script. It additionally refuses to overwrite a destination file unless a previous manifest proves this repository owns it, and it never deletes destination files.

Configure Apache's normal directory-index behavior so `/writing/foo/` resolves to `/writing/foo/index.html` (the standard setup normally does). The standalone sitemap is for preview/validation only: preserve the existing site's sitemap for now, then generate one canonical site-wide sitemap after the site has a unified build process. Add selected generated URLs manually to the existing, manually maintained `/llms.txt` as desired.

### Optional sitemap update

To update the existing Google-indexed sitemap without discarding its current URLs, download the live `sitemap.xml` first, then run:

```sh
npm run deploy:with-sitemap -- /path/to/downloaded/sitemap.xml
```

This creates `deploy/sitemap.xml`. It preserves existing URL records, removes duplicate URLs, and adds only published content routes with their content dates. Drafts never appear because the source is `content/all.json`. Upload this single file only when you want to update the current site's sitemap; `npm run deploy:prepare` continues to exclude it by default.

### Eventual automated deployment

`validate.yml` verifies every pull request and `main` build. Do not add a production receiver until the actual site source and host deployment process are known. At that point, make the existing site the sole deployer: check out this repository at a pinned commit, build it, run `integration/merge-content-output.mjs` against the existing site's completed static artifact, generate one combined sitemap, and deploy. The manifest means that transition preserves the same collision and no-delete guarantees used here.

## SEO and retrieval

Every entry has a title, description, canonical URL, Open Graph/Twitter metadata, semantic `article`/heading structure, JSON-LD, sitemap membership, and RSS where relevant. Writing uses `Article`, projects use `SoftwareApplication`, and experiments use `CreativeWork`. The author is a reused reference in JSON-LD rather than a separately repeated, inflated profile page. Add `image` and accurate `imageAlt` to entries with an appropriate social/accessible image.

