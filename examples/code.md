# Markdown 全语法展示

这是一份用于测试 `md2wechat` 转换效果的 Markdown 示例。它覆盖标题、段落、强调、链接、图片、引用、列表、表格、代码、数学公式、定义列表、目录和原生 HTML 等常见语法。

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
