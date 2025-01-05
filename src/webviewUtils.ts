import * as vscode from 'vscode';
import * as path from 'path';

export function getWebviewContent(translations: { [key: string]: any }, webview: vscode.Webview, context: vscode.ExtensionContext) {
  const languages = Object.keys(translations);
  const keys = new Set<string>();

  languages.forEach(language => {
    collectKeys(translations[language], keys);
  });

  const sortedKeys = Array.from(keys).sort();

  const rows = sortedKeys.map(key => {
    const cells = languages.map(language => {
      const value = getNestedValue(translations[language], key.split('.')) || '';
      return `<td>
                <textarea class="resizeable" data-key="${key}" data-language="${language}" style="border-color: ${value ? 'lightgreen' : 'lightcoral'};">${value}</textarea>
                <button class="translate-ai-btn" data-key="${key}" data-language="${language}">IA</button>
              </td>`;
    }).join('');

    return `<tr class="translation-row">
              <td>
                <input type="text" value="${key}" class="key-input" data-key="${key}" style="width: ${key.length + 2}ch;">
                <button class="delete-key-btn" data-key="${key}">🗑️</button>
              </td>
              ${cells}
            </tr>`;
  }).join('');

  const headers = languages.map(language => `<th>${language}</th>`).join('');

  const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'src', 'scripts.js')));
  const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'src', 'styles.css')));

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kraken i18n</title>
      <link rel="stylesheet" type="text/css" href="${styleUri}">
      <style>
        .translate-ai-btn {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 5px 10px;
          cursor: pointer;
          border-radius: 4px;
        }
        .translate-ai-btn:hover {
          background-color: #45a049;
        }
        .delete-key-btn {
          background-color: #f44336;
          color: white;
          border: none;
          padding: 5px 10px;
          cursor: pointer;
          border-radius: 4px;
        }
        .delete-key-btn:hover {
          background-color: #e53935;
        }
      </style>
    </head>
    <body>
      <h1>Bem-vindo ao Kraken i18n</h1>
      <div class="controls">
        <select id="search-type">
          <option value="keys">Chaves</option>
          <option value="global">Global</option>
        </select>
        <input type="text" id="search-input" placeholder="Buscar...">
        <div class="buttons">
          <button id="add-key-btn">Adicionar Chave</button>
          <button id="batch-translate-ai-btn">Traduzir Campos Vazios com IA</button>
          <button id="save-btn">Salvar</button>
        </div>
      </div>
      <br>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Chave</th>
              ${headers}
            </tr>
          </thead>
          <tbody id="translations-body">
            ${rows}
          </tbody>
        </table>
      </div>
      <script src="${scriptUri}"></script>
    </body>
    </html>
  `;
}

function collectKeys(obj: any, keys: Set<string>, parentKey = '') {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        collectKeys(obj[key], keys, fullKey);
      } else {
        keys.add(fullKey);
      }
    }
  }
}

function getNestedValue(obj: any, keys: string[]) {
  return keys.reduce((o, k) => (o || {})[k], obj);
}
