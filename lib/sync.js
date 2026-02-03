#!/usr/bin/env node
/**
 * 同步文章到微信公众号草稿箱
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { render } from './parser.js';
import { convertToWeChat, wrapContent } from './converter.js';
import WeChatAPI from './wechat-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从命令行参数获取选项
const args = process.argv.slice(2);

function showUsage() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           同步 Markdown 到微信公众号草稿箱                    ║
╚═══════════════════════════════════════════════════════════════╝

用法:
  node sync.js <input.md> [选项]

选项:
  -t, --title <title>      文章标题（默认: 从 Markdown 提取）
  -a, --author <author>   作者名称（默认: 从配置文件读取）
  -d, --digest <digest>   摘要（默认: 文章开头部分）
  -u, --update <media_id> 更新现有草稿（指定草稿的 media_id）
  -i, --index <index>     更新草稿时的文章索引（默认: 0）

配置文件:
  weixin.config.json (从 weixin.config.example.json 复制)

  配置项:
    appId     微信公众号 AppID
    appSecret 微信公众号 AppSecret
    defaultAuthor 默认作者名称

示例:
  # 创建新草稿
  node sync.js article.md
  node sync.js article.md -t "我的文章标题"
  node sync.js article.md -a "作者名" -d "文章摘要"

  # 更新现有草稿
  node sync.js article.md -u fLLBMJmlCJPG_csHKqVIGRgNryHhdFREhj3WiXjO5JpQ3bobjhpMEbDmfGeQXlP3

获取 AppID 和 AppSecret:
  1. 登录微信公众平台 https://mp.weixin.qq.com
  2. 进入 开发 -> 基本配置
  3. 查看 AppID 和 AppSecret
`);
}

function parseArgs(args) {
  const options = {
    input: null,
    title: null,
    author: null,
    digest: null,
    update: null,   // media_id for updating existing draft
    index: 0        // article index in draft (default: 0)
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-t' || arg === '--title') {
      options.title = args[++i];
    } else if (arg === '-a' || arg === '--author') {
      options.author = args[++i];
    } else if (arg === '-d' || arg === '--digest') {
      options.digest = args[++i];
    } else if (arg === '-u' || arg === '--update') {
      options.update = args[++i];
    } else if (arg === '-i' || arg === '--index') {
      options.index = parseInt(args[++i]);
    } else if (!arg.startsWith('-')) {
      options.input = arg;
    }
  }

  return options;
}

function extractTitleFromMarkdown(markdown) {
  // 提取第一个 # 标题作为文章标题
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1] : null;
}

function extractDigestFromMarkdown(markdown, maxLength = 120) {
  // 移除标题和特殊标记
  let content = markdown
    .replace(/^#\s+.+$/m, '')  // 移除标题
    .replace(/```[\s\S]*?```/g, '')  // 移除代码块
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // 简化链接
    .replace(/[*_`#]/g, '')  // 移除格式符号
    .replace(/\n+/g, ' ')  // 换行转空格
    .trim();

  // 截取指定长度
  if (content.length > maxLength) {
    content = content.substring(0, maxLength - 3) + '...';
  }

  return content;
}

/**
 * 提取HTML中的本地图片路径并上传到微信
 * @param {string} html - HTML内容
 * @param {string} markdownDir - Markdown文件所在目录
 * @param {WeChatAPI} api - 微信API实例
 * @returns {Promise<string>} 处理后的HTML
 */
async function uploadImagesInHtml(html, markdownDir, api) {
  // 匹配所有img标签的src属性
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  const images = [];
  let lastIndex = 0;
  let resultHtml = html;

  // 先收集所有图片信息
  while ((match = imgRegex.exec(html)) !== null) {
    const imgTag = match[0];
    const src = match[1];

    // 只处理本地图片路径
    if (src && !src.startsWith('http://') && !src.startsWith('https://')) {
      images.push({
        originalTag: imgTag,
        src: src
      });
    }
  }

  if (images.length === 0) {
    return html;
  }

  console.log(`\n📷 发现 ${images.length} 张本地图片，正在上传...`);

  // 逐个上传图片
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const imagePath = path.resolve(markdownDir, img.src);

    console.log(`  [${i + 1}/${images.length}] 上传: ${img.src}`);

    // 检查文件是否存在
    if (!fs.existsSync(imagePath)) {
      console.warn(`    ⚠️  文件不存在，跳过: ${imagePath}`);
      continue;
    }

    try {
      // 上传图片到微信
      const uploadResult = await api.uploadImage(imagePath);
      console.log(`    ✅ 上传成功: ${uploadResult.url}`);

      // 替换HTML中的图片URL
      resultHtml = resultHtml.replace(img.originalTag, img.originalTag.replace(img.src, uploadResult.url));
    } catch (error) {
      console.warn(`    ❌ 上传失败: ${error.message}`);
    }
  }

  console.log(`📷 图片上传完成!\n`);
  return resultHtml;
}

