/**
 * Tests for span plugin
 */

import { describe, it, expect } from '@jest/globals';
import MarkdownIt from 'markdown-it';
import spanPlugin from '../../src/plugins/span';

describe('span plugin', () => {
  it('should add heading numbering by default', () => {
    const md = new MarkdownIt();
    md.use(spanPlugin);

    const markdown = '# Title\n\n## Section 1\n\n## Section 2\n\n### Subsection';
    const html = md.render(markdown);

    expect(html).toContain('class="prefix"');
    expect(html).toContain('1. </span>');  // First h2
    expect(html).toContain('2. </span>');  // Second h2
    expect(html).toContain('2.1 </span>'); // h3 under second h2
  });

  it('should wrap heading content', () => {
    const md = new MarkdownIt();
    md.use(spanPlugin);

    const markdown = '## My Heading';
    const html = md.render(markdown);

    expect(html).toContain('class="content"');
    expect(html).toContain('My Heading');
    expect(html).toContain('class="suffix"');
  });

  it('should reset h3 counter for each h2', () => {
    const md = new MarkdownIt();
    md.use(spanPlugin);

    const markdown = '## H2-1\n### H3-1\n### H3-2\n\n## H2-2\n### H3-3';
    const html = md.render(markdown);

    expect(html).toContain('1.1 </span>'); // First h3 under first h2
    expect(html).toContain('1.2 </span>'); // Second h3 under first h2
    expect(html).toContain('2.1 </span>'); // First h3 under second h2
  });

  it('should respect addHeadingSpan option', () => {
    const md = new MarkdownIt();
    md.use(spanPlugin, { addHeadingSpan: false });

    const markdown = '## My Heading';
    const html = md.render(markdown);

    expect(html).not.toContain('class="content"');
    expect(html).not.toContain('class="suffix"');
  });

  it('should add mac-square for h3', () => {
    const md = new MarkdownIt();
    md.use(spanPlugin);

    const markdown = '### H3 Heading';
    const html = md.render(markdown);

    expect(html).toContain('prefix-square');
  });

  it('should handle empty headings', () => {
    const md = new MarkdownIt();
    md.use(spanPlugin);

    const markdown = '## ';
    const html = md.render(markdown);

    // Should not crash and should render empty heading
    expect(html).toContain('<h2>');
  });

  it('should handle h1 headings', () => {
    const md = new MarkdownIt();
    md.use(spanPlugin);

    const markdown = '# H1 Title\n\n## H2 Title';
    const html = md.render(markdown);

    // h1 should get prefix but no numbering
    expect(html).toContain('class="prefix"');
    // h2 should get numbered
    expect(html).toContain('1. </span>');
  });

  it('should handle h4+ headings', () => {
    const md = new MarkdownIt();
    md.use(spanPlugin);

    const markdown = '#### H4 Title';
    const html = md.render(markdown);

    // Should add prefix but without specific numbering logic
    expect(html).toContain('class="prefix"');
  });
});
