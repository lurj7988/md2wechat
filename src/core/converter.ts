/**
 * HTML converter module for WeChat Official Account
 */

import juice from 'juice';
import { promises as fs } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../cli/utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Converter options
 */
export interface ConverterOptions {
  theme?: string;
  codeTheme?: string;
  themeBasePath?: string;
}

/**
 * CSS options for juice
 */
interface JuiceOptions {
  inlinePseudoElements: boolean;
  preserveImportant: boolean;
  removeStyleTags: boolean;
  preserveFonts: boolean;
  preserveMediaQueries: boolean;
  extraCss: string;
}

/**
 * HTML converter class
 */
export class Converter {
  private themeName: string;
  private codeThemeName: string;
  private themeBasePath: string;

  constructor(options: ConverterOptions = {}) {
    this.themeName = options.theme || 'default';
    this.codeThemeName = options.codeTheme || 'atom-one-dark';
    // Use package installation directory instead of current working directory
    this.themeBasePath = options.themeBasePath || resolve(__dirname, '../../themes');
  }

  /**
   * Load CSS files
   */
  private async loadCSS(): Promise<string> {
    const paths = [
      join(this.themeBasePath, 'basic.css'),
      join(this.themeBasePath, 'markdown', `${this.themeName}.css`),
      join(this.themeBasePath, 'code', `${this.codeThemeName}.css`)
    ];

    console.log('[DEBUG] themeBasePath:', this.themeBasePath);
    console.log('[DEBUG] themeName:', this.themeName);
    console.log('[DEBUG] codeThemeName:', this.codeThemeName);

    const cssArray = await Promise.all(
      paths.map(async (path) => {
        try {
          const css = await fs.readFile(path, 'utf-8');
          console.log('[DEBUG] Loaded:', path);
          return css;
        } catch (error) {
          logger.debug(`Theme file not found: ${path} - ${(error as Error).message}`);
          console.log('[DEBUG] NOT FOUND:', path);
          return '';
        }
      })
    );
    return cssArray.join('\n');
  }

  /**
   * Convert HTML to WeChat compatible format with inlined CSS
   */
  async convert(html: string): Promise<string> {
    const css = await this.loadCSS();

    const juiceOptions: JuiceOptions = {
      inlinePseudoElements: true,
      preserveImportant: true,
      removeStyleTags: true,
      preserveFonts: false,
      preserveMediaQueries: false,
      extraCss: ''
    };

    const result = juice.inlineContent(html, css, juiceOptions);
    return result;
  }

  /**
   * Wrap HTML content in container
   */
  wrapContent(content: string): string {
    return `<section id="nice">${content}</section>`;
  }

  /**
   * Process HTML with conversion and wrapping
   */
  async process(html: string): Promise<string> {
    // 先包装 #nice 容器，因为 CSS 选择器依赖它
    const wrapped = this.wrapContent(html);
    // 然后内联 CSS
    const css = await this.loadCSS();
    const juiceOptions: JuiceOptions = {
      inlinePseudoElements: true,
      preserveImportant: true,
      removeStyleTags: true,
      preserveFonts: false,
      preserveMediaQueries: false,
      extraCss: ''
    };
    return juice.inlineContent(wrapped, css, juiceOptions);
  }

  /**
   * Save HTML to file
   */
  async saveToFile(html: string, filePath: string): Promise<void> {
    const dir = dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, html, 'utf-8');
  }

  /**
   * Convert markdown file to HTML file
   */
  async convertFile(inputPath: string, outputPath: string): Promise<void> {
    const { Parser } = await import('./parser');
    const parser = new Parser();
    const html = await parser.parseFile(inputPath);
    const result = await this.process(html);
    await this.saveToFile(result, outputPath);
  }
}

/**
 * Convert HTML to WeChat format (convenience function)
 */
export async function convertToWeChat(
  html: string,
  options: ConverterOptions = {}
): Promise<string> {
  const converter = new Converter(options);
  return converter.process(html);
}

/**
 * Wrap HTML content (convenience function)
 */
export function wrapContent(content: string): string {
  return `<section id="nice">${content}</section>`;
}

export default { Converter, convertToWeChat, wrapContent };
