import * as vscode from 'vscode';
import * as cfg from '../configuration';
import { getMatchingHeaderSource, logger, activeLanguageServer, LanguageServer } from '../extension';


export async function switchHeaderSourceInWorkspace(): Promise<boolean | undefined> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        logger.alertError('No active text editor detected.');
        return;
    }

    const matchingUri = await getMatchingHeaderSource(editor.document.uri);
    if (!matchingUri) {
        if (activeLanguageServer() === LanguageServer.cpptools) {
            vscode.commands.executeCommand('C_Cpp.SwitchHeaderSource');
        } else if (activeLanguageServer() === LanguageServer.clangd) {
            vscode.commands.executeCommand('clangd.switchheadersource');
        } else {
            logger.alertInformation('No matching header/source file was found.');
            return false;
        }
        logger.logInfo('No matching header/source file was found.');
        return true;
    }

    if (!cfg.openPairFileBesideEnabled()) {
        await vscode.window.showTextDocument(matchingUri);
        return true;
    }

    const visibleEditors = vscode.window.visibleTextEditors;
    let nextColumn = vscode.ViewColumn.Two;
    for (const visibleEditor of visibleEditors) {
        if (visibleEditor.document.uri.toString() === matchingUri.toString()) {
            await vscode.window.showTextDocument(visibleEditor.document, { viewColumn: visibleEditor.viewColumn, preserveFocus: false });
            return true;
        }

        if (nextColumn === vscode.ViewColumn.Two && editor.viewColumn && visibleEditor.viewColumn === editor.viewColumn + 1) {
            nextColumn = editor.viewColumn + 1;
        }
    }

    if (!editor.viewColumn) {
        await vscode.window.showTextDocument(matchingUri, { viewColumn: vscode.ViewColumn.Beside });
    } else if (editor.viewColumn === vscode.ViewColumn.One) {
        await vscode.window.showTextDocument(matchingUri, { viewColumn: vscode.ViewColumn.Two });
    } else if (editor.viewColumn > vscode.ViewColumn.One && nextColumn !== vscode.ViewColumn.Two) {
        await vscode.window.showTextDocument(matchingUri, { viewColumn: nextColumn });
    } else {
        await vscode.window.showTextDocument(matchingUri, { viewColumn: editor.viewColumn - 1 });
    }
    return true;
}
