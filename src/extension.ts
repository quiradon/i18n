import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const {
  GoogleGenerativeAI,
} = require("@google/generative-ai");

//pegue a chave de api nas configurações
const apiKey = vscode.workspace.getConfiguration().get('arkanus-i18n.apiKey');
// pegue o idioma de referência nas configurações
const referenceLanguage = vscode.workspace.getConfiguration().get('arkanus-i18n.defaultFileName') || 'en';

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

async function IATraduzirString(texto: string, idioma: string): Promise<string> {
  try {
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });
    const result = await chatSession.sendMessage(`Translate the following content into the language with the i18n code '${idioma}': '${texto}'. Ensure that placeholders like <%>, %user%, %target%, or similar remain completely unchanged and are not translated or modified. Adapt the surrounding text to fit the context naturally while keeping the placeholders intact. If emojis, special characters, HTML tags, or markdown formatting are present, retain them as is. Return only the translated string.`);
    return result.response.text();
  } catch (error) {
    console.error('Error translating string:', error);
    return '';
  }
}

async function IATraduzirLista(lista: { [key: string]: string }, idioma: string): Promise<{ [key: string]: string }> {
  try {
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });
    const listaFormatada = Object.entries(lista).map(([key, value]) => `${key}: ${value}`).join(', ');
    const result = await chatSession.sendMessage(`Translate the following key-value pairs into the language with the i18n code '${idioma}': '${listaFormatada}'. Ensure that placeholders like <%>, %user%, %target%, or similar remain completely unchanged and are not translated or modified. Adapt the surrounding text to fit the context naturally while keeping the placeholders intact. If emojis, special characters, HTML tags, or markdown formatting are present, retain them as is. Return the translated key-value pairs in json at same format without enclosing it in \`\`\`json and \`\`\`.`);
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error('Error translating list:', error);
    return {};
  }
}

async function IATraduzirRapido(key: string, text: string, idiomas: string[]): Promise<{ [key: string]: string }> {
  try {
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });
    const idiomasStr = idiomas.join(', ');
    const result = await chatSession.sendMessage(`Translate the following content into the following languages with their i18n codes (${idiomasStr}): '${text}'. Ensure that placeholders like <%>, %user%, %target%, or similar remain completely unchanged and are not translated or modified. Adapt the surrounding text to fit the context naturally while keeping the placeholders intact. If emojis, special characters, HTML tags, or markdown formatting are present, retain them as is. Return the translated strings in a JSON object with language codes as keys, without enclosing it in \`\`\`json and \`\`\`.`);
    console.log(result.response.text());
    return JSON.parse(result.response.text().replace(/```json|```/g, ''));
  } catch (error) {
    console.error('Error in quick translation:', error);
    return {};
  }
}

import { loadTranslations, saveTranslations } from './translationUtils';
import { getWebviewContent } from './webviewUtils';

let currentPanel: vscode.WebviewPanel | undefined;

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

        if (currentPanel) {
          currentPanel.reveal(vscode.ViewColumn.One);
          return;
        }

        let translations = await loadTranslations(i18nPath);
        currentPanel = vscode.window.createWebviewPanel(
          'krakenI18nWebview',
          'Kraken i18n',
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src'))]
          }
        );

        currentPanel.onDidDispose(() => {
          currentPanel = undefined;
        }, null, context.subscriptions);

        currentPanel.webview.html = getWebviewContent(translations, currentPanel.webview, context);

        currentPanel.webview.postMessage({
          command: 'setReferenceLanguage',
          referenceLanguage: referenceLanguage
        });

        currentPanel.webview.onDidReceiveMessage(
          async message => {
            if (!currentPanel) return; // Adicionando verificação de nulidade

            switch (message.command) {
              case 'save':
                const updatedTranslations = message.translations;
                await saveTranslations(i18nPath, updatedTranslations, currentPanel);
                translations = updatedTranslations; // Atualizar o objeto translations
                vscode.window.showInformationMessage('Traduções salvas com sucesso!');
                break;
              case 'translateAI':
                const translatedText = await IATraduzirString(message.text, message.language);
                if (!translations[message.language]) {
                  translations[message.language] = {};
                }
                translations[message.language][message.key] = translatedText;
                currentPanel.webview.postMessage({ command: 'translateAIResponse', key: message.key, language: message.language, translatedText });
                break;
              case 'batchTranslateAI':
                const translatedBatch = await IATraduzirLista(message.batch, message.language);
                if (!translations[message.language]) {
                  translations[message.language] = {};
                }
                for (const key in translatedBatch) {
                  translations[message.language][key] = translatedBatch[key];
                }
                currentPanel.webview.postMessage({
                  command: 'batchTranslateAIResponse',
                  translatedBatch: translatedBatch,
                  language: message.language
                });
                break;
              case 'quickAdd':
                const { key, text, language } = message;
                const idiomas = Object.keys(translations);
                const translatedBatchQuickAdd = await IATraduzirRapido(key, text, idiomas);
                idiomas.forEach(lang => {
                  if (!translations[lang]) {
                    translations[lang] = {};
                  }
                  setNestedValue(translations[lang], key.split('.'), translatedBatchQuickAdd[lang] || '');
                });
                await saveTranslations(i18nPath, translations, currentPanel);
                currentPanel.webview.postMessage({ command: 'updateTranslations', translations });
                vscode.window.showInformationMessage('Tradução adicionada e preenchida com sucesso!');
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

function setNestedValue(obj: any, keys: string[], value: any) {
  keys.reduce((o, k, i) => {
    if (i === keys.length - 1) {
      o[k] = value;
    } else {
      o[k] = o[k] || {};
    }
    return o[k];
  }, obj);
}

async function fetchData(url: string): Promise<any> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return null;
  }
}
