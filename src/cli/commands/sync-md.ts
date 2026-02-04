/**
 * Sync-md command - Sync Markdown to WeChat Official Account
 */

import { Command } from 'commander';
import { Parser } from '../../core/parser.js';
import { Converter } from '../../core/converter.js';
import { WeChatApi } from '../../core/wechat-api.js';
import { ImageHandler } from '../../core/image-handler.js';
import type { ArticleData } from '../../types/index.js';
import { readFile, fileExists, changeExtension, extractTitle, extractSummary, writeFile } from '../utils/helpers.js';
import { join } from 'path';
import { loadConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';

/**
 * Extract metadata from markdown frontmatter or content
 */
function extractMetadata(markdown: string): { title: string; summary: string } {
  // Try to extract from frontmatter
  const frontmatterMatch = markdown.match(/^---\n([\s\S]+?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const titleMatch = frontmatter.match(/title:\s*(.+)/);
    const summaryMatch = frontmatter.match(/summary:\s*(.+)/);
    const descMatch = frontmatter.match(/description:\s*(.+)/);

    return {
      title: titleMatch ? titleMatch[1].trim() : extractTitle(markdown),
      summary: summaryMatch ? summaryMatch[1].trim() : descMatch ? descMatch[1].trim() : extractSummary(markdown)
    };
  }

  return {
    title: extractTitle(markdown),
    summary: extractSummary(markdown)
  };
}

/**
 * Sync-md command implementation
 */
async function syncMdAction(
  input: string,
  options: {
    title?: string;
    author?: string;
    digest?: string;
    cover?: string;
    update?: string;
    index?: number;
  }
): Promise<void> {
  try {
    logger.title('Syncing Markdown to WeChat Official Account');

    // Check if input file exists
    if (!(await fileExists(input))) {
      logger.error(`Input file not found: ${input}`);
      process.exit(1);
    }

    // Load configuration
    const config = await loadConfig();

    logger.info(`Reading: ${input}`);

    // Read markdown content
    const markdown = await readFile(input);

    // Extract metadata
    const metadata = extractMetadata(markdown);
    const title = options.title || metadata.title;
    const author = options.author || config.wechat.defaultAuthor || '';
    const digest = options.digest || metadata.summary;

    logger.info(`Title: ${title}`);
    logger.info(`Author: ${author}`);

    // Parse markdown to HTML
    logger.debug('Parsing Markdown...');
    const parser = new Parser();
    const html = parser.parse(markdown);

    // Convert to WeChat format
    logger.debug('Converting to WeChat format...');
    const converter = new Converter({
      theme: config.theme.name,
      codeTheme: config.theme.codeTheme
    });
    const wechatHtml = await converter.process(html);

    // Save .wechat.html file for preview
    const wechatHtmlPath = changeExtension(input, '.wechat.html');
    await writeFile(wechatHtmlPath, wechatHtml);
    logger.success(`Preview saved to: ${wechatHtmlPath}`);

    // Initialize WeChat API
    logger.debug('Initializing WeChat API...');
    const wechatApi = new WeChatApi(config.wechat);

    // Upload cover image - WeChat API requires thumb_media_id for draft creation
    let thumbMediaId: string;
    if (options.cover) {
      logger.info(`Uploading cover image: ${options.cover}`);
      try {
        thumbMediaId = await wechatApi.uploadThumb(options.cover);
        logger.success('Cover image uploaded');
      } catch (error) {
        logger.warning(`Failed to upload cover image: ${(error as Error).message}`);
        // Fallback to default cover
        logger.info('Using default cover image');
        const defaultCoverPath = join(process.cwd(), 'default-cover.png');
        thumbMediaId = await wechatApi.uploadThumb(defaultCoverPath);
      }
    } else {
      logger.debug('Using default cover image');
      const defaultCoverPath = join(process.cwd(), 'default-cover.png');
      thumbMediaId = await wechatApi.uploadThumb(defaultCoverPath);
    }

    // Handle images in HTML
    logger.debug('Processing images...');
    const imageHandler = new ImageHandler({
      wechatApi,
      baseDir: process.cwd()
    });
    const processedHtml = await imageHandler.processImages(wechatHtml);

    // Create article data (remove undefined fields)
    const articleData: Record<string, unknown> = {
      title,
      author,
      content: processedHtml,
      thumbMediaId,  // WeChat API requires this for draft creation
      needOpenComment: 0,
      onlyFansCanComment: 0
    };

    // Only add digest if it's not empty
    if (digest) {
      articleData.digest = digest;
    }

    // Sync to WeChat
    if (options.update) {
      logger.info(`Updating draft: ${options.update}`);
      await wechatApi.updateDraft(options.update, options.index || 0, articleData as unknown as ArticleData);
      logger.success('Draft updated successfully');
    } else {
      logger.info('Creating new draft...');
      const result = await wechatApi.createDraft([articleData as unknown as ArticleData]);
      logger.success(`Draft created successfully! Media ID: ${result.mediaId}`);
    }
  } catch (error) {
    logger.error((error as Error).message);
    process.exit(1);
  }
}

/**
 * Create sync-md command
 */
export default new Command()
  .name('sync-md')
  .description('Sync Markdown file to WeChat Official Account draft')
  .argument('<input>', 'Input Markdown file path')
  .option('-t, --title <title>', 'Article title (auto-detected from markdown if not provided)')
  .option('-a, --author <author>', 'Author name')
  .option('-d, --digest <digest>', 'Article summary/digest')
  .option('--cover <path>', 'Cover image path')
  .option('-u, --update <media_id>', 'Update existing draft instead of creating new one')
  .option('-i, --index <number>', 'Article index in draft (for update, default: 0)', '0')
  .action(syncMdAction);
