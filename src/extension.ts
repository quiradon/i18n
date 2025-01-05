import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

//pegue a chave de api nas configurações
const apiKey = vscode.workspace.getConfiguration().get('arkanus-i18n.apiKey');

//crie uma nova instância do GoogleGenerativeAI
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

async function IATraduzirString(texto: string, idioma: string) {
  const chatSession = model.startChat({
    generationConfig,
    history: [
    ],
  });

  const result = await chatSession.sendMessage(`Translate the following content into ${idioma}: '${texto}'. Ensure that placeholders like <%>, %user%, %target%, or similar remain completely unchanged and are not translated or modified. Adapt the surrounding text to fit the context naturally while keeping the placeholders intact. If emojis, special characters, HTML tags, or markdown formatting are present, retain them as is. Return only the translated string.`);
  console.log(result.response.text());
  return result.response.text();
}


import { loadTranslations, saveTranslations, addNewKey, updateKey, updateTranslation, deleteKey } from './translationUtils';
import { getWebviewContent } from './webviewUtils';

export function activate(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const testButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  testButton.text = '$(beaker) Kraken i18n';
  testButton.command = 'arkanus-i18n.testCommand';
  testButton.show();
  context.subscriptions.push(testButton);

  context.subscriptions.push(
    vscode.commands.registerCommand('arkanus-i18n.testCommand', async () => {
      const apiKey = vscode.workspace.getConfiguration().get('arkanus-i18n.apiKey');

      if (!apiKey || apiKey === '') {
        vscode.window.showInformationMessage('Chave de API não configurada.');
        return;
      }

      if (workspaceFolders) {
        const rootPath = workspaceFolders[0].uri.fsPath;
        const i18nPath = path.join(rootPath, 'i18n');
        if (!fs.existsSync(i18nPath)) {
          vscode.window.showInformationMessage(`Não foi possível encontrar a pasta i18n, criando...`);
          fs.mkdirSync(i18nPath);
          const defaultFilePath = vscode.workspace.getConfiguration().get<string>('arkanus-i18n.defaultFileName') || 'en';
          if (!fs.existsSync(path.join(i18nPath, `${defaultFilePath}.json`))) {
            fs.writeFileSync(path.join(i18nPath, `${defaultFilePath}.json`), '{}');
          }
        }

        let translations = await loadTranslations(i18nPath);
        const panel = vscode.window.createWebviewPanel(
          'krakenI18nWebview',
          'Kraken i18n',
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src'))]
          }
        );

        panel.webview.html = getWebviewContent(translations, panel.webview, context);

        panel.webview.onDidReceiveMessage(
          async message => {
            switch (message.command) {
              case 'createKey':
                const newKey = message.key || 'new_key';
                addNewKey(translations, newKey);
                panel.webview.postMessage({ command: 'updateTranslations', translations });
                break;
              case 'updateKey':
                updateKey(translations, message.oldKey, message.newKey);
                panel.webview.postMessage({ command: 'updateTranslations', translations });
                break;
              case 'updateTranslation':
                updateTranslation(translations, message.key, message.language, message.value);
                panel.webview.postMessage({ command: 'updateTranslations', translations });
                break;
              case 'save':
                const updatedTranslations = message.translations;
                await saveTranslations(i18nPath, updatedTranslations, panel);
                vscode.window.showInformationMessage('Traduções salvas com sucesso!');
                break;
              case 'fetchData':
                const data = await fetchData(message.url);
                panel.webview.postMessage({ command: 'fetchDataResponse', data });
                break;
              case 'deleteKey':
                deleteKey(translations, message.key);
                panel.webview.postMessage({ command: 'updateTranslations', translations });
                break;
              case 'translateAI':
                const translatedText = await IATraduzirString(message.text, message.language);
                translations[message.language][message.key] = translatedText;
                panel.webview.postMessage({ command: 'translateAIResponse', key: message.key, language: message.language, translatedText });
                break;
              // ...existing code...
            }
          },
          undefined,
          context.subscriptions
        );
      }
    })
  );
}

async function fetchData(url: string): Promise<any> {
  const response = await axios.get(url);
  return response.data;
}
export function deactivate() {}