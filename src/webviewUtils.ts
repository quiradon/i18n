import * as vscode from 'vscode';

function escapeHtml(unsafe: string): string {
  return unsafe.replace(/[&<"'>]/g, function (match) {
    const escape = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return escape[match as keyof typeof escape];
  });
}

export function getWebviewContent(translations: { [key: string]: any }, webview: vscode.Webview, context: vscode.ExtensionContext): string {
  const languages = Object.keys(translations);
  const headers = languages.map(language => `<th>${language}</th>`).join('');

  let Beta = true;
  let scriptUri;
  let styleUri;

  //gere um numero aleatorio
  const random = Math.floor(Math.random() * 100000) + 1; 

  if (Beta) {
    scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'src', 'scripts.js'));
    styleUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'src', 'styles.css'));
  } else {
    scriptUri = `https://i18n.arkanus.app/scripts.js?v=${random}`;
    styleUri = 'https://i18n.arkanus.app/styles.css';
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kraken i18n</title>
      <link rel="stylesheet" type="text/css" href="${styleUri}">
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
          <button id="quick-add-btn">Adição Rápida</button> <!-- Novo botão de adição rápida -->
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
            <!-- As linhas serão geradas no frontend -->
          </tbody>
        </table>
      </div>
      <input type="hidden" id="hidden-translations-input" value='${escapeHtml(JSON.stringify(translations))}'> <!-- Novo input oculto -->
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