async function syncToWeChat(options) {
  // 读取配置文件
  const configPath = path.join(__dirname, 'weixin.config.json');
  if (!fs.existsSync(configPath)) {
    console.error(`❌ 配置文件不存在: ${configPath}`);
    console.log(`   请从 weixin.config.example.json 复制并填写你的 AppID 和 AppSecret`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  if (!config.appId || !config.appSecret) {
    console.error(`❌ 配置文件中缺少 appId 或 appSecret`);
    process.exit(1);
  }

  // 读取 Markdown 文件
  const markdown = fs.readFileSync(options.input, 'utf-8');
  const markdownDir = path.dirname(path.resolve(options.input));

  // 转换为 HTML
  console.log(`📖 正在转换 Markdown...`);
  const html = render(markdown, { theme: 'default', codeTheme: 'atom-one-dark' });
  const wrappedHtml = wrapContent(html);
  let wechatHtml = convertToWeChat(wrappedHtml, { theme: 'default', codeTheme: 'atom-one-dark' });

  // 移除所有 <style> 标签（WeChat API 不接受 style 标签）
  wechatHtml = wechatHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // 初始化 API（需要在上传图片前初始化）
  const api = new WeChatAPI(config);

  // 上传HTML中的本地图片
  wechatHtml = await uploadImagesInHtml(wechatHtml, markdownDir, api);

  // 提取标题
  const title = options.title || extractTitleFromMarkdown(markdown);
  if (!title) {
    console.error(`❌ 无法提取文章标题，请使用 -t 参数指定`);
    process.exit(1);
  }

  // 提取摘要
  const digest = options.digest || extractDigestFromMarkdown(markdown);

  // 作者
  const author = options.author || config.defaultAuthor || '佚名';

  console.log(`📝 标题: ${title}`);
  console.log(`✍️  作者: ${author}`);
  console.log(`📄 摘要: ${digest.substring(0, 50)}...`);

  // 判断是更新还是新建
  if (options.update) {
    // 更新现有草稿
    console.log(`\n🔄 正在更新草稿...`);
    console.log(`📎 Media ID: ${options.update}`);
    console.log(`📑 文章索引: ${options.index}`);

    // 上传封面图（更新时也必须包含 thumb_media_id）
    console.log(`📷 正在上传封面图...`);
    const defaultCoverPath = path.join(path.dirname(__dirname), 'default-cover.png');

    if (!fs.existsSync(defaultCoverPath)) {
      console.error(`❌ 默认封面图不存在: ${defaultCoverPath}`);
      process.exit(1);
    }

    const uploadResult = await api.uploadImage(defaultCoverPath);
    console.log(`✅ 封面图上传成功, media_id: ${uploadResult.media_id}`);

    // 构建文章对象（更新时必须包含 thumb_media_id）
    const article = {
      title: title,
      author: author,
      digest: digest,
      content: wechatHtml,
      thumb_media_id: uploadResult.media_id
    };

    try {
      const result = await api.updateDraft(options.update, options.index, article);
      console.log(`✅ 更新成功!`);
      console.log(`\n💡 请登录微信公众平台查看更新后的草稿`);
      console.log(`   https://mp.weixin.qq.com`);
    } catch (error) {
      console.error(`❌ 更新失败: ${error.message}`);
      process.exit(1);
    }
  } else {
    // 创建新草稿
    console.log(`\n🔄 正在创建新草稿...`);

    // 上传默认封面图
    console.log(`📷 正在上传默认封面图...`);
    const defaultCoverPath = path.join(path.dirname(__dirname), 'default-cover.png');

    if (!fs.existsSync(defaultCoverPath)) {
      console.error(`❌ 默认封面图不存在: ${defaultCoverPath}`);
      process.exit(1);
    }

    const uploadResult = await api.uploadImage(defaultCoverPath);
    console.log(`✅ 封面图上传成功, media_id: ${uploadResult.media_id}`);

    // 构建文章对象，只包含必需和有值的字段
    const article = {
      title: title,
      author: author,
      digest: digest,
      content: wechatHtml,
      thumb_media_id: uploadResult.media_id
    };

    try {
      const result = await api.createDraft([article]);

      console.log(`✅ 同步成功!`);
      console.log(`📎 草稿 ID: ${result.media_id}`);
      console.log(`\n💡 请登录微信公众平台查看草稿箱进行编辑和发布`);
      console.log(`   https://mp.weixin.qq.com`);
    } catch (error) {
      console.error(`❌ 同步失败: ${error.message}`);

      if (error.message.includes('access_token')) {
        console.log(`\n💡 请检查 AppID 和 AppSecret 是否正确`);
      } else if (error.message.includes('40001')) {
        console.log(`\n💡 AppID 或 AppSecret 不正确`);
      } else if (error.message.includes('40164')) {
        console.log(`\n💡 API 调用频率限制，请稍后再试`);
      }

      process.exit(1);
    }
  }
}

async function main() {
  const options = parseArgs(args);

  if (!options.input) {
    showUsage();
    process.exit(0);
  }

  // 检查输入文件是否存在
  if (!fs.existsSync(options.input)) {
    console.error(`❌ 文件不存在: ${options.input}`);
    process.exit(1);
  }

  await syncToWeChat(options);
}

main();
