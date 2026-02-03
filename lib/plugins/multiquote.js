function makeRule() {
  return function addMultiquoteClass(state) {
    let count = 0;
    let outerQuoteToken;
    for (let i = 0; i < state.tokens.length; i++) {
      const curToken = state.tokens[i];
      if (curToken.type === 'blockquote_open') {
        if (count === 0) {
          // 最外层 blockquote 的 token
          outerQuoteToken = curToken;
        }
        count++;
        continue;
      }
      if (count > 0) {
        outerQuoteToken.attrs = [['class', 'multiquote-' + count]];
        count = 0;
      }
    }
  };
}

export default function(md) {
  md.core.ruler.push('blockquote-class', makeRule(md));
}
