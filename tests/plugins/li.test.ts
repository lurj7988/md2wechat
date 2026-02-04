/**
 * Tests for li plugin
 */

import { describe, it, expect } from '@jest/globals';
import MarkdownIt from 'markdown-it';
import liPlugin from '../../src/plugins/li';

describe('li plugin', () => {
  it('should wrap list items in section tags', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '- Item 1\n- Item 2\n- Item 3';
    const html = md.render(markdown);

    expect(html).toContain('<li><section>');
    expect(html).toContain('</section></li>');
  });

  it('should preserve list item content', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '- **Bold** item\n- Plain item';
    const html = md.render(markdown);

    expect(html).toContain('<strong>');
    expect(html).toContain('Bold');
    expect(html).toContain('Plain item');
  });

  it('should handle ordered lists', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '1. First\n2. Second\n3. Third';
    const html = md.render(markdown);

    expect(html).toContain('<li><section>');
    expect(html).toContain('</section></li>');
  });

  it('should handle nested lists', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '- Parent\n  - Child 1\n  - Child 2';
    const html = md.render(markdown);

    // All list items should be wrapped
    const liOpenCount = (html.match(/<li><section>/g) || []).length;
    expect(liOpenCount).toBe(3);
  });

  it('should handle complex list items', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '- Item with [link](https://example.com)\n- Item with `code`';
    const html = md.render(markdown);

    expect(html).toContain('<li><section>');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('<code>');
  });

  it('should handle task lists', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '- [x] Done\n- [ ] Todo';
    const html = md.render(markdown);

    expect(html).toContain('<li><section>');
  });

  it('should not affect non-list content', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '# Title\n\nParagraph\n\n> Quote';
    const html = md.render(markdown);

    // Check section tags are only for list items
    expect(html).toContain('<h1');
    expect(html).toContain('<p>');
    expect(html).not.toContain('<section>');
  });

  it('should handle empty list items', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '- ';
    const html = md.render(markdown);

    expect(html).toContain('<li><section>');
  });

  it('should handle list items with multiple paragraphs', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '- Item 1\n\n  Paragraph 2';
    const html = md.render(markdown);

    expect(html).toContain('<li><section>');
  });
});
