/**
 * markdown-it plugin for wrapping tables in scrollable containers
 */

interface State {
  tokens: Token[];
}

interface Token {
  type: string;
  content?: string;
}

/**
 * Create table container rule
 */
function makeRule() {
  return function addTableContainer(state: State): void {
    const arr: Token[] = [];

    for (let i = 0; i < state.tokens.length; i++) {
      const curToken = state.tokens[i];

      if (curToken.type === 'table_open') {
        const tableContainerStart: Token = { type: 'html_inline', content: `<section class="table-container">` };
        arr.push(tableContainerStart);
        arr.push(curToken);
      } else if (curToken.type === 'table_close') {
        const tableContainerClose: Token = { type: 'html_inline', content: `</section>` };
        arr.push(curToken);
        arr.push(tableContainerClose);
      } else {
        arr.push(curToken);
      }
    }

    state.tokens = arr;
  };
}

/**
 * markdown-it plugin factory
 */
export default function (md: any): void {
  md.core.ruler.push('table-container', makeRule());
}
