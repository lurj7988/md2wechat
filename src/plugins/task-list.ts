/**
 * markdown-it plugin for GitHub-style task list markers.
 */

interface Token {
  type: string;
  content?: string;
  attrs?: [string, string][];
  children?: Token[];
}

function addClass(token: Token, className: string): void {
  const attrs = token.attrs || [];
  const classAttr = attrs.find((attr) => attr[0] === 'class');

  if (classAttr) {
    const classes = classAttr[1].split(/\s+/);
    if (!classes.includes(className)) {
      classAttr[1] = `${classAttr[1]} ${className}`;
    }
  } else {
    attrs.push(['class', className]);
  }

  token.attrs = attrs;
}

function transformTaskLists(state: any): void {
  let currentListItem: Token | undefined;

  for (const token of state.tokens as Token[]) {
    if (token.type === 'list_item_open') {
      currentListItem = token;
      continue;
    }

    if (token.type === 'list_item_close') {
      currentListItem = undefined;
      continue;
    }

    if (!currentListItem || token.type !== 'inline' || !token.children || !token.content) {
      continue;
    }

    const match = token.content.match(/^\[([ xX])\]\s+/);
    if (!match) {
      continue;
    }

    const checked = match[1].toLowerCase() === 'x';
    const markerLength = match[0].length;
    const firstChild = token.children[0];

    if (!firstChild || firstChild.type !== 'text' || !firstChild.content) {
      continue;
    }

    firstChild.content = firstChild.content.slice(markerLength);
    token.content = token.content.slice(markerLength);

    addClass(currentListItem, 'task-list-item');
    addClass(currentListItem, checked ? 'task-list-item-checked' : 'task-list-item-unchecked');
    currentListItem.attrs = currentListItem.attrs || [];
    currentListItem.attrs.push(['data-task-state', checked ? 'checked' : 'unchecked']);
  }
}

export default function (md: any): void {
  md.core.ruler.after('inline', 'task-list', transformTaskLists);
}
