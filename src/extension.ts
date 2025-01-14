// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ChatPanel } from './ChatPanel';
import { SessionConfig } from './config/SessionConfig';
import { AuthService } from './services/AuthService';
import { ChatViewProvider } from './ChatViewProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "fishpi-chatroom" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let chatCommand = vscode.commands.registerCommand('fishpi-chatroom.openChat', () => {
		ChatPanel.createOrShow(context.extensionUri);
	});

	let loginCommand = vscode.commands.registerCommand('fishpi-chatroom.login', async () => {
		try {
			const username = await vscode.window.showInputBox({
				prompt: '请输入用户名',
				placeHolder: '用户名或邮箱'
			});

			if (!username) {
				return;
			}

			const password = await vscode.window.showInputBox({
				prompt: '请输入密码',
				password: true
			});

			if (!password) {
				return;
			}

			const sessionId = await AuthService.login(username, password);
			await SessionConfig.setSessionId(sessionId);
			await SessionConfig.setUsername(username);
			vscode.window.showInformationMessage('登录成功');
		} catch (error) {
			vscode.window.showErrorMessage(error instanceof Error ? error.message : '登录失败');
		}
	});

	let logoutCommand = vscode.commands.registerCommand('fishpi-chatroom.logout', async () => {
		await SessionConfig.clear();
		vscode.window.showInformationMessage('已退出登录');
	});

	// 注册视图提供者
	const chatViewProvider = new ChatViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('fishpi-chat', chatViewProvider)
	);

	context.subscriptions.push(chatCommand, loginCommand, logoutCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
