import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const link = z.object({ label: z.string(), url: z.string().url() });

const entries = defineCollection({
  loader: glob({ base: './src/content/entries', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    type: z.enum(['writing', 'project', 'experiment']),
    description: z.string(),
    date: z.coerce.date().optional(),
    updated: z.coerce.date().optional(),
    topics: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    canonical: z.string().url().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    status: z.string().optional(),
    technologies: z.array(z.string()).default([]),
    links: z.array(link).default([]),
    related: z.array(z.string()).default([]),
    role: z.string().optional(),
    layout: z.enum(['standard', 'custom']).default('standard'),
  }),
});

export const collections = { entries };
