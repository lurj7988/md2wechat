/**
 * Configuration utilities
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import type { CodeLayout, Config, WeChatConfig, ThemeConfig } from '../../types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Global config: ~/.md2wechat/config.json
 * Shared across all projects - put credentials here once.
 */
const GLOBAL_CONFIG_PATH = join(homedir(), '.md2wechat', 'config.json');

/**
 * Project-local config: ./.md2wechat/config.json
 * Overrides the global config for this project only.
 */
const PROJECT_CONFIG_PATH = join(process.cwd(), '.md2wechat', 'config.json');

/** Raw shape of a config.json file on disk (all fields optional). */
interface RawConfig {
  wechat?: {
    appId?: string;
    appSecret?: string;
    defaultAuthor?: string;
  };
  theme?: string;
  codeTheme?: string;
  codeLayout?: string;
}

/**
 * Read and parse a JSON config file. Returns an empty object when the file
 * does not exist; logs and returns empty on parse errors.
 */
async function readConfigFile(filePath: string, label: string): Promise<RawConfig> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as RawConfig;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return {};
    }
    logger.debug(`${label} config parse error (${filePath}): ${err.message}`);
    return {};
  }
}

/**
 * Merge two raw configs. Values in `override` win over `base`.
 */
function mergeRaw(base: RawConfig, override: RawConfig): RawConfig {
  return {
    wechat: {
      appId: override.wechat?.appId ?? base.wechat?.appId,
      appSecret: override.wechat?.appSecret ?? base.wechat?.appSecret,
      defaultAuthor: override.wechat?.defaultAuthor ?? base.wechat?.defaultAuthor
    },
    theme: override.theme ?? base.theme,
    codeTheme: override.codeTheme ?? base.codeTheme,
    codeLayout: override.codeLayout ?? base.codeLayout
  };
}

/**
 * Get package version
 */
export async function getPackageVersion(): Promise<string> {
  try {
    // Traverse up from dist/cli/utils/config.ts to project root
    const packagePath = join(__dirname, '../../../package.json');
    const content = await fs.readFile(packagePath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version || '2.0.0';
  } catch {
    return '2.0.0';
  }
}

/**
 * Load full configuration.
 *
 * Resolution order (highest priority first):
 *   1. Project-local config  ./.md2wechat/config.json
 *   2. Global config         ~/.md2wechat/config.json
 *   3. Environment variables (CI/container fallback)
 *
 * CLI flags are applied by each command on top of the returned config.
 */
export async function loadConfig(): Promise<Config> {
  const globalRaw = await readConfigFile(GLOBAL_CONFIG_PATH, 'Global');
  const projectRaw = await readConfigFile(PROJECT_CONFIG_PATH, 'Project');

  if (Object.keys(globalRaw).length) {
    logger.debug(`Global config loaded: ${GLOBAL_CONFIG_PATH}`);
  }
  if (Object.keys(projectRaw).length) {
    logger.debug(`Project config loaded: ${PROJECT_CONFIG_PATH}`);
  }

  const merged = mergeRaw(globalRaw, projectRaw);

  // 3. Environment variable fallback (CI/containers)
  const wechat: WeChatConfig = {
    appId: merged.wechat?.appId || process.env.WECHAT_APP_ID || process.env.WECHAT_APPID || '',
    appSecret:
      merged.wechat?.appSecret || process.env.WECHAT_APP_SECRET || process.env.WECHAT_APPSECRET || '',
    defaultAuthor: merged.wechat?.defaultAuthor || process.env.WECHAT_DEFAULT_AUTHOR || ''
  };

  const codeLayoutValue = merged.codeLayout || process.env.CODE_LAYOUT || 'wrap';
  const codeLayout: CodeLayout = codeLayoutValue === 'scroll' ? 'scroll' : 'wrap';
  if (codeLayoutValue !== 'wrap' && codeLayoutValue !== 'scroll') {
    logger.warning(`Invalid codeLayout "${codeLayoutValue}", falling back to "wrap"`);
  }

  const theme: ThemeConfig = {
    name: merged.theme || process.env.THEME || 'default',
    codeTheme: merged.codeTheme || process.env.CODE_THEME || 'atom-one-dark',
    codeLayout
  };

  logger.debug(`THEME = ${theme.name}`);
  logger.debug(`CODE_THEME = ${theme.codeTheme}`);
  logger.debug(`CODE_LAYOUT = ${theme.codeLayout}`);

  return { wechat, theme };
}

/**
 * Ensure WeChat credentials are present; throw a friendly error otherwise.
 * Call this in commands that talk to the WeChat API.
 */
export function requireWeChatCredentials(config: Config): void {
  if (!config.wechat.appId || !config.wechat.appSecret) {
    throw new Error(
      'WeChat credentials not configured. Set wechat.appId and wechat.appSecret in ' +
        '~/.md2wechat/config.json (or ./.md2wechat/config.json), or export the ' +
        'WECHAT_APP_ID and WECHAT_APP_SECRET environment variables.'
    );
  }
}
