import juice from 'juice';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 将 HTML 转换为微信公众号兼容的格式
 * @param {string} html - 原始 HTML 内容
 * @param {Object} options - 配置选项
 * @param {string} options.theme - Markdown 主题名称
 * @param {string} options.codeTheme - 代码高亮主题名称
 * @returns {string} 处理后的 HTML
 */
export function convertToWeChat(html, options = {}) {
  const { theme = 'default', codeTheme = 'atom-one-dark' } = options;

  try {
    // 读取样式文件
    const basicCss = readFileSync(resolve(__dirname, '../themes/basic.css'), 'utf8');
    const markdownCss = readFileSync(resolve(__dirname, `../themes/markdown/${theme}.css`), 'utf8');
    const codeCss = readFileSync(resolve(__dirname, `../themes/code/${codeTheme}.css`), 'utf8');

    // 合并样式
    const css = basicCss + markdownCss + codeCss;

    // 使用 juice 内联样式
    const result = juice.inlineContent(html, css, {
      inlinePseudoElements: true,
      preserveImportant: true,
      removeStyleTags: true,
      preserveFonts: false,
      preserveMediaQueries: false,
      extraCss: '',
    });

    return result;
  } catch (error) {
    // 如果样式文件不存在，使用默认样式
    console.warn('Warning: Theme files not found, using basic conversion');
    return juice.inlineContent(html, '', {
      inlinePseudoElements: true,
      preserveImportant: true,
    });
  }
}

/**
 * 包装 HTML 内容到容器中
 * @param {string} content - HTML 内容
 * @returns {string} 包装后的 HTML
 */
export function wrapContent(content) {
  return `<section id="nice">${content}</section>`;
}

/**
 * 处理 HTML 并添加必要的属性
 * @param {string} html - 原始 HTML
 * @returns {string} 处理后的 HTML
 */
export function processHtml(html) {
  // 为所有顶级子元素添加工具属性
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="wrapper">${html}</div>`, 'text/html');

  const wrapper = doc.getElementById('wrapper');
  const children = wrapper.children;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === 1) { // 元素节点
      child.setAttribute('data-tool', 'md2wechat');
    }
  }

  return wrapper.innerHTML;
}

export default { convertToWeChat, wrapContent, processHtml };
