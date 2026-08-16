import { getCollection, type CollectionEntry } from 'astro:content';

export type Entry = CollectionEntry<'entries'>;
export const isPublished = (entry: Entry) => !entry.data.draft;
export const publishedEntries = async () => (await getCollection('entries', isPublished))
  .sort((a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0));
export const routeFor = (entry: Entry) => `/${entry.data.type === 'writing' ? 'writing' : `${entry.data.type}s`}/${entry.id}/`;
export const formatDate = (date?: Date) => date && new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
export const relatedEntries = async (entry: Entry) => {
  const all = await publishedEntries();
  const explicit = new Set(entry.data.related);
  return all.filter((candidate) => candidate.id !== entry.id && (explicit.has(candidate.id) || candidate.data.topics.some((topic) => entry.data.topics.includes(topic)))).slice(0, 3);
};
