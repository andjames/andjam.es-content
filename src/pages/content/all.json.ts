import type { APIRoute } from 'astro';
import { publishedEntries, routeFor } from '../../lib/content';
export const GET: APIRoute = async () => new Response(JSON.stringify((await publishedEntries()).map(entry => ({ title: entry.data.title, type: entry.data.type, description: entry.data.description, url: routeFor(entry), date: entry.data.date?.toISOString().slice(0, 10), topics: entry.data.topics })), null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
