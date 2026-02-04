/**
 * WeChat Official Account API module
 */

import https from 'https';
import fs from 'fs';
import FormData from 'form-data';
import { URL } from 'url';
import { logger } from '../cli/utils/logger';
import type {
  WeChatConfig,
  ArticleData,
  DraftItem,
  UploadMaterialResponse,
  CreateDraftResponse
} from '../types/index';

/**
 * WeChat API response (raw snake_case)
 */
interface WeChatApiResult {
  errcode?: number;
  errmsg?: string;
  access_token?: string;
  expires_in?: number;
  media_id?: string;
  url?: string;
  itemCount?: number;
  item?: DraftItem[];
}

/**
 * Raw upload material response from WeChat API
 */
interface RawUploadMaterialResponse {
  errcode?: number;
  errmsg?: string;
  type?: string;
  media_id?: string;
  url?: string;
}

/**
 * Request options
 */
interface RequestOptions {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  data?: unknown;
}

/**
 * WeChat Official Account API class
 */
export class WeChatApi {
  private config: WeChatConfig;
  private apiBaseUrl: string;
  private accessToken: string | null = null;
  private tokenExpireTime: number = 0;

  constructor(config: WeChatConfig) {
    this.config = config;
    this.apiBaseUrl = 'api.weixin.qq.com';
  }

  /**
   * Make HTTPS request to WeChat API
   */
  private request(options: RequestOptions): Promise<WeChatApiResult> {
    return new Promise((resolve, reject) => {
      const body = options.data ? JSON.stringify(options.data) : '';

      const headers: Record<string, string> = {
        ...(options.headers || {})
      };

      if (body) {
        headers['Content-Length'] = String(Buffer.byteLength(body));
      }

      const req = https.request(
        {
          hostname: this.apiBaseUrl,
          path: options.path,
          method: options.method || 'GET',
          headers
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (!data || data.trim() === '') {
              reject(new Error(`Empty response from WeChat API. Status: ${res.statusCode}`));
              return;
            }

            try {
              const result = JSON.parse(data) as WeChatApiResult;
              if (result.errcode === 0 || result.errcode === undefined) {
                resolve(result);
              } else {
                reject(new Error(`API Error ${result.errcode}: ${result.errmsg}`));
              }
            } catch (e) {
              reject(
                new Error(
                  `Parse Error: ${(e as Error).message}. Response: ${data.substring(0, 200)}`
                )
              );
            }
          });
        }
      );

      req.on('error', (err) => {
        reject(new Error(`Request Error: ${err.message}`));
      });

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }

  /**
   * Token expiry buffer in milliseconds (5 minutes)
   */
  private static readonly TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
  /**
   * Token expiry buffer in seconds (5 minutes)
   */
  private static readonly TOKEN_EXPIRY_BUFFER_SEC = 5 * 60;

