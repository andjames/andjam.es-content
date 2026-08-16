import type { APIRoute } from 'astro';
import { publishedEntries, routeFor } from '../../lib/content';

export const GET: APIRoute = async () => {
  const entries = (await publishedEntries()).slice(0, 8).map(entry => ({
    title: entry.data.title, type: entry.data.type, description: entry.data.description,
    url: routeFor(entry), date: entry.data.date?.toISOString().slice(0, 10), topics: entry.data.topics,
  }));
  return new Response(JSON.stringify(entries, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
