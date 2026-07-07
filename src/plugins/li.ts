/**
 * markdown-it plugin for wrapping list items in section tags
 */

interface ListState {
  type: 'bullet' | 'ordered';
  index: number;
}

function getAttr(token: any, name: string): string | undefined {
  const attrs = token.attrs as [string, string][] | null | undefined;
  return attrs?.find((attr) => attr[0] === name)?.[1];
}

function getItemClass(token: any): string {
  const classAttr = getAttr(token, 'class');
  return classAttr ? `md-list-item ${classAttr}` : 'md-list-item';
}

/**
 * Create list item replacement rule
 */
function makeRule(md: any) {
  return function replaceListItem(): void {
    const listStack: ListState[] = [];

    md.renderer.rules.bullet_list_open = function bulletListOpen(): string {
      listStack.push({ type: 'bullet', index: 0 });
      return '<section class="md-list md-list-unordered">';
    };

    md.renderer.rules.bullet_list_close = function bulletListClose(): string {
      listStack.pop();
      return '</section>';
    };

    md.renderer.rules.ordered_list_open = function orderedListOpen(tokens: any[], idx: number): string {
      const start = Number(getAttr(tokens[idx], 'start') || '1');
      listStack.push({ type: 'ordered', index: start - 1 });
      return '<section class="md-list md-list-ordered">';
    };

    md.renderer.rules.ordered_list_close = function orderedListClose(): string {
      listStack.pop();
      return '</section>';
    };

    md.renderer.rules.list_item_open = function replaceOpen(tokens: any[], idx: number): string {
      const listState = listStack[listStack.length - 1];
      const taskState = getAttr(tokens[idx], 'data-task-state');
      let marker = '';

      if (taskState) {
        marker = taskState === 'checked' ? '✓' : '&nbsp;';
      } else if (listState?.type === 'ordered') {
        listState.index++;
        marker = `${listState.index}.`;
      }

      let markerHtml = '<span class="md-list-marker md-list-marker-unordered"><span class="md-list-dot">&nbsp;</span></span>';
      if (taskState) {
        markerHtml = `<span class="md-list-marker md-list-marker-task"><span class="task-list-marker ${taskState}">${marker}</span></span>`;
      } else if (listState?.type === 'ordered') {
        markerHtml = `<span class="md-list-marker md-list-marker-ordered">${marker}</span>`;
      }
      const itemClass = getItemClass(tokens[idx]);

      return `<section class="${itemClass}">${markerHtml}`;
    };
    md.renderer.rules.list_item_close = function replaceClose(): string {
      return '</section>';
    };
  };
}

/**
 * markdown-it plugin factory
 */
export default function (md: any): void {
  md.core.ruler.push('replace-li', makeRule(md));
}
