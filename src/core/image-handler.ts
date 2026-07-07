/**
 * Image handler module for processing and uploading images
 */

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';
import { WeChatApi } from './wechat-api';
import { logger } from '../cli/utils/logger';

/**
 * Image map type for local to WeChat URL mapping
 */
export interface ImageMap {
  [localPath: string]: string;
}

/**
 * Image handler options
 */
export interface ImageHandlerOptions {
  baseDir?: string;
  wechatApi: WeChatApi;
}

/**
 * Image handler class for processing and uploading images
 */
export class ImageHandler {
  private wechatApi: WeChatApi;
  private baseDir: string;

  constructor(options: ImageHandlerOptions) {
    this.wechatApi = options.wechatApi;
    this.baseDir = options.baseDir || process.cwd();
  }

  /**
   * Extract local image paths from HTML
   */
  extractLocalImages(html: string): string[] {
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
    const images: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      // 判断是否为本地路径
      if (!src.startsWith('http://') && !src.startsWith('https://')) {
        images.push(src);
      }
    }

    return images;
  }

  private isDataImage(src: string): boolean {
    return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(src);
  }

  private async materializeDataImage(src: string): Promise<string> {
    const match = src.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid data image URI');
    }

    const extension = match[1].replace('jpeg', 'jpg').split('+')[0];
    const content = Buffer.from(match[2], 'base64');
    const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);
    const dir = join(tmpdir(), 'md2wechat-images');
    const filePath = join(dir, `${hash}.${extension}`);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content);
    return filePath;
  }

  /**
   * Upload single image to WeChat server
   */
  async uploadToWechat(imagePath: string, type: 'image' | 'thumb' = 'image'): Promise<string> {
    const fullPath = this.isDataImage(imagePath)
      ? await this.materializeDataImage(imagePath)
      : resolve(this.baseDir, imagePath);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      logger.warning(`Image file not found: ${imagePath}`);
      return imagePath;
    }

    try {
      if (type === 'thumb') {
        return await this.wechatApi.uploadThumb(fullPath);
      } else {
        const result = await this.wechatApi.uploadImage(fullPath);
        return result.url;
      }
    } catch (error) {
      logger.error(`Failed to upload image: ${imagePath} - ${(error as Error).message}`);
      return imagePath; // 失败时保留原路径
    }
  }

  /**
   * Upload multiple images to WeChat server
   */
  async uploadImages(images: string[], type: 'image' | 'thumb' = 'image'): Promise<ImageMap> {
    const map: ImageMap = {};

    for (const image of images) {
      map[image] = await this.uploadToWechat(image, type);
    }

    return map;
  }

  /**
   * Replace image URLs in HTML
   */
  replaceImageUrls(html: string, urlMap: ImageMap): string {
    let result = html;

    for (const [localPath, wechatUrl] of Object.entries(urlMap)) {
      const escapedPath = localPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(`src="${escapedPath}"`, 'gi'), `src="${wechatUrl}"`);
    }

    return result;
  }

  /**
   * Process all images in HTML
   */
  async processImages(html: string, type: 'image' | 'thumb' = 'image'): Promise<string> {
    const localImages = this.extractLocalImages(html);

    if (localImages.length === 0) {
      return html;
    }

    logger.info(`Found ${localImages.length} local image(s), uploading...`);
    const urlMap = await this.uploadImages(localImages, type);
    return this.replaceImageUrls(html, urlMap);
  }

  /**
   * Set base directory for resolving relative paths
   */
  setBaseDir(dir: string): void {
    this.baseDir = dir;
  }
}

export default ImageHandler;
