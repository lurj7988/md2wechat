/**
 * Tests for Converter module
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Converter, convertToWeChat, wrapContent } from '../../src/core/converter';

// Mock juice module
jest.mock('juice', () => ({
  inlineContent: jest.fn((html: string) => {
    // Simple mock that returns HTML with CSS inlined comment
    return `<!-- CSS inlined -->${html}`;
  })
}));

describe('Converter', () => {
  const testDir = join(process.cwd(), 'test-temp-converter');
  let converter: Converter;

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    converter = new Converter();
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create converter with default options', () => {
      const defaultConverter = new Converter();
      expect(defaultConverter).toBeInstanceOf(Converter);
    });

    it('should create converter with custom options', () => {
      const customConverter = new Converter({
        theme: 'custom',
        codeTheme: 'monokai'
      });
      expect(customConverter).toBeInstanceOf(Converter);
    });

    it('should create converter with custom theme base path', () => {
      const customConverter = new Converter({
        themeBasePath: testDir
      });
      expect(customConverter).toBeInstanceOf(Converter);
    });
  });

  describe('wrapContent', () => {
    it('should wrap HTML in nice section', () => {
      const html = '<p>Content</p>';
      const wrapped = converter.wrapContent(html);
      expect(wrapped).toBe('<section id="nice"><p>Content</p></section>');
    });

    it('should wrap empty HTML', () => {
      const wrapped = converter.wrapContent('');
      expect(wrapped).toBe('<section id="nice"></section>');
    });

    it('should wrap complex HTML', () => {
      const html = '<div><p>Para 1</p><p>Para 2</p></div>';
      const wrapped = converter.wrapContent(html);
      expect(wrapped).toBe('<section id="nice"><div><p>Para 1</p><p>Para 2</p></div></section>');
    });
  });

  describe('convert', () => {
    it('should convert HTML with CSS inlining', async () => {
      const html = '<p>Test content</p>';
      const result = await converter.convert(html);
      expect(result).toContain('<!-- CSS inlined -->');
      expect(result).toContain('<p>Test content</p>');
    });

    it('should handle empty HTML', async () => {
      const result = await converter.convert('');
      expect(result).toContain('<!-- CSS inlined -->');
    });

    it('should handle complex HTML', async () => {
      const html = '<div><h1>Title</h1><p>Content</p></div>';
      const result = await converter.convert(html);
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<p>Content</p>');
    });
  });

  describe('process', () => {
    it('should process HTML with wrapping and CSS inlining', async () => {
      const html = '<p>Content</p>';
      const result = await converter.process(html);
      expect(result).toContain('<section id="nice">');
      expect(result).toContain('<p>Content</p>');
    });

    it('should wrap content before inlining CSS', async () => {
      const html = '<p>Test</p>';
      const result = await converter.process(html);
      expect(result).toContain('id="nice"');
    });
  });

  describe('saveToFile', () => {
    it('should save HTML to file', async () => {
      const html = '<p>Test content</p>';
      const filePath = join(testDir, 'output.html');
      await converter.saveToFile(html, filePath);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe(html);
    });

    it('should create parent directories if needed', async () => {
      const html = '<p>Test</p>';
      const filePath = join(testDir, 'subdir', 'nested', 'output.html');
      await converter.saveToFile(html, filePath);

      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should overwrite existing file', async () => {
      const filePath = join(testDir, 'output.html');
      await fs.writeFile(filePath, 'Old content', 'utf-8');

      const newHtml = '<p>New content</p>';
      await converter.saveToFile(newHtml, filePath);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe(newHtml);
    });
  });

  describe('convertFile', () => {
    it('should convert markdown file to HTML file', async () => {
      // Create test markdown file
      const mdFile = join(testDir, 'test.md');
      await fs.writeFile(mdFile, '# Test\n\nContent', 'utf-8');

      const htmlFile = join(testDir, 'output.html');
      await converter.convertFile(mdFile, htmlFile);

      const exists = await fs.access(htmlFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should handle non-existing input file', async () => {
      const nonExistentFile = join(testDir, 'nonexistent.md');
      const outputFile = join(testDir, 'output.html');

      await expect(converter.convertFile(nonExistentFile, outputFile)).rejects.toThrow();
    });
  });
});

describe('convertToWeChat', () => {
  it('should convert HTML to WeChat format', async () => {
    const html = '<p>Test content</p>';
    const result = await convertToWeChat(html);
    expect(result).toContain('id="nice"');
    expect(result).toContain('<p>Test content</p>');
  });

  it('should convert with custom options', async () => {
    const html = '<p>Test</p>';
    const result = await convertToWeChat(html, { theme: 'custom' });
    expect(result).toContain('id="nice"');
  });
});

describe('wrapContent', () => {
  it('should wrap HTML content', () => {
    const html = '<div>Content</div>';
    const wrapped = wrapContent(html);
    expect(wrapped).toBe('<section id="nice"><div>Content</div></section>');
  });

  it('should handle empty content', () => {
    const wrapped = wrapContent('');
    expect(wrapped).toBe('<section id="nice"></section>');
  });
});