  /**
   * Convert ArticleData from camelCase to snake_case for WeChat API
   */
  private convertArticleToSnakeCase(article: ArticleData): Record<string, unknown> {
    const converted: Record<string, unknown> = {
      title: article.title,
      author: article.author,
      content: article.content
    };

    if (article.digest) {
      converted.digest = article.digest;
    }

    if (article.contentSourceUrl) {
      converted.content_source_url = article.contentSourceUrl;
    }

    if (article.thumbMediaId) {
      converted.thumb_media_id = article.thumbMediaId;
    }

    if (article.showCoverPic !== undefined) {
      converted.show_cover_pic = article.showCoverPic;
    }

    if (article.needOpenComment !== undefined) {
      converted.need_open_comment = article.needOpenComment;
    }

    if (article.onlyFansCanComment !== undefined) {
      converted.only_fans_can_comment = article.onlyFansCanComment;
    }

    return converted;
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string> {
    // 如果 token 还有 5 分钟过期，直接返回
    if (this.accessToken && Date.now() < this.tokenExpireTime - WeChatApi.TOKEN_EXPIRY_BUFFER_MS) {
      return this.accessToken;
    }

    const response = await this.request({
      path: `/cgi-bin/token?grant_type=client_credential&appid=${this.config.appId}&secret=${this.config.appSecret}`,
      method: 'GET'
    });

    if (response.access_token && response.expires_in) {
      this.accessToken = response.access_token;
      this.tokenExpireTime = Date.now() + (response.expires_in - WeChatApi.TOKEN_EXPIRY_BUFFER_SEC) * 1000;
      return this.accessToken;
    }

    throw new Error('Failed to get access token');
  }

  /**
   * Upload permanent material (image)
   * Returns media_id and url
   */
  async uploadImage(filePath: string): Promise<UploadMaterialResponse> {
    const token = await this.getAccessToken();

    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('media', fs.createReadStream(filePath));

      const url = new URL('https://api.weixin.qq.com/cgi-bin/material/add_material');
      url.searchParams.append('access_token', token);
      url.searchParams.append('type', 'image');

      form.submit(url as unknown as string, (err, res) => {
        if (err) {
          reject(new Error(`Upload Error: ${err.message}`));
          return;
        }

        let data = '';
        res?.on('data', (chunk) => {
          data += chunk;
        });
        res?.on('end', () => {
          if (!data || data.trim() === '') {
            reject(new Error('Empty response from WeChat API'));
            return;
          }
          try {
            const result = JSON.parse(data) as RawUploadMaterialResponse;
            if (result.errcode && result.errcode !== 0) {
              reject(new Error(`Upload Error ${result.errcode}: ${result.errmsg}`));
            } else if (result.media_id && result.url) {
              resolve({
                errcode: 0,
                errmsg: 'ok',
                type: 'image',
                mediaId: result.media_id,
                url: result.url
              });
            } else {
              reject(new Error('Upload failed: media_id or url not returned'));
            }
          } catch (e) {
            reject(
              new Error(`Parse Error: ${(e as Error).message}. Response: ${data.substring(0, 200)}`)
            );
          }
        });
      });
    });
  }

  /**
   * Upload thumbnail
   */
  async uploadThumb(filePath: string): Promise<string> {
    const token = await this.getAccessToken();

    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('media', fs.createReadStream(filePath));

      const url = new URL('https://api.weixin.qq.com/cgi-bin/material/add_material');
      url.searchParams.append('access_token', token);
      url.searchParams.append('type', 'thumb');

      form.submit(url as unknown as string, (err, res) => {
        if (err) {
          reject(new Error(`Upload Error: ${err.message}`));
          return;
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (!data || data.trim() === '') {
            reject(new Error('Empty response from WeChat API'));
            return;
          }
          try {
            const result = JSON.parse(data);
            if (result.errcode && result.errcode !== 0) {
              reject(new Error(`Upload Error ${result.errcode}: ${result.errmsg}`));
            } else {
              resolve(result.media_id);
            }
          } catch (e) {
            reject(
              new Error(`Parse Error: ${(e as Error).message}. Response: ${data.substring(0, 200)}`)
            );
          }
        });
      });
    });
  }

  /**
   * Create new draft
   */
  async createDraft(articles: ArticleData[]): Promise<CreateDraftResponse> {
    const token = await this.getAccessToken();

    console.log('📤 发送数据预览:');
    console.log('  Articles count:', articles.length);
    console.log('  Title:', articles[0].title);
    console.log('  Content length:', articles[0].content.length);

    const convertedArticles = articles.map((article) => this.convertArticleToSnakeCase(article));

    const response = await this.request({
      path: `/cgi-bin/draft/add?access_token=${token}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        articles: convertedArticles
      }
    });

    if (response.media_id) {
      return {
        errcode: 0,
        errmsg: 'ok',
        mediaId: response.media_id
      };
    }

    throw new Error('Failed to create draft: media_id not returned');
  }

  /**
   * Update existing draft
   */
  async updateDraft(mediaId: string, index: number, article: ArticleData): Promise<void> {
    const token = await this.getAccessToken();

    logger.debug(`Updating draft: mediaId=${mediaId}, index=${index}`);
    logger.debug(`Title: ${article.title}`);
    logger.debug(`Content length: ${article.content.length}`);

    const converted = this.convertArticleToSnakeCase(article);

    await this.request({
      path: `/cgi-bin/draft/update?access_token=${encodeURIComponent(token)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        media_id: mediaId,
        index,
        articles: converted
      }
    });
  }

  /**
   * Get draft list
   */
  async getDraftList(offset = 0, count = 20, noContent = 1): Promise<{ itemCount: number; item: DraftItem[] }> {
    const token = await this.getAccessToken();

    const response = await this.request({
      path: `/cgi-bin/draft/list?access_token=${encodeURIComponent(token)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        offset,
        count,
        no_content: noContent
      }
    });

    return {
      itemCount: response.itemCount || 0,
      item: response.item || []
    };
  }

  /**
   * Add permanent news material
   */
  async addNews(articles: ArticleData[]): Promise<{ mediaId: string }> {
    const token = await this.getAccessToken();

    const response = await this.request({
      path: `/cgi-bin/material/add_news?access_token=${encodeURIComponent(token)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        articles
      }
    });

    if (response.media_id) {
      return { mediaId: response.media_id };
    }

    throw new Error('Failed to add news: media_id not returned');
  }
}

export default WeChatApi;
