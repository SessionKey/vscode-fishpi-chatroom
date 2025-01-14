import axios from 'axios';
import * as crypto from 'crypto';

export class AuthService {
    private static readonly API_BASE = 'https://fishpi.cn';

    public static async login(username: string, password: string): Promise<string> {
        try {
            const md5Password = crypto.createHash('md5').update(password).digest('hex');
            
            const response = await axios.post(`${this.API_BASE}/login`, {
                nameOrEmail: username,
                userPassword: md5Password,
                mfaCode: "",
                rememberLogin: true,
                captcha: ""
            }, {
                maxRedirects: 0,
                validateStatus: (status) => status === 302 || status === 200
            });

            const cookies = response.headers['set-cookie'];
            if (!cookies) {
                throw new Error('登录失败：未获取到Cookie');
            }

            const sessionCookie = cookies.find(cookie => cookie.includes('sym-ce'));
            if (!sessionCookie) {
                throw new Error('登录失败：未获取到会话ID');
            }

            const match = sessionCookie.match(/sym-ce=([^;]+)/);
            if (!match) {
                throw new Error('登录失败：会话ID格式错误');
            }

            return match[1];
        } catch (error) {
            console.error('登录失败:', error);
            throw new Error('登录失败：' + (error instanceof Error ? error.message : '未知错误'));
        }
    }

    public static async getWebSocketUrl(sessionId: string): Promise<string> {
        try {
            const timestamp = Date.now();
            const response = await axios.get(`${this.API_BASE}/chat-room/node/get?_=${timestamp}`, {
                headers: {
                    'Cookie': `sym-ce=${sessionId}`
                }
            });

            if (response.data.code !== 0) {
                throw new Error('获取WebSocket地址失败');
            }

            return response.data.data;
        } catch (error) {
            console.error('获取WebSocket地址失败:', error);
            throw new Error('获取WebSocket地址失败');
        }
    }
} 