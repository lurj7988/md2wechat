/**
 * Convert command - Convert Markdown to HTML
 */

import { Command } from 'commander';
import { Parser } from '../../core/parser';
import { Converter } from '../../core/converter';
import { readFile, writeFile, fileExists } from '../utils/helpers';
import { loadConfig } from '../utils/config';
import { logger } from '../utils/logger';

/**
 * Convert command implementation
 */
async function convertAction(
  input: string,
  output: string | undefined,
  options: {
    theme?: string;
    codeTheme?: string;
    stdout?: boolean;
  }
): Promise<void> {
  try {
    logger.title('Converting Markdown to HTML');

    // Check if input file exists
    if (!(await fileExists(input))) {
      logger.error(`Input file not found: ${input}`);
      process.exit(1);
    }

    logger.info(`Reading: ${input}`);

    // Read markdown content
    const markdown = await readFile(input);

    // Load configuration (theme defaults from config; flags override)
    const config = await loadConfig();

    // Parse markdown to HTML
    const parser = new Parser();
    const html = parser.parse(markdown);

    // Convert to WeChat format
    const converter = new Converter({
      theme: options.theme || config.theme.name,
      codeTheme: options.codeTheme || config.theme.codeTheme
    });
    const result = await converter.process(html);

    // Output result
    if (options.stdout || !output) {
      console.log(result);
    } else {
      await writeFile(output, result);
      logger.success(`Output written to: ${output}`);
    }
  } catch (error) {
    logger.error((error as Error).message);
    process.exit(1);
  }
}

/**
 * Create convert command
 */
export default new Command()
  .name('convert')
  .description('Convert Markdown to HTML for WeChat Official Account')
  .argument('<input>', 'Input Markdown file path')
  .argument('[output]', 'Output HTML file path (optional, prints to stdout if not provided)')
  .option('-t, --theme <name>', 'Markdown theme (overrides config)')
  .option('-c, --code-theme <name>', 'Code highlight theme (overrides config)')
  .option('--stdout', 'Output to stdout instead of file')
  .action(convertAction);
