#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { render } from '../lib/parser.js';
import { convertToWeChat, wrapContent } from '../lib/converter.js';

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
md2wechat - Markdown to WeChat Official Account HTML Converter

Usage:
  md2wechat <input.md> [output.html] [options]

Options:
  --theme, -t <name>       Markdown theme (default: "default")
  --code-theme, -c <name>  Code highlighting theme (default: "atom-one-dark")
  --help, -h               Show this help message
  --version, -v            Show version number

Examples:
  # Convert a markdown file to HTML
  md2wechat input.md output.html

  # Use custom themes
  md2wechat input.md output.html --theme default --code-theme github

  # Read from stdin and output to stdout
  cat input.md | md2wechat > output.html

Available Code Themes:
  - atom-one-dark (default)
  - github

For more information, visit: https://github.com/mdnice/markdown-nice
`);
}

/**
 * 显示版本信息
 */
function showVersion() {
  const packagePath = resolve(import.meta.url, '../package.json');
  try {
    const pkg = JSON.parse(readFileSync(resolve('.', 'package.json'), 'utf8'));
    console.log(`md2wechat v${pkg.version}`);
  } catch {
    console.log('md2wechat v1.0.0');
  }
}

/**
 * 解析命令行参数
 */
function parseOptions(args) {
  const options = {
    theme: 'default',
    codeTheme: 'atom-one-dark',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      case '--version':
      case '-v':
        showVersion();
        process.exit(0);
        break;
      case '--theme':
      case '-t':
        options.theme = args[++i];
        break;
      case '--code-theme':
      case '-c':
        options.codeTheme = args[++i];
        break;
    }
  }

  return options;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);

  // 检查是否需要显示帮助
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // 解析选项，过滤掉非选项参数
  const nonOptionArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
  const optionArgs = args.filter(arg => arg.startsWith('--') || arg.startsWith('-'));
  const options = parseOptions(optionArgs);

  const inputFile = nonOptionArgs[0];
  const outputFile = nonOptionArgs[1];

  // 检查输入文件
  if (!inputFile) {
    console.error('Error: No input file specified');
    console.error('Usage: md2wechat <input.md> [output.html]');
    process.exit(1);
  }

  let markdown;

  // 从文件或 stdin 读取
  if (inputFile === '-') {
    // 从 stdin 读取
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      processMarkdown(data, options, outputFile);
    });
  } else {
    // 从文件读取
    const inputPath = resolve(inputFile);
    if (!existsSync(inputPath)) {
      console.error(`Error: Input file not found: ${inputFile}`);
      process.exit(1);
    }
    markdown = readFileSync(inputPath, 'utf8');
    processMarkdown(markdown, options, outputFile);
  }
}

/**
 * 处理 Markdown 并输出结果
 */
function processMarkdown(markdown, options, outputFile) {
  try {
    // 解析 Markdown 为 HTML
    const html = render(markdown, options);

    // 包装内容
    const wrappedHtml = wrapContent(html);

    // 转换为微信格式（内联样式）
    const wechatHtml = convertToWeChat(wrappedHtml, options);

    // 输出结果
    if (outputFile) {
      writeFileSync(resolve(outputFile), wechatHtml, 'utf8');
      console.log(`Successfully converted to: ${outputFile}`);
    } else {
      console.log(wechatHtml);
    }
  } catch (error) {
    console.error('Error during conversion:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main();
