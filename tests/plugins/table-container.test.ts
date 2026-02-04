/**
 * Tests for table-container plugin
 */

import { describe, it, expect } from '@jest/globals';
import MarkdownIt from 'markdown-it';
import tableContainerPlugin from '../../src/plugins/table-container';

describe('table-container plugin', () => {
  it('should wrap table in scrollable container', () => {
    const md = new MarkdownIt();
    md.use(tableContainerPlugin);

    const markdown = '| Header |\n| ------ |\n| Cell |';
    const html = md.render(markdown);

    expect(html).toContain('<section class="table-container">');
    expect(html).toContain('</section>');
  });

  it('should preserve table structure', () => {
    const md = new MarkdownIt();
    md.use(tableContainerPlugin);

    const markdown = '| H1 | H2 |\n| -- | -- |\n| A | B |';
    const html = md.render(markdown);

    expect(html).toContain('<table>');
    expect(html).toContain('<thead>');
    expect(html).toContain('<tbody>');
    expect(html).toContain('<th>');
    expect(html).toContain('<td>');
  });

  it('should handle multiple tables', () => {
    const md = new MarkdownIt();
    md.use(tableContainerPlugin);

    const markdown = '| Table 1 |\n| ------- |\n| A |\n\n| Table 2 |\n| ------- |\n| B |';
    const html = md.render(markdown);

    // Count table-container sections
    const matches = html.match(/<section class="table-container">/g);
    expect(matches?.length).toBe(2);
  });

  it('should not affect non-table content', () => {
    const md = new MarkdownIt();
    md.use(tableContainerPlugin);

    const markdown = '# Title\n\nParagraph\n\n- List item';
    const html = md.render(markdown);

    expect(html).not.toContain('table-container');
  });
});
