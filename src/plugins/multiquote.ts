/**
 * markdown-it plugin for multi-level blockquote styling
 */

interface State {
  tokens: Token[];
}

interface Token {
  type: string;
  attrs?: string[][];
}

/**
 * Create multiquote class rule
 */
function makeRule() {
  return function addMultiquoteClass(state: State): void {
    let count = 0;
    let outerQuoteToken: Token | undefined;

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

      if (count > 0 && outerQuoteToken) {
        outerQuoteToken.attrs = [['class', 'multiquote-' + count]];
        count = 0;
      }
    }
  };
}

/**
 * markdown-it plugin factory
 */
export default function (md: any): void {
  md.core.ruler.push('blockquote-class', makeRule());
}
