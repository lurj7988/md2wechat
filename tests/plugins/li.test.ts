/**
 * Tests for li plugin
 */

import { describe, it, expect } from '@jest/globals';
import MarkdownIt from 'markdown-it';
import liPlugin from '../../src/plugins/li';

describe('li plugin', () => {
  it('should render unordered lists as WeChat-safe sections', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '- Item 1\n- Item 2\n- Item 3';
    const html = md.render(markdown);

    expect(html).toContain('md-list md-list-unordered');
    expect(html).toContain('md-list-marker-unordered');
    expect(html).toContain('md-list-dot');
    expect(html).not.toContain('<ul>');
    expect(html).not.toContain('<li>');
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

    expect(html).toContain('md-list md-list-ordered');
    expect(html).toContain('md-list-marker-ordered">1.</span>');
    expect(html).toContain('md-list-marker-ordered">2.</span>');
    expect(html).toContain('md-list-marker-ordered">3.</span>');
  });

  it('should handle nested lists', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '- Parent\n  - Child 1\n  - Child 2';
    const html = md.render(markdown);

    const itemCount = (html.match(/class="md-list-item"/g) || []).length;
    expect(itemCount).toBe(3);
  });

  it('should handle complex list items', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '- Item with [link](https://example.com)\n- Item with `code`';
    const html = md.render(markdown);

    expect(html).toContain('md-list-item');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('<code>');
  });

  it('should handle task lists', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '- [x] Done\n- [ ] Todo';
    const html = md.render(markdown);

    expect(html).toContain('md-list md-list-unordered');
  });

  it('should preserve list item attributes', () => {
    const md = new MarkdownIt();
    md.use((instance) => {
      instance.core.ruler.after('inline', 'add-list-class', (state) => {
        const listItem = state.tokens.find((token) => token.type === 'list_item_open');
        if (listItem) {
          listItem.attrs = [['class', 'custom-list-item']];
        }
      });
    });
    md.use(liPlugin);

    const html = md.render('- Item');

    expect(html).toContain('class="md-list-item custom-list-item"');
  });

  it('should not affect non-list content', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '# Title\n\nParagraph\n\n> Quote';
    const html = md.render(markdown);

    // Check list wrapper sections are only for list items
    expect(html).toContain('<h1');
    expect(html).toContain('<p>');
    expect(html).not.toContain('md-list-item');
  });

  it('should handle empty list items', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '- ';
    const html = md.render(markdown);

    expect(html).toContain('md-list-item');
  });

  it('should handle list items with multiple paragraphs', () => {
    const md = new MarkdownIt();
    md.use(liPlugin);

    const markdown = '- Item 1\n\n  Paragraph 2';
    const html = md.render(markdown);

    expect(html).toContain('md-list-item');
  });
});
