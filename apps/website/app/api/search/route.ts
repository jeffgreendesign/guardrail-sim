import { source } from '@/lib/source';
import { structure } from 'fumadocs-core/mdx-plugins';
import { createSearchAPI } from 'fumadocs-core/search/server';

// Build search indexes with structured data extracted from raw markdown
const indexes = await Promise.all(
  source.getPages().map(async (page) => {
    // Get the raw markdown content to extract structure
    const rawContent = page.data.getText?.() ?? '';
    const structuredData = structure(rawContent);

    return {
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      id: page.url,
      structuredData,
    };
  })
);

export const { GET } = createSearchAPI('advanced', {
  indexes,
});
