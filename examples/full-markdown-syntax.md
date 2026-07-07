# Markdown 全语法展示

这是一份用于测试 `md2wechat` 转换效果的 Markdown 示例。它覆盖标题、段落、强调、链接、图片、引用、列表、表格、代码、数学公式、定义列表、目录和原生 HTML 等常见语法。

[toc]

---

## 文字与段落

普通段落可以连续书写，转换器会保留单行换行。  
这一行使用了两个空格触发硬换行。

单个换行也会因为当前解析器配置渲染为换行，
适合微信公众号里更轻盈的段落节奏。

你可以使用 **加粗文字**、*斜体文字*、***加粗斜体***、~~删除线~~、`inline code`，也可以写出 <mark>高亮片段</mark>、<kbd>Cmd</kbd> + <kbd>K</kbd> 这样的键盘提示。

特殊字符会被安全处理：&copy; &amp; &lt; &gt;，反斜杠也能转义 Markdown 标记，例如 \*这不是斜体\*。

## 链接、自动链接与图片

这是一个行内链接：[OpenAI](https://openai.com)。

这是一个引用链接：[项目仓库][repo]。

自动链接会被识别：https://example.com 和 contact@example.com。

![默认封面图](../assets/default-cover.png "本地图片示例")

[repo]: https://github.com/

## 多级标题

### 三级标题

三级标题会被项目插件自动加入编号前缀。

#### 四级标题

四级标题适合局部小节。

##### 五级标题

五级标题适合补充说明。

###### 六级标题

六级标题适合非常轻的注释性内容。

## 列表

无序列表：

- 产品目标：让 Markdown 到公众号的排版更稳定。
- 体验目标：生成后的内容可以直接复制到编辑器。
- 视觉目标：
  - 层次清楚
  - 色彩克制
  - 表格和代码块可读

有序列表：

1. 编写 Markdown。
2. 选择主题。
3. 运行转换命令。
4. 打开 HTML 并复制到公众号编辑器。

混合列表：

1. 第一阶段
   - 整理内容
   - 检查图片
2. 第二阶段
   - 生成 HTML
   - 预览样式

任务列表会转换成勾选和未勾选状态：

- [x] 标题
- [x] 表格
- [x] 数学公式
- [ ] 发布前复查

## 引用

> 一级引用适合摘要、提示和重点说明。

> 一级引用中可以包含段落和列表。
>
> - 观点一
> - 观点二
>
> > 二级引用适合补充解释。
> >
> > > 三级引用适合短句强调。

## 表格

| 语法 | 示例 | 说明 |
| --- | ---: | --- |
| 标题 | `## 标题` | 自动生成层级 |
| 表格 | `| A | B |` | 外层会包裹可滚动容器 |
| 公式 | `$E=mc^2$` | 使用 KaTeX 渲染 |
| 代码 | ```js | 支持高亮 |

| 项目 | Q1 | Q2 | Q3 | Q4 |
| --- | ---: | ---: | ---: | ---: |
| 内容生产 | 18 | 32 | 41 | 56 |
| 设计优化 | 9 | 21 | 33 | 48 |
| 自动化 | 6 | 14 | 27 | 39 |

## 代码

行内代码适合展示命令：`npm run convert -- examples/full-markdown-syntax.md output/full-markdown-syntax.html --theme aurora --code-theme aurora`。

```bash
npm run build
npm run convert -- examples/full-markdown-syntax.md output/full-markdown-syntax.html --theme aurora --code-theme aurora
```

```typescript
type Article = {
  title: string;
  tags: string[];
  published: boolean;
};

function summarize(article: Article): string {
  const status = article.published ? 'published' : 'draft';
  return `${article.title} is a ${status} article.`;
}
```

```diff
- const theme = 'default';
+ const theme = 'aurora';
```

缩进代码块：

    const answer = 42;
    console.log(answer);

## 数学公式

行内公式：$E = mc^2$，以及 $\alpha + \beta = \gamma$。

块级公式：

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

$$
\frac{d}{dx}\left(x^n\right)=nx^{n-1}
$$

## 定义列表

Markdown
: 一种轻量级标记语言。

md2wechat
: 将 Markdown 转换为微信公众号兼容 HTML 的工具。

主题
: 一组用于控制排版、颜色和空间节奏的 CSS 规则。

## 原生 HTML

<section class="note-card">
  <strong>HTML 区块：</strong>当前解析器开启了 HTML 支持，因此可以在 Markdown 中插入少量语义化 HTML。
</section>

<details>
  <summary>展开更多</summary>
  <p>这段内容用于测试 details/summary 在转换后的展示效果。</p>
</details>

## 分隔线与结尾

---

最后一段用于观察整体留白、文字颜色和链接样式：[回到顶部](#)。
