import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { remarkStructure } from 'fumadocs-core/mdx-plugins';

export const docs = defineDocs({
  dir: '../../docs',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkStructure],
    rehypeCodeOptions: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});
