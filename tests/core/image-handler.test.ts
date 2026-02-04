/**
 * Tests for ImageHandler module
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ImageHandler } from '../../src/core/image-handler';

// Mock WeChatApi
const mockWeChatApi = {
  config: {},
  apiBaseUrl: '',
  accessToken: null,
  tokenExpireTime: 0,
  uploadImage: jest.fn(),
  uploadThumb: jest.fn(),
  getAccessToken: jest.fn(),
  refreshAccessToken: jest.fn(),
  uploadMaterial: jest.fn(),
  createDraft: jest.fn(),
  getDraftList: jest.fn(),
  getDraft: jest.fn(),
  updateDraft: jest.fn(),
  deleteDraft: jest.fn()
} as any;

describe('ImageHandler', () => {
  const testDir = join(process.cwd(), 'test-temp-image');
  let imageHandler: ImageHandler;

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });

    // Reset mocks
    jest.clearAllMocks();

    // Create image handler
    imageHandler = new ImageHandler({
      wechatApi: mockWeChatApi,
      baseDir: testDir
    });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create image handler with options', () => {
      const handler = new ImageHandler({
        wechatApi: mockWeChatApi,
        baseDir: testDir
      });
      expect(handler).toBeInstanceOf(ImageHandler);
    });

    it('should use current working directory as default baseDir', () => {
      const handler = new ImageHandler({
        wechatApi: mockWeChatApi
      });
      expect(handler).toBeInstanceOf(ImageHandler);
    });
  });

  describe('extractLocalImages', () => {
    it('should extract local image paths from HTML', () => {
      const html = '<img src="local.jpg" /><img src="/path/to/image.png" />';
      const images = imageHandler.extractLocalImages(html);
      expect(images).toEqual(['local.jpg', '/path/to/image.png']);
    });

    it('should ignore remote URLs', () => {
      const html = '<img src="https://example.com/image.jpg" /><img src="http://test.com/pic.png" />';
      const images = imageHandler.extractLocalImages(html);
      expect(images).toEqual([]);
    });

    it('should handle mixed local and remote images', () => {
      const html = `
        <img src="local1.jpg" />
        <img src="https://example.com/remote.jpg" />
        <img src="../local2.png" />
      `;
      const images = imageHandler.extractLocalImages(html);
      expect(images).toEqual(['local1.jpg', '../local2.png']);
    });

    it('should handle HTML without images', () => {
      const html = '<p>No images here</p>';
      const images = imageHandler.extractLocalImages(html);
      expect(images).toEqual([]);
    });

    it('should handle empty HTML', () => {
      const images = imageHandler.extractLocalImages('');
      expect(images).toEqual([]);
    });
  });

  describe('setBaseDir', () => {
    it('should set base directory', () => {
      const newBaseDir = join(testDir, 'new-base');
      imageHandler.setBaseDir(newBaseDir);
      expect(imageHandler).toBeInstanceOf(ImageHandler);
    });
  });

  describe('uploadToWechat', () => {
    it('should upload image and return URL', async () => {
      // Create test image file
      const imagePath = join(testDir, 'test.jpg');
      await fs.writeFile(imagePath, 'fake image content');

      (mockWeChatApi.uploadImage as jest.Mock).mockResolvedValue({
        url: 'https://mmbiz.qpic.cn/test.jpg'
      });

      const result = await imageHandler.uploadToWechat('test.jpg', 'image');
      expect(result).toBe('https://mmbiz.qpic.cn/test.jpg');
      expect(mockWeChatApi.uploadImage).toHaveBeenCalled();
    });

    it('should upload thumb and return media_id', async () => {
      const imagePath = join(testDir, 'thumb.jpg');
      await fs.writeFile(imagePath, 'fake thumb');

      (mockWeChatApi.uploadThumb as jest.Mock).mockResolvedValue('media_id_123');

      const result = await imageHandler.uploadToWechat('thumb.jpg', 'thumb');
      expect(result).toBe('media_id_123');
      expect(mockWeChatApi.uploadThumb).toHaveBeenCalled();
    });

    it('should return original path if file not found', async () => {
      const result = await imageHandler.uploadToWechat('nonexistent.jpg', 'image');
      expect(result).toBe('nonexistent.jpg');
    });

    it('should return original path if upload fails', async () => {
      const imagePath = join(testDir, 'test.jpg');
      await fs.writeFile(imagePath, 'content');

      (mockWeChatApi.uploadImage as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      const result = await imageHandler.uploadToWechat('test.jpg', 'image');
      expect(result).toBe('test.jpg');
    });
  });

  describe('uploadImages', () => {
    it('should upload multiple images', async () => {
      const image1 = join(testDir, 'img1.jpg');
      const image2 = join(testDir, 'img2.jpg');
      await fs.writeFile(image1, 'content1');
      await fs.writeFile(image2, 'content2');

      (mockWeChatApi.uploadImage as jest.Mock)
        .mockResolvedValueOnce({ url: 'https://example.com/img1.jpg' })
        .mockResolvedValueOnce({ url: 'https://example.com/img2.jpg' });

      const result = await imageHandler.uploadImages(['img1.jpg', 'img2.jpg'], 'image');
      expect(result).toEqual({
        'img1.jpg': 'https://example.com/img1.jpg',
        'img2.jpg': 'https://example.com/img2.jpg'
      });
    });
  });

  describe('replaceImageUrls', () => {
    it('should replace local URLs with WeChat URLs', () => {
      const html = '<img src="local.jpg" />';
      const urlMap = { 'local.jpg': 'https://mmbiz.qpic.cn/wechat.jpg' };
      const result = imageHandler.replaceImageUrls(html, urlMap);
      expect(result).toContain('src="https://mmbiz.qpic.cn/wechat.jpg"');
    });

    it('should handle special characters in paths', () => {
      const html = '<img src="image (1).jpg" />';
      const urlMap = { 'image (1).jpg': 'https://mmbiz.qpic.cn/test.jpg' };
      const result = imageHandler.replaceImageUrls(html, urlMap);
      expect(result).toContain('src="https://mmbiz.qpic.cn/test.jpg"');
    });

    it('should replace multiple images', () => {
      const html = '<img src="a.jpg" /><img src="b.png" />';
      const urlMap = {
        'a.jpg': 'https://example.com/a.jpg',
        'b.png': 'https://example.com/b.png'
      };
      const result = imageHandler.replaceImageUrls(html, urlMap);
      expect(result).toContain('src="https://example.com/a.jpg"');
      expect(result).toContain('src="https://example.com/b.png"');
    });
  });

  describe('processImages', () => {
    it('should process images in HTML', async () => {
      const imagePath = join(testDir, 'test.jpg');
      await fs.writeFile(imagePath, 'content');

      (mockWeChatApi.uploadImage as jest.Mock).mockResolvedValue({
        url: 'https://mmbiz.qpic.cn/test.jpg'
      });

      const html = '<img src="test.jpg" />';
      const result = await imageHandler.processImages(html);
      expect(result).toContain('https://mmbiz.qpic.cn/test.jpg');
    });

    it('should return original HTML if no local images', async () => {
      const html = '<img src="https://example.com/remote.jpg" />';
      const result = await imageHandler.processImages(html);
      expect(result).toBe(html);
    });

    it('should return original HTML if no images at all', async () => {
      const html = '<p>No images</p>';
      const result = await imageHandler.processImages(html);
      expect(result).toBe(html);
    });
  });
});
