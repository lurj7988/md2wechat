/**
 * Tests for CLI utility functions
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  fileExists,
  ensureDir,
  getFileExtension,
  changeExtension,
  readFile,
  writeFile,
  extractTitle,
  extractSummary
} from '../../../src/cli/utils/helpers';

describe('CLI Utils - Helpers', () => {
  const testDir = join(process.cwd(), 'test-temp');
  const testFile = join(testDir, 'test.txt');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      await fs.writeFile(testFile, 'test content');
      const result = await fileExists(testFile);
      expect(result).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const result = await fileExists(join(testDir, 'nonexistent.txt'));
      expect(result).toBe(false);
    });
  });

  describe('ensureDir', () => {
    it('should create directory if it does not exist', async () => {
      const newDir = join(testDir, 'new-dir', 'nested');
      await ensureDir(newDir);
      const exists = await fs.access(newDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should not throw error if directory already exists', async () => {
      await expect(ensureDir(testDir)).resolves.not.toThrow();
    });
  });

  describe('getFileExtension', () => {
    it('should return file extension', () => {
      expect(getFileExtension('test.txt')).toBe('.txt');
      expect(getFileExtension('document.pdf')).toBe('.pdf');
      expect(getFileExtension('archive.tar.gz')).toBe('.gz');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('README')).toBe('');
      expect(getFileExtension('Makefile')).toBe('');
    });
  });

  describe('changeExtension', () => {
    it('should change file extension', () => {
      expect(changeExtension('test.txt', '.md')).toBe('test.md');
      expect(changeExtension('document.pdf', '.html')).toBe('document.html');
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const content = 'Hello, World!';
      await fs.writeFile(testFile, content);
      const result = await readFile(testFile);
      expect(result).toBe(content);
    });

    it('should throw error for non-existing file', async () => {
      await expect(readFile(join(testDir, 'nonexistent.txt'))).rejects.toThrow();
    });
  });

  describe('writeFile', () => {
    it('should write file content', async () => {
      const content = 'Test content';
      const filePath = join(testDir, 'subdir', 'test.txt');
      await writeFile(filePath, content);
      const result = await fs.readFile(filePath, 'utf-8');
      expect(result).toBe(content);
    });

    it('should create parent directories', async () => {
      const filePath = join(testDir, 'a', 'b', 'c', 'test.txt');
      await writeFile(filePath, 'content');
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('extractTitle', () => {
    it('should extract title from heading', () => {
      const markdown = '# My Title\n\nSome content';
      expect(extractTitle(markdown)).toBe('My Title');
    });

    it('should extract title from heading after frontmatter', () => {
      const markdown = '---\ntitle: Frontmatter Title\n---\n\n# Actual Title';
      expect(extractTitle(markdown)).toBe('Actual Title');
    });

    it('should use first line as fallback when no heading', () => {
      const markdown = 'First line\n\nNo heading here';
      expect(extractTitle(markdown)).toBe('First line');
    });

    it('should return Untitled for empty content', () => {
      expect(extractTitle('')).toBe('Untitled');
      expect(extractTitle('   \n\n   ')).toBe('Untitled');
    });
  });

  describe('extractSummary', () => {
    it('should extract summary from content', () => {
      const markdown = '# Title\n\nThis is a summary of the content.';
      expect(extractSummary(markdown)).toBe('This is a summary of the content.');
    });

    it('should remove headings from summary', () => {
      const markdown = '# Title\n\n## Subtitle\n\nContent here';
      expect(extractSummary(markdown)).toBe('Content here');
    });

    it('should remove code blocks from summary', () => {
      const markdown = 'Text before\n```\ncode\n```\nText after';
      expect(extractSummary(markdown)).toBe('Text before Text after');
    });

    it('should remove inline code from summary', () => {
      const markdown = 'Text with `inline code` and more text';
      expect(extractSummary(markdown)).toBe('Text with and more text');
    });

    it('should remove links from summary', () => {
      const markdown = 'Text with [link](https://example.com) and more';
      expect(extractSummary(markdown)).toBe('Text with link and more');
    });

    it('should truncate long summary', () => {
      const longText = 'a'.repeat(200);
      const summary = extractSummary(longText, 50);
      expect(summary.length).toBeLessThanOrEqual(50);
      expect(summary).toContain('...');
    });

    it('should use default max length', () => {
      const longText = 'a'.repeat(150);
      const summary = extractSummary(longText);
      expect(summary.length).toBe(120); // 117 + '...'
    });
  });
});
