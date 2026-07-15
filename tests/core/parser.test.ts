/**
 * Tests for Parser module
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Parser, createParser, render } from '../../src/core/parser';

describe('Parser', () => {
  const testDir = join(process.cwd(), 'test-temp-parser');
  let parser: Parser;

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    parser = new Parser();
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create parser with default options', () => {
      const defaultParser = new Parser();
      expect(defaultParser).toBeInstanceOf(Parser);
    });

    it('should create parser with custom options', () => {
      const customParser = new Parser({
        theme: 'custom',
        macStyle: false
      });
      expect(customParser).toBeInstanceOf(Parser);
    });
  });

  describe('parse', () => {
    it('should parse markdown to HTML', () => {
      const markdown = '# Hello World\n\nThis is a paragraph.';
      const html = parser.parse(markdown);
      expect(html).toContain('<h1');
      expect(html).toContain('Hello World');
      expect(html).toContain('<p>');
      expect(html).toContain('This is a paragraph');
    });

    it('should parse markdown with code blocks', () => {
      const markdown = '```javascript\nconst x = 1;\n```';
      const html = parser.parse(markdown);
      expect(html).toContain('<pre');
      expect(html).toContain('<code');
      expect(html).toContain('hljs');
      expect(html).toContain('javascript');
    });

    it('should parse markdown with inline code', () => {
      const markdown = 'This is `inline code`.';
      const html = parser.parse(markdown);
      expect(html).toContain('<code>');
      expect(html).toContain('inline code');
    });

    it('should parse markdown with links', () => {
      const markdown = '[Link](https://example.com)';
      const html = parser.parse(markdown);
      expect(html).toContain('<a');
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('Link');
    });

    it('should parse markdown with images', () => {
      const markdown = '![Alt](image.jpg)';
      const html = parser.parse(markdown);
      expect(html).toContain('<img');
      expect(html).toContain('src="image.jpg"');
      // markdown-it-implicit-figures wraps image and moves alt to figcaption
      expect(html).toContain('<figure>');
      expect(html).toContain('Alt');
    });

    it('should parse markdown with lists', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const html = parser.parse(markdown);
      expect(html).toContain('md-list md-list-unordered');
      expect(html).toContain('md-list-marker-unordered');
      expect(html).not.toContain('<ul>');
      expect(html).not.toContain('<li>');
      expect(html).toContain('Item 1');
      expect(html).toContain('Item 2');
      expect(html).toContain('Item 3');
    });

    it('should parse task lists as checked and unchecked markers', () => {
      const markdown = '- [x] Done\n- [ ] Todo';
      const html = parser.parse(markdown);
      expect(html).toContain('task-list-item-checked');
      expect(html).toContain('task-list-item-unchecked');
      expect(html).toContain('task-list-marker checked');
      expect(html).toContain('task-list-marker unchecked');
      expect(html).toContain('✓');
      expect(html).not.toContain('[x]');
      expect(html).not.toContain('[ ]');
    });

    it('should parse markdown with blockquotes', () => {
      const markdown = '> This is a quote';
      const html = parser.parse(markdown);
      expect(html).toContain('<blockquote');
      expect(html).toContain('This is a quote');
    });

    it('should parse markdown with tables', () => {
      const markdown = '| Header |\n| ------ |\n| Cell |';
      const html = parser.parse(markdown);
      expect(html).toContain('<table');
      expect(html).toContain('<thead>');
      expect(html).toContain('<tbody>');
      expect(html).toContain('Header');
      expect(html).toContain('Cell');
    });

    it('should wrap tables in scrollable container', () => {
      const markdown = '| Header |\n| ------ |\n| Cell |';
      const html = parser.parse(markdown);
      expect(html).toContain('table-container');
    });

    it('should add heading numbering', () => {
      const markdown = '# Title\n\n## Section 1\n\n## Section 2\n\n### Subsection';
      const html = parser.parse(markdown);
      expect(html).toContain('class="prefix"');
      expect(html).toContain('1. </span>');  // h2 numbering
      expect(html).toContain('2.1 </span>');  // h3 numbering
    });

    it('should parse markdown with math (inline)', () => {
      const markdown = 'This is $E=mc^2$ formula';
      const html = parser.parse(markdown);
      expect(html).toContain('math-image math-inline');
      expect(html).toContain('data-latex="E=mc^2"');
      expect(html).toContain('data-display="false"');
    });

    it('should parse markdown with math (block)', () => {
      const markdown = '$$\\sum_{i=1}^{n} x_i$$';
      const html = parser.parse(markdown);
      expect(html).toContain('math-image math-display');
      expect(html).toContain('data-display="true"');
    });

    it('should escape HTML by default', () => {
      const markdown = '<script>alert("xss")</script>';
      const html = parser.parse(markdown);
      // markdown-it allows HTML by default, so script tag will be present
      expect(html).toContain('<script>');
    });

    it('should allow HTML when html option is true', () => {
      const parserWithHtml = new Parser({ html: true });
      const markdown = '<div class="custom">Custom HTML</div>';
      const html = parserWithHtml.parse(markdown);
      expect(html).toContain('<div class="custom">');
      expect(html).toContain('Custom HTML');
    });

    it('should parse markdown with Mac-style code blocks', () => {
      const markdown = "```javascript\nconst message = 'hello world';\n```";
      const html = parser.parse(markdown);
      expect(html).toContain('mac-style');
      expect(html).toContain('mac-header');
      expect(html).toContain('mac-dots');
      expect(html).toContain('mac-dot');
      expect(html).toContain('mac-lang');
      expect(html).toContain('<span class="mac-dot red">●</span>');
      expect(html).toContain("'hello&nbsp;world'");
      expect(html).not.toContain('&#x27;');
    });

    it('should preserve highlight class attributes while formatting code spaces', () => {
      const markdown = '```typescript\ntype Article = { title: string };\n```';
      const html = parser.parse(markdown);
      expect(html).toContain('class="hljs-title class_"');
      expect(html).not.toContain('class="hljs-title&nbsp;class_"');
    });

    it('should use explicit breaks in indented code blocks', () => {
      const markdown = '    const answer = 42;\n    console.log(answer);';
      const html = parser.parse(markdown);
      expect(html).toContain('const&nbsp;answer&nbsp;=&nbsp;42;<br>console.log(answer);<br>');
    });

    it('should support horizontal scrolling code blocks', () => {
      const scrollParser = new Parser({ codeLayout: 'scroll' });
      const fenced = scrollParser.parse('```typescript\nfunction run() {\n  return true;\n}\n```');
      const indented = scrollParser.parse('    echo hello');
      expect(fenced).toContain('code-layout-scroll');
      expect(fenced).toContain('style="display: inline-block; padding-left: 2ch;"');
      expect(fenced).not.toContain('class="code-indent"');
      expect(indented).toContain('code-layout-scroll');
    });

    it('should attach indentation to JSON tokens instead of whitespace-only spans', () => {
      const json = new Parser({ codeLayout: 'scroll' }).parse(
        '```json\n{\n  "type": "user",\n  "nested": {\n    "ok": true\n  }\n}\n```'
      );
      expect(json).toContain('padding-left: 2ch;');
      expect(json).toContain('padding-left: 4ch;');
      expect(json).not.toContain('class="code-indent"');
    });
  });

  describe('parseFile', () => {
    it('should parse markdown file to HTML', async () => {
      const testFile = join(testDir, 'test.md');
      const markdown = '# Test File\n\nContent here.';
      await fs.writeFile(testFile, markdown, 'utf-8');

      const html = await parser.parseFile(testFile);
      expect(html).toContain('<h1');
      expect(html).toContain('Test File');
    });

    it('should throw error for non-existing file', async () => {
      const nonExistentFile = join(testDir, 'nonexistent.md');
      await expect(parser.parseFile(nonExistentFile)).rejects.toThrow();
    });
  });

  describe('getMarkdownIt', () => {
    it('should return the markdown-it instance', () => {
      const md = parser.getMarkdownIt();
      expect(md).toBeDefined();
      expect(md.render).toBeInstanceOf(Function);
    });
  });
});

describe('createParser', () => {
  it('should create parser instance', () => {
    const parser = createParser();
    expect(parser).toBeInstanceOf(Parser);
  });

  it('should create parser with options', () => {
    const parser = createParser({ theme: 'custom' });
    expect(parser).toBeInstanceOf(Parser);
  });
});

describe('render', () => {
  it('should render markdown to HTML', () => {
    const markdown = '# Test';
    const html = render(markdown);
    expect(html).toContain('<h1');
    expect(html).toContain('Test');
  });

  it('should render with custom options', () => {
    const markdown = '# Test';
    const html = render(markdown, { macStyle: false });
    expect(html).toContain('<h1');
  });
});
