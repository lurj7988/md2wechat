/**
 * Markdown parser module
 */

import MarkdownIt from 'markdown-it';
import type { MarkdownItOptions } from '../types/index';
import type { CodeLayout } from '../types/index';
import hljs from '../highlight/lang';
import { logger } from '../cli/utils/logger';

// Import custom plugins
import mathPlugin from '../plugins/math';
import multiquotePlugin from '../plugins/multiquote';
import spanPlugin from '../plugins/span';
import tableContainerPlugin from '../plugins/table-container';
import liPlugin from '../plugins/li';
import taskListPlugin from '../plugins/task-list';

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
  codeLayout?: CodeLayout;
}

/**
 * Markdown parser class
 */
export class Parser {
  private md: MarkdownIt;

  constructor(options: ParserOptions = {}) {
    const { theme, macStyle = true, codeLayout = 'wrap', ...mdOptions } = options;
    const codeLayoutClass = `code-layout-${codeLayout}`;

    // breaks: true —— 软换行（单个 \n）渲染为 <br>，保留作者在引用块、
    // 段落中刻意分行书写的内容，避免两行被合并成一行而显得拥挤难看。
    // 放在 ...mdOptions 之前，调用方可通过传入 breaks: false 覆盖。
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
      highlight: this.createHighlighter(macStyle, codeLayout),
      ...mdOptions
    });

    this.registerPlugins();

    // markdown-it's indented code-block renderer keeps raw newlines. WeChat's
    // editor rebuilds those blocks and collapses the newlines into spaces, so
    // use explicit <br> elements just like fenced code blocks do.
    this.md.renderer.rules.code_block = (tokens, idx) => {
      const content = this.preserveLeadingIndentation(
        this.formatCodeText(this.md.utils.escapeHtml(tokens[idx].content))
      );
      return `<pre class="${codeLayoutClass}"><code>${content}</code></pre>\n`;
    };
  }

  /**
   * Make code text survive WeChat's HTML importer.
   *
   * Apostrophe/quote entities emitted by highlight.js are treated as literal
   * text by the editor and become `&amp;#x27;`. Quotes are safe as literal text
   * between tags, while spaces and newlines need explicit HTML representations.
   */
  private formatCodeText(text: string): string {
    return text
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\t/g, '    ')
      .replace(/\r?\n/g, '<br>')
      .replace(/ /g, '&nbsp;');
  }

  /**
   * Format only highlighted text nodes, never tag attributes. The previous
   * global whitespace replacement corrupted class names such as
   * `hljs-title class_` into `hljs-title&nbsp;class_`.
   */
  private formatHighlightedCode(html: string): string {
    const formatted = html
      .split(/(<[^>]+>)/g)
      .map((part) => (part.startsWith('<') ? part : this.formatCodeText(part)))
      .join('');
    return this.preserveLeadingIndentation(formatted);
  }

  /**
   * WeChat may merge repeated whitespace-only spans. Attach indentation to the
   * first real token on each line instead, because content-bearing nodes survive
   * the editor's reserialization. Plain-text lines are wrapped with their text.
   */
  private preserveLeadingIndentation(html: string): string {
    return html.replace(
      /(^|<br>)((?:&nbsp;)+)(<span\b[^>]*>|[^<]+)/g,
      (_match, lineStart: string, spaces: string, firstToken: string) => {
        const width = spaces.match(/&nbsp;/g)?.length || 0;
        const indentStyle = `display: inline-block; padding-left: ${width}ch;`;

        if (firstToken.startsWith('<span')) {
          const tokenWithIndent = /\sstyle="/.test(firstToken)
            ? firstToken.replace(/\sstyle="/, ` style="${indentStyle} `)
            : firstToken.replace(/>$/, ` style="${indentStyle}">`);
          return `${lineStart}${tokenWithIndent}`;
        }

        return `${lineStart}<span class="code-indented-text" style="${indentStyle}">${firstToken}</span>`;
      }
    );
  }

  /**
   * Create code highlighter
   */
  private createHighlighter(macStyle: boolean, codeLayout: CodeLayout): (code: string, lang: string) => string {
    return (str: string, lang: string): string => {
      // 默认语言为 bash
      const language = lang || 'bash';

      // 加上 custom 则表示自定义样式，而非微信专属，避免被 remove pre
      if (hljs.getLanguage(language)) {
        try {
          const highlighted = hljs.highlight(str, { language }).value;
          const formatted = this.formatHighlightedCode(highlighted);

          // Mac 风格窗口控制按钮
          const preClass = macStyle
            ? `custom mac-style code-layout-${codeLayout}`
            : `custom code-layout-${codeLayout}`;
          const macHeader = macStyle
            ? `<span class="mac-header">
  <span class="mac-dots">
    <span class="mac-dot red">●</span>
    <span class="mac-dot yellow">●</span>
    <span class="mac-dot green">●</span>
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

      const preClass = macStyle
        ? `custom mac-style code-layout-${codeLayout}`
        : `custom code-layout-${codeLayout}`;
      const formatted = this.preserveLeadingIndentation(
        this.formatCodeText(this.md.utils.escapeHtml(str))
      );
      return `<pre class="${preClass}"><code class="hljs">${formatted}</code></pre>`;
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
    this.md.use(taskListPlugin);
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
