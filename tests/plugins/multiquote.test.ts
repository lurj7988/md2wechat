/**
 * Tests for multiquote plugin
 */

import { describe, it, expect } from '@jest/globals';
import MarkdownIt from 'markdown-it';
import multiquotePlugin from '../../src/plugins/multiquote';

describe('multiquote plugin', () => {
  it('should add multiquote class to blockquotes', () => {
    const md = new MarkdownIt();
    md.use(multiquotePlugin);

    const markdown = '> Single level quote';
    const html = md.render(markdown);

    expect(html).toContain('class="multiquote-1"');
  });

  it('should handle nested blockquotes', () => {
    const md = new MarkdownIt();
    md.use(multiquotePlugin);

    const markdown = '> Level 1\n>> Level 2\n>>> Level 3';
    const html = md.render(markdown);

    // Check for multiquote classes at different levels
    expect(html).toContain('multiquote-');
  });

  it('should handle multiple separate blockquotes', () => {
    const md = new MarkdownIt();
    md.use(multiquotePlugin);

    const markdown = '> First quote\n\n> Second quote';
    const html = md.render(markdown);

    // Each blockquote should get multiquote class
    const matches = html.match(/multiquote-\d+/g);
    expect(matches?.length).toBeGreaterThanOrEqual(1);
  });

  it('should preserve blockquote content', () => {
    const md = new MarkdownIt();
    md.use(multiquotePlugin);

    const markdown = '> This is a quote with **bold** text';
    const html = md.render(markdown);

    expect(html).toContain('This is a quote');
    expect(html).toContain('<strong>');
    expect(html).toContain('bold');
  });

  it('should handle blockquotes with other elements', () => {
    const md = new MarkdownIt();
    md.use(multiquotePlugin);

    const markdown = '> Quote with\n> - list\n> - items';
    const html = md.render(markdown);

    expect(html).toContain('multiquote-');
    expect(html).toContain('<li>');
  });

  it('should not affect non-blockquote content', () => {
    const md = new MarkdownIt();
    md.use(multiquotePlugin);

    const markdown = '# Title\n\nParagraph\n\n- List';
    const html = md.render(markdown);

    expect(html).not.toContain('multiquote-');
  });
});
