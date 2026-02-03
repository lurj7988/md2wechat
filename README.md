# md2wechat

将 Markdown 转换为微信公众号兼容的 HTML 富文本的命令行工具。

## 功能特性

- **完整的 Markdown 语法支持** - 标题、段落、列表、引用、表格等
- **代码高亮** - 支持 40+ 种编程语言的语法高亮
- **数学公式** - 使用 KaTeX 渲染 LaTeX 公式
- **多级引用** - 为不同层级的引用提供不同的样式
- **主题系统** - 支持代码高亮主题切换
- **样式内联化** - 自动将 CSS 转换为内联样式，兼容微信公众号

## 安装

```bash
cd wechat
npm install
```

## 使用方式

### 基本用法

```bash
# 将 Markdown 转换为 HTML
node bin/md2wechat.js input.md output.html

# 或者使用 npx
npx md2wechat input.md output.html
```

### 指定主题

```bash
# 使用 GitHub 代码主题
node bin/md2wechat.js input.md output.html --code-theme github

# 使用 Atom One Dark 代码主题（默认）
node bin/md2wechat.js input.md output.html --code-theme atom-one-dark
```

### 从标准输入读取

```bash
cat input.md | node bin/md2wechat.js > output.html
```

### 帮助信息

```bash
node bin/md2wechat.js --help
```

## 命令行选项

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--theme` | `-t` | Markdown 主题名称 | `default` |
| `--code-theme` | `-c` | 代码高亮主题名称 | `atom-one-dark` |
| `--help` | `-h` | 显示帮助信息 | - |
| `--version` | `-v` | 显示版本号 | - |

## 代码主题

- `atom-one-dark` - 深色主题（默认）
- `github` - 浅色主题

## 支持的语言

bash, javascript, typescript, python, java, cpp, go, rust, css, html, json, yaml, sql, markdown, shell, diff, protobuf, php, ruby, swift, kotlin, scala, clojure, haskell, lua, makefile, r, xml, dockerfile, dart, erlang, gradle, groovy, julia, lisp, matlab, objectivec, perl, verilog, vhdl, csharp, tex 等 40+ 种语言。

## Markdown 语法示例

### 标题

```markdown
# 一级标题
## 二级标题
### 三级标题
```

### 代码块

````markdown
```javascript
function hello() {
  console.log('Hello, World!');
}
```
````

### 数学公式

行内公式：`$E = mc^2$`

块级公式：

```
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

### 多级引用

```markdown
> 一级引用
>
> > 二级引用
>
> > > 三级引用
```

### 表格

```markdown
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 1   | 2   | 3   |
| 4   | 5   | 6   |
```

## 输出使用

1. 运行转换命令生成 HTML 文件
2. 打开生成的 HTML 文件
3. 全选复制内容（Ctrl+A, Ctrl+C）
4. 粘贴到微信公众号编辑器（Ctrl+V）

## 项目结构

```
wechat/
├── bin/
│   └── md2wechat.js      # CLI 入口文件
├── lib/
│   ├── parser.js         # Markdown 解析器
│   ├── converter.js      # HTML 转换器
│   ├── plugins/          # markdown-it 插件
│   └── highlight/        # 代码高亮配置
├── themes/               # 样式主题
│   ├── basic.css         # 基础样式
│   ├── markdown/         # Markdown 主题
│   └── code/             # 代码高亮主题
├── package.json
└── README.md
```

## 依赖

- [markdown-it](https://github.com/markdown-it/markdown-it) - Markdown 解析器
- [highlight.js](https://highlightjs.org/) - 代码语法高亮
- [katex](https://katex.org/) - 数学公式渲染
- [juice](https://github.com/Automattic/juice) - CSS 内联化

## 参考项目

本工具基于 [markdown-nice](https://github.com/mdnice/markdown-nice) 项目实现。

## 许可证

MIT
