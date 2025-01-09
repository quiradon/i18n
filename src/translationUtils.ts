import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export async function loadTranslations(i18nPath: string): Promise<{ [key: string]: any }> {
  const translations: { [key: string]: any } = {};
  try {
    const files = fs.readdirSync(i18nPath);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(i18nPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const language = path.basename(file, '.json');
        translations[language] = JSON.parse(content);
      }
    }
  } catch (error) {
    console.error('Error loading translations:', error);
  }
  return translations;
}

export async function saveTranslations(i18nPath: string, translations: { [key: string]: any }, panel: vscode.WebviewPanel) {
  try {
    for (const language in translations) {
      if (translations.hasOwnProperty(language)) {
        const filePath = path.join(i18nPath, `${language}.json`);
        const content = JSON.stringify(translations[language], null, 2);
        fs.writeFileSync(filePath, content, 'utf-8');
      }
    }
    panel.webview.postMessage({ command: 'translationsSaved' });
  } catch (error) {
    console.error('Error saving translations:', error);
  }
}

export function addNewKey(translations: { [key: string]: any }, newKey: string) {
  const languages = Object.keys(translations);
  languages.forEach(language => {
    const keys = newKey.split('.');
    let current = translations[language];
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = '';
  });
}

export function updateTranslation(translations: { [key: string]: any }, key: string, language: string, value: string) {
  const keys = key.split('.');
  let current = translations[language];
  for (let i = 0; i < keys.length; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    if (i === keys.length - 1) {
      current[keys[i]] = value;
    } else {
      current = current[keys[i]];
    }
  }
}

export function deleteKey(translations: { [key: string]: any }, key: string) {
  const languages = Object.keys(translations);
  languages.forEach(language => {
    const keys = key.split('.');
    let current = translations[language];
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        return;
      }
      current = current[keys[i]];
    }
    delete current[keys[keys.length - 1]];
  });
}
