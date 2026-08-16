import rss from '@astrojs/rss';
import { publishedEntries, routeFor } from '../../lib/content';
import { site } from '../../lib/site';
export async function GET() { const entries = (await publishedEntries()).filter(entry => entry.data.type === 'writing'); return rss({ title: `${site.name} — Writing`, description: 'Writing by Andrew James.', site: site.url, items: entries.map(entry => ({ title: entry.data.title, description: entry.data.description, pubDate: entry.data.date, link: routeFor(entry), categories: entry.data.topics })) }); }
