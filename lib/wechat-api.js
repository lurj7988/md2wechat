/**
 * 微信公众号 API 调用模块
 */
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { URL } from 'url';

class WeChatAPI {
  constructor(config) {
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.apiBaseUrl = 'api.weixin.qq.com';
    this.accessToken = null;
    this.tokenExpireTime = 0;
  }

  /**
   * 发起 HTTPS 请求
   */
  request(options) {
    return new Promise((resolve, reject) => {
      let body = '';
      if (options.data) {
        body = JSON.stringify(options.data);
      }

      const headers = {
        ...(options.headers || {}),
      };

      if (body) {
        headers['Content-Length'] = Buffer.byteLength(body);
      }

      const req = https.request({
        hostname: this.apiBaseUrl,
        path: options.path,
        method: options.method || 'GET',
        headers: headers
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          // Log response for debugging
          if (!data || data.trim() === '') {
            reject(new Error(`Empty response from WeChat API. Status: ${res.statusCode}`));
            return;
          }

          try {
            const result = JSON.parse(data);
            if (result.errcode === 0 || result.errcode === undefined) {
              resolve(result);
            } else {
              reject(new Error(`API Error ${result.errcode}: ${result.errmsg}`));
            }
          } catch (e) {
            reject(new Error(`Parse Error: ${e.message}. Response: ${data.substring(0, 200)}`));
          }
        });
      });

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
   * 获取 access_token
   */
  async getAccessToken() {
    // 如果 token 还有 5 分钟过期，直接返回
    if (this.accessToken && Date.now() < this.tokenExpireTime - 300000) {
      return this.accessToken;
    }

    const response = await this.request({
      path: `/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`,
      method: 'GET'
    });

    this.accessToken = response.access_token;
    this.tokenExpireTime = Date.now() + (response.expires_in - 300) * 1000; // 提前5分钟过期

    return this.accessToken;
  }

  /**
   * 上传永久素材（图片）
   * 返回 media_id 和 url
   */
  async uploadImage(filePath) {
    const token = await this.getAccessToken();

    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('media', fs.createReadStream(filePath));

      const url = new URL(`https://api.weixin.qq.com/cgi-bin/material/add_material`);
      url.searchParams.append('access_token', token);
      url.searchParams.append('type', 'image');

      form.submit(url, (err, res) => {
        if (err) {
          reject(new Error(`Upload Error: ${err.message}`));
          return;
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          console.log('Upload response:', data.substring(0, 200));
          if (!data || data.trim() === '') {
            reject(new Error('Empty response from WeChat API'));
            return;
          }
          try {
            const result = JSON.parse(data);
            if (result.errcode && result.errcode !== 0) {
              reject(new Error(`Upload Error ${result.errcode}: ${result.errmsg}`));
            } else {
              resolve({
                media_id: result.media_id,
                url: result.url
              });
            }
          } catch (e) {
            reject(new Error(`Parse Error: ${e.message}. Response: ${data.substring(0, 200)}`));
          }
        });
      });
    });
  }

  /**
   * 新建草稿
   * articles: 文章数组，每篇包含 title, author, digest, content, content_source_url, thumb_media_id
   */
  async createDraft(articles) {
    const token = await this.getAccessToken();

    const payload = {
      articles: articles
    };

    console.log('📤 发送数据预览:');
    console.log('  Articles count:', articles.length);
    console.log('  Title:', articles[0].title);
    console.log('  Content length:', articles[0].content.length);
    console.log('  Content preview:', articles[0].content.substring(0, 200));

    const response = await this.request({
      path: `/cgi-bin/draft/add?access_token=${token}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: payload
    });

    return response;
  }

  /**
   * 更新草稿
   * mediaId: 草稿的 media_id
   * index: 文章索引（0-based）
   * article: 文章对象
   */
  async updateDraft(mediaId, index, article) {
    const token = await this.getAccessToken();

    const payload = {
      media_id: mediaId,
      index: index,
      articles: [article]  // 使用 articles 数组格式
    };

    console.log('📤 更新草稿数据预览:');
    console.log('  Media ID:', mediaId);
    console.log('  Index:', index);
    console.log('  Title:', article.title);
    console.log('  Content length:', article.content.length);

    const response = await this.request({
      path: `/cgi-bin/draft/update?access_token=${token}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: payload
    });

    return response;
  }

  /**
   * 获取草稿列表
   */
  async getDraftList(offset = 0, count = 20, noContent = 1) {
    const token = await this.getAccessToken();

    const response = await this.request({
      path: `/cgi-bin/draft/list?access_token=${token}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        offset: offset,
        count: count,
        no_content: noContent
      }
    });

    return response;
  }

  /**
   * 新建永久图文素材
   */
  async addNews(articles) {
    const token = await this.getAccessToken();

    const response = await this.request({
      path: `/cgi-bin/material/add_news?access_token=${token}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        articles: articles
      }
    });

    return response;
  }
}

export default WeChatAPI;
