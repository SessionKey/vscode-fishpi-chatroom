import * as vscode from 'vscode';
import { ChatService } from './ChatService';
import { SessionConfig } from './config/SessionConfig';
import { AuthService } from './services/AuthService';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    private static instance: ChatViewProvider | undefined;
    private _view?: vscode.WebviewView;
    private chatService?: ChatService;
    private messageHistory: any[] = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) {
        if (ChatViewProvider.instance) {
            return ChatViewProvider.instance;
        }
        ChatViewProvider.instance = this;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        if (!this.chatService) {
            this.chatService = new ChatService((message) => {
                this.messageHistory.push(message);
                this._view?.webview.postMessage({
                    type: 'receiveMessage',
                    data: message
                });
            });
        }

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async message => {
            switch (message.type) {
                case 'checkLoginStatus':
                    const sessionId = SessionConfig.getSessionId();
                    if (sessionId) {
                        this.chatService?.setSessionId(sessionId);
                        try {
                            await this.chatService?.connect();
                            const username = SessionConfig.getUsername();
                            this._view?.webview.postMessage({
                                type: 'alreadyLoggedIn',
                                history: this.messageHistory,
                                username: username
                            });
                        } catch (error) {
                            console.error('连接失败:', error);
                            this._view?.webview.postMessage({ type: 'notLoggedIn' });
                        }
                    } else {
                        this._view?.webview.postMessage({ type: 'notLoggedIn' });
                    }
                    break;
                case 'login':
                    try {
                        const sessionId = await AuthService.login(message.username, message.password);
                        await SessionConfig.setSessionId(sessionId);
                        await SessionConfig.setUsername(message.username);
                        this.chatService?.setSessionId(sessionId);
                        await this.chatService?.connect();
                        this._view?.webview.postMessage({
                            type: 'loginSuccess',
                            history: this.messageHistory,
                            username: message.username
                        });
                        vscode.window.showInformationMessage('登录成功');
                    } catch (error) {
                        vscode.window.showErrorMessage(error instanceof Error ? error.message : '登录失败');
                    }
                    break;
                case 'sendMessage':
                    await this.chatService?.sendMessage(message.content);
                    break;
                case 'showError':
                    vscode.window.showErrorMessage(message.message);
                    break;
                case 'updateImageSetting':
                    await vscode.workspace.getConfiguration().update(
                        'fishpi.showImages',
                        message.showImages,
                        vscode.ConfigurationTarget.Global
                    );
                    break;
                case 'getImageSetting':
                    const showImages = vscode.workspace.getConfiguration().get('fishpi.showImages');
                    this._view?.webview.postMessage({
                        type: 'updateImageSetting',
                        showImages
                    });
                    break;
            }
        });

        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('fishpi.sessionId')) {
                const newSessionId = SessionConfig.getSessionId();
                if (newSessionId && this.chatService) {
                    this.chatService.setSessionId(newSessionId);
                    this.chatService.connect().then(() => {
                        this._view?.webview.postMessage({
                            type: 'loginSuccess',
                            history: this.messageHistory
                        });
                    }).catch(error => {
                        console.error('重新连接失败:', error);
                    });
                }
            }
        });
    }

    public dispose() {
        this.chatService?.disconnect();
        ChatViewProvider.instance = undefined;
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'chat.html');
        let html = require('fs').readFileSync(htmlPath.fsPath, 'utf-8');
        return html;
    }
} 