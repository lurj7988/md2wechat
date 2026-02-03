function makeRule() {
  return function addTableContainer(state) {
    const arr = [];
    for (let i = 0; i < state.tokens.length; i++) {
      const curToken = state.tokens[i];
      if (curToken.type === 'table_open') {
        const tableContainerStart = new state.Token('html_inline', '', 0);
        tableContainerStart.content = `<section class="table-container">`;
        arr.push(tableContainerStart);
        arr.push(curToken);
      } else if (curToken.type === 'table_close') {
        const tableContainerClose = new state.Token('html_inline', '', 0);
        tableContainerClose.content = `</section>`;
        arr.push(curToken);
        arr.push(tableContainerClose);
      } else {
        arr.push(curToken);
      }
    }
    state.tokens = arr;
  };
}

export default function(md) {
  md.core.ruler.push('table-container', makeRule(md));
}
