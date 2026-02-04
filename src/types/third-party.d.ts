/**
 * Type declarations for third-party modules without types
 */

declare module 'markdown-it-deflist' {
  import { PluginSimple } from 'markdown-it';
  const deflist: PluginSimple;
  export default deflist;
}

declare module 'markdown-it-implicit-figures' {
  import { PluginSimple } from 'markdown-it';
  const implicitFigures: PluginSimple;
  export default implicitFigures;
}

declare module 'markdown-it-table-of-contents' {
  import { PluginWithOptions } from 'markdown-it';
  interface TableOfContentsOptions {
    includeLevel?: number[];
    containerClass?: string;
    slugify?: (s: string) => string;
    markerPattern?: RegExp;
    listType?: 'ul' | 'ol';
    format?: (x: string, htmlencode: (s: string) => string) => string;
    transformLink?: (link: string) => string;
  }
  const tableOfContents: PluginWithOptions<TableOfContentsOptions>;
  export default tableOfContents;
}
