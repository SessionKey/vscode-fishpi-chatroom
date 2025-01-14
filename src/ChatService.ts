import * as vscode from 'vscode';
import axios from 'axios';
import WebSocket from 'ws';
import { AuthService } from './services/AuthService';
import { SessionConfig } from './config/SessionConfig';

export class ChatService {
    private ws: WebSocket | undefined;
    private sessionId: string | undefined;
    private static wsUrl: string | undefined;  // 缓存WebSocket地址

    constructor(private readonly onMessage: (message: any) => void) {
        console.log('ChatService created')
    }

    public async connect() {
        try {
            if (!this.sessionId) {
                throw new Error('未登录');
            }

            // 如果已经连接，直接返回
            if (this.ws?.readyState === WebSocket.OPEN) {
                return;
            }

            // 如果没有缓存的WebSocket地址，才获取新的
            if (!ChatService.wsUrl) {
                ChatService.wsUrl = await AuthService.getWebSocketUrl(this.sessionId);
                console.log('获取到WebSocket地址:', ChatService.wsUrl);
            }
            if (!this.ws) {
                this.ws = new WebSocket(ChatService.wsUrl);

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data.toString());
                        if (data.type === 'msg') {
                            this.onMessage(data);
                        }
                    } catch (error) {
                        console.error('解析消息失败:', error);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket错误:', error);
                    vscode.window.showErrorMessage('聊天室连接失败');
                    // 连接错误时清除缓存的URL，下次重新获取
                    ChatService.wsUrl = undefined;
                };

                this.ws.onclose = () => {
                    this.ws = undefined;
                    console.log('WebSocket连接已关闭');
                    // 连接关闭时清除缓存的URL，下次重新获取
                    ChatService.wsUrl = undefined;
                };
            }


        } catch (error) {
            console.error('建立WebSocket连接失败:', error);
            vscode.window.showErrorMessage('无法连接到聊天室');
            // 连接失败时清除缓存的URL，下次重新获取
            ChatService.wsUrl = undefined;
        }
    }

    public async sendMessage(content: string) {
        try {
            if (!this.sessionId) {
                vscode.window.showErrorMessage('请先登录');
                return;
            }

            const response = await axios.post('https://fishpi.cn/chat-room/send', {
                content,
                client: 'vscode'
            }, {
                headers: {
                    'Cookie': `sym-ce=${this.sessionId};`
                }
            });

            if (response.status !== 200) {
                throw new Error('发送消息失败');
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            vscode.window.showErrorMessage('发送消息失败');
        }
    }
    public setSessionId(sessionId: string) {
        this.sessionId = sessionId;
    }

    public disconnect() {
        console.log('关闭WebSocket连接')
        if (this.ws) {
            this.ws.close();
        }
        SessionConfig.clear()
    }

  
} 