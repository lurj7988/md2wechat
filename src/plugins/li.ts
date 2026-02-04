/**
 * markdown-it plugin for wrapping list items in section tags
 */

/**
 * Create list item replacement rule
 */
function makeRule(md: any) {
  return function replaceListItem(): void {
    md.renderer.rules.list_item_open = function replaceOpen(): string {
      return '<li><section>';
    };
    md.renderer.rules.list_item_close = function replaceClose(): string {
      return '</section></li>';
    };
  };
}

/**
 * markdown-it plugin factory
 */
export default function (md: any): void {
  md.core.ruler.push('replace-li', makeRule(md));
}
