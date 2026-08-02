import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// fumadocs-core builds the index from the loader directly. The previous version
// assembled `indexes` by hand in a top-level await and called `page.data.getText()`,
// which in fumadocs-mdx 15 reads from disk relative to cwd — and this repo's docs
// live outside the app (source.config.ts points at ../../docs), so that read fails
// during Next's page-data collection.
export const { GET } = createFromSource(source);
