import * as vscode from 'vscode';

export class SessionConfig {
    private static readonly SESSION_KEY = 'fishpi.sessionId';
    private static readonly USERNAME_KEY = 'fishpi.username';

    public static getSessionId(): string | undefined {
        return vscode.workspace.getConfiguration().get(SessionConfig.SESSION_KEY);
    }

    public static async setSessionId(sessionId: string) {
        await vscode.workspace.getConfiguration().update(
            SessionConfig.SESSION_KEY,
            sessionId,
            vscode.ConfigurationTarget.Global
        );
    }

    public static getUsername(): string | undefined {
        return vscode.workspace.getConfiguration().get(SessionConfig.USERNAME_KEY);
    }

    public static async setUsername(username: string) {
        await vscode.workspace.getConfiguration().update(
            SessionConfig.USERNAME_KEY,
            username,
            vscode.ConfigurationTarget.Global
        );
    }

    public static async clear() {
        await vscode.workspace.getConfiguration().update(
            SessionConfig.SESSION_KEY,
            undefined,
            vscode.ConfigurationTarget.Global
        );
        await vscode.workspace.getConfiguration().update(
            SessionConfig.USERNAME_KEY,
            undefined,
            vscode.ConfigurationTarget.Global
        );
    }
} 