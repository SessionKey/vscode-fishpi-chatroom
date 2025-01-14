import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ChatService } from './ChatService';

export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private chatService: ChatService;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        
        this.chatService = new ChatService((message) => {
            this._panel.webview.postMessage({
                type: 'receiveMessage',
                data: message
            });
        });
        
        // 连接WebSocket
        this.chatService.connect();
        
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
        
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.type) {
                    case 'sendMessage':
                        await this.chatService.sendMessage(message.content);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'chatRoom',
            '聊天室',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri);
    }

    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        const htmlPath = path.join(extensionUri.fsPath, 'src', 'webview', 'chat.html');
        let html = fs.readFileSync(htmlPath, 'utf-8');
        return html;
    }

    public dispose() {
        this.chatService.disconnect();
        ChatPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
} 