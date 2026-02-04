/**
 * Markdown parser module
 */

import MarkdownIt from 'markdown-it';
import type { MarkdownItOptions } from '../types/index';
import hljs from '../highlight/lang';
import { logger } from '../cli/utils/logger';

// Import custom plugins
import mathPlugin from '../plugins/math';
import multiquotePlugin from '../plugins/multiquote';
import spanPlugin from '../plugins/span';
import tableContainerPlugin from '../plugins/table-container';
import liPlugin from '../plugins/li';

// Import third-party plugins
import markdownItDeflist from 'markdown-it-deflist';
import markdownItImplicitFigures from 'markdown-it-implicit-figures';
import markdownItTableOfContents from 'markdown-it-table-of-contents';

/**
 * Parser options
 */
export interface ParserOptions extends MarkdownItOptions {
  theme?: string;
  macStyle?: boolean;
}

/**
 * Markdown parser class
 */
export class Parser {
  private md: MarkdownIt;

  constructor(options: ParserOptions = {}) {
    const { theme = 'default', macStyle = true, ...mdOptions } = options;

    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      highlight: this.createHighlighter(macStyle),
      ...mdOptions
    });

    this.registerPlugins();
  }

  /**
   * Create code highlighter
   */
  private createHighlighter(macStyle: boolean): (code: string, lang: string) => string {
    return (str: string, lang: string): string => {
      // 默认语言为 bash
      const language = lang || 'bash';

      // 加上 custom 则表示自定义样式，而非微信专属，避免被 remove pre
      if (hljs.getLanguage(language)) {
        try {
          const formatted = hljs
            .highlight(str, { language })
            .value.replace(/\n/g, '<br/>') // 换行用 br 表示
            .replace(/\s/g, '&nbsp;') // 用 nbsp 替换空格
            .replace(/span&nbsp;/g, 'span '); // span 标签修复

          // Mac 风格窗口控制按钮
          const preClass = macStyle ? 'custom mac-style' : 'custom';
          const macHeader = macStyle
            ? `<span class="mac-header">
  <span class="mac-dots">
    <span class="mac-dot red"></span>
    <span class="mac-dot yellow"></span>
    <span class="mac-dot green"></span>
  </span>
  <span class="mac-lang">${language}</span>
</span>`
            : '';
          const macBodyStart = macStyle ? `<span class="mac-body">` : '';
          const macBodyEnd = macStyle ? `</span>` : '';

          // 将 mac-header 移到 code 外部，避免随滚动条移动
          return `<pre class="${preClass}">${macHeader}<code class="hljs">${macBodyStart}${formatted}${macBodyEnd}</code></pre>`;
        } catch (e) {
          logger.error(`Highlight error: ${(e as Error).message}`);
        }
      }

      const preClass = macStyle ? 'custom mac-style' : 'custom';
      return `<pre class="${preClass}"><code class="hljs">${this.md.utils.escapeHtml(str)}</code></pre>`;
    };
  }

  /**
   * Register markdown-it plugins
   */
  private registerPlugins(): void {
    // Register custom plugins
    this.md.use(mathPlugin);
    this.md.use(multiquotePlugin);
    this.md.use(spanPlugin);
    this.md.use(tableContainerPlugin);
    this.md.use(liPlugin);

    // Register third-party plugins
    this.md.use(markdownItDeflist);
    this.md.use(markdownItImplicitFigures, { figcaption: true });
    this.md.use(markdownItTableOfContents, {
      transformLink: () => '',
      includeLevel: [2, 3],
      markerPattern: /^\[toc\]/im
    });
  }

  /**
   * Parse markdown string to HTML
   */
  parse(markdown: string): string {
    return this.md.render(markdown);
  }

  /**
   * Parse markdown file to HTML
   */
  async parseFile(filePath: string): Promise<string> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    return this.parse(content);
  }

  /**
   * Get the markdown-it instance
   */
  getMarkdownIt(): MarkdownIt {
    return this.md;
  }
}

/**
 * Create parser instance
 */
export function createParser(options: ParserOptions = {}): Parser {
  return new Parser(options);
}

/**
 * Render markdown to HTML (convenience function)
 */
export function render(markdown: string, options: ParserOptions = {}): string {
  const parser = createParser(options);
  return parser.parse(markdown);
}

export default { Parser, createParser, render };
