import MarkdownIt from 'markdown-it';
import hljs from './highlight/lang.js';

// 导入自定义插件
import markdownItSpan from './plugins/span.js';
import markdownItTableContainer from './plugins/table-container.js';
import markdownItMath from './plugins/math.js';
import markdownItMultiquote from './plugins/multiquote.js';
import markdownItLi from './plugins/li.js';

// 导入第三方插件
import markdownItDeflist from 'markdown-it-deflist';
import markdownItImplicitFigures from 'markdown-it-implicit-figures';
import markdownItTableOfContents from 'markdown-it-table-of-contents';

/**
 * 创建 Markdown 解析器
 * @param {Object} options - 配置选项
 * @returns {MarkdownIt} markdown-it 实例
 */
export function createParser(options = {}) {
  const { theme = 'default', macStyle = true } = options;

  // 创建 markdown-it 实例
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: (str, lang) => {
      // 默认语言为 bash
      if (lang === undefined || lang === '') {
        lang = 'bash';
      }
      // 加上 custom 则表示自定义样式，而非微信专属，避免被 remove pre
      if (lang && hljs.getLanguage(lang)) {
        try {
          const formatted = hljs
            .highlight(str, { language: lang })
            .value.replace(/\n/g, '<br/>') // 换行用 br 表示
            .replace(/\s/g, '&nbsp;') // 用 nbsp 替换空格
            .replace(/span&nbsp;/g, 'span '); // span 标签修复

          // Mac 风格窗口控制按钮（可选）
          const preClass = macStyle ? 'custom mac-style' : 'custom';
          const macHeader = macStyle ? `
<span class="mac-header">
  <span class="mac-dots">
    <span class="mac-dot red"></span>
    <span class="mac-dot yellow"></span>
    <span class="mac-dot green"></span>
  </span>
  <span class="mac-lang">${lang}</span>
</span>` : '';
          const macBodyStart = macStyle ? `<span class="mac-body">` : '';
          const macBodyEnd = macStyle ? `</span>` : '';
          // 将 mac-header 移到 code 外部，避免随滚动条移动
          return `<pre class="${preClass}">${macHeader}<code class="hljs">${macBodyStart}${formatted}${macBodyEnd}</code></pre>`;
        } catch (e) {
          console.error('highlight error:', e);
        }
      }
      const preClass = macStyle ? 'custom mac-style' : 'custom';
      return `<pre class="${preClass}"><code class="hljs">${md.utils.escapeHtml(str)}</code></pre>`;
    },
  });

  // 注册自定义插件
  md.use(markdownItSpan) // 在标题标签中添加 span
    .use(markdownItTableContainer) // 在表格外部添加容器
    .use(markdownItMath) // 数学公式
    .use(markdownItMultiquote) // 给多级引用加 class
    .use(markdownItLi) // li 标签中加入 section 标签
    // 注册第三方插件
    .use(markdownItDeflist) // 定义列表
    .use(markdownItImplicitFigures, { figcaption: true }) // 图示
    .use(markdownItTableOfContents, {
      transformLink: () => '',
      includeLevel: [2, 3],
      markerPattern: /^\[toc\]/im,
    }); // TOC 仅支持二级和三级标题

  return md;
}

/**
 * 渲染 Markdown 为 HTML
 * @param {string} markdown - Markdown 内容
 * @param {Object} options - 配置选项
 * @returns {string} HTML 内容
 */
export function render(markdown, options = {}) {
  const parser = createParser(options);
  return parser.render(markdown);
}

export default { createParser, render };
