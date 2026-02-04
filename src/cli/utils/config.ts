/**
 * Configuration utilities
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import type { Config, ConfigFile, WeChatConfig, ThemeConfig } from '../../types/index.js';

/**
 * Load environment variables from .env file
 */
export function loadEnv(): void {
  dotenv.config();
}

/**
 * Get package version
 */
export async function getPackageVersion(): Promise<string> {
  try {
    const packagePath = join(process.cwd(), 'package.json');
    const content = await fs.readFile(packagePath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version || '2.0.0';
  } catch {
    return '2.0.0';
  }
}

/**
 * Load WeChat configuration from environment variables or config file
 */
export function loadWeChatConfig(): WeChatConfig {
  const appId = process.env.WECHAT_APP_ID || process.env.WECHAT_APPID || '';
  const appSecret = process.env.WECHAT_APP_SECRET || process.env.WECHAT_APPSECRET || '';
  const defaultAuthor = process.env.WECHAT_DEFAULT_AUTHOR || '';

  if (!appId || !appSecret) {
    throw new Error(
      'WeChat credentials not configured. Please set WECHAT_APP_ID and WECHAT_APP_SECRET environment variables.'
    );
  }

  return {
    appId,
    appSecret,
    defaultAuthor
  };
}

/**
 * Load theme configuration
 */
export function loadThemeConfig(): ThemeConfig {
  const name = process.env.THEME || 'default';
  const codeTheme = process.env.CODE_THEME || 'atom-one-dark';

  return {
    name,
    codeTheme
  };
}

/**
 * Load full configuration
 */
export async function loadConfig(configPath?: string): Promise<Config> {
  loadEnv();

  let userConfig: ConfigFile = {};

  if (configPath) {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      userConfig = JSON.parse(content);
    } catch (error) {
      console.warn(`Warning: Could not load config file from ${configPath}`);
    }
  }

  const wechat = userConfig.wechat || loadWeChatConfig();
  const theme = { ...loadThemeConfig(), ...userConfig.theme };

  return { wechat, theme };
}

/**
 * Get config file path
 */
export function getConfigPath(): string {
  const customPath = process.env.MD2WECHAT_CONFIG;
  if (customPath) {
    return customPath;
  }

  // Check for config in current directory
  const cwd = process.cwd();
  return join(cwd, 'md2wechat.config.json');
}
