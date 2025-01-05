window.addEventListener('DOMContentLoaded', (event) => {
    const vscode = acquireVsCodeApi();
    const createKeyButton = document.getElementById('add-key-btn');
    const saveButton = document.getElementById('save-btn');
    const searchInput = document.getElementById('search-input');
    const searchType = document.getElementById('search-type');
    const batchTranslateButton = document.getElementById('batch-translate-ai-btn');
    let referenceLanguage = 'en'; // Valor padrão

    if (createKeyButton) {
        createKeyButton.addEventListener('click', () => {
            const searchValue = searchInput.value;
            createKey(searchValue || 'new_key');
            updateHighlight();
            updateProgress();
        });
    }

    if (batchTranslateButton) {
        batchTranslateButton.addEventListener('click', () => {
            batchTranslate();
            updateHighlight();
            updateProgress();
        });
    }

    if (batchTranslateButton) {
        batchTranslateButton.addEventListener('click', () => {
            batchTranslateEmptyFields();
        });
    }

    if (saveButton) {
        saveButton.addEventListener('click', () => {
            const translations = collectTranslations();
            saveTranslations(translations);
            updateHighlight();
            updateProgress();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            const query = searchInput.value.toLowerCase();
            const type = searchType.value;
            filterTranslations(query, type);
        }, 300));
    }

    if (searchType) {
        searchType.addEventListener('change', () => {
            searchInput.dispatchEvent(new Event('input'));
        });
    }

    window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'setReferenceLanguage') {
            referenceLanguage = message.referenceLanguage;
        } else if (message.command === 'updateTranslations') {
            updateTranslations(message.translations);
        } else if (message.command === 'translateAIResponse') {
            const textarea = document.querySelector(`textarea[data-key="${CSS.escape(message.key)}"][data-language="${CSS.escape(message.language)}"]`);
            if (textarea) {
                textarea.value = message.translatedText;
                textarea.style.borderColor = 'lightgreen';
            }
        } else if (message.command === 'batchTranslateAIResponse') {
            for (const key in message.translatedBatch) {
                const textarea = document.querySelector(`textarea[data-key="${CSS.escape(key)}"][data-language="${CSS.escape(message.language)}"]`);
                if (textarea) {
                    textarea.value = message.translatedBatch[key];
                    textarea.style.borderColor = 'lightgreen';
                }
            }
            updateProgress();
        }
    });

    function updateTranslations(translations) {
        const translationsBody = document.getElementById('translations-body');
        const currentFilter = {
            query: searchInput.value.toLowerCase(),
            type: searchType.value
        };

        translationsBody.innerHTML = ''; // Limpe o corpo da tabela
        const languages = Object.keys(translations);
        const keys = new Set();

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

        translationsBody.innerHTML = rows;
        attachEventListeners();
        applyFilter(currentFilter);
    }

    function filterTranslations(query, type) {
        const rows = document.querySelectorAll('.translation-row');
        rows.forEach(row => {
            const keyInput = row.querySelector('.key-input');
            if (!keyInput) return;
            const key = keyInput.value.toLowerCase();
            const cells = Array.from(row.querySelectorAll('textarea')).map(cell => cell.value.toLowerCase());
            const matches = type === 'keys' ? key.includes(query) : cells.some(cell => cell.includes(query));

            row.style.display = matches ? '' : 'none';
        });
    }

    function applyFilter(filter) {
        filterTranslations(filter.query, filter.type);
    }

    function collectKeys(obj, keys, parentKey = '') {
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

    function getNestedValue(obj, keys) {
        return keys.reduce((o, k) => (o || {})[k], obj);
    }

    function updateProgress() {
        const headers = document.querySelectorAll('th');
        headers.forEach(header => {
            const language = header.textContent.split(':')[0];
            const totalKeys = document.querySelectorAll('.translation-row').length;
            const translatedKeys = Array.from(document.querySelectorAll(`textarea[data-language="${language}"]`)).filter(textarea => textarea.value.trim() !== '').length;
            const percentage = ((translatedKeys / totalKeys) * 100).toFixed(2);
            header.textContent = `${language}: ${percentage}% ${translatedKeys}/${totalKeys}`;
        });
    }

    function updateHighlight() {
        document.querySelectorAll('textarea.resizeable').forEach(textarea => {
            textarea.style.borderColor = textarea.value.trim() ? 'lightgreen' : 'lightcoral';
        });
    }

    function attachEventListeners() {
        document.querySelectorAll('textarea').forEach(textarea => {
            textarea.addEventListener('input', debounce(function() {
                if (this && this.dataset && this.dataset.key && this.dataset.language) {
                    updateTranslation(this.dataset.key, this.dataset.language, this.value);
                }
            }, 300));

            // Trigger the input event to resize the textarea on load
            textarea.dispatchEvent(new Event('input'));
        });

        document.querySelectorAll('.key-input').forEach(input => {
            input.addEventListener('blur', function() { // Atualiza quando o input for deselecionado
                if (this && this.dataset && this.dataset.key) {
                    updateKey(this.dataset.key, this.value);
                }
            });
        });

        document.querySelectorAll('.delete-key-btn').forEach(button => {
            button.addEventListener('click', function() {
                if (this && this.dataset && this.dataset.key) {
                    deleteKey(this.dataset.key);
                }
            });
        });

        document.querySelectorAll('.translate-ai-btn').forEach(button => {
            button.addEventListener('click', function() {
                if (this && this.dataset && this.dataset.key && this.dataset.language) {
                    const key = this.dataset.key;
                    const language = this.dataset.language;
                    const referenceLanguage = 'en'; // Defina o idioma de referência aqui
                    const referenceText = document.querySelector(`textarea[data-key="${CSS.escape(key)}"][data-language="${CSS.escape(referenceLanguage)}"]`).value;
                    vscode.postMessage({
                        command: 'translateAI',
                        key: key,
                        language: language,
                        text: referenceText
                    });
                }
            });
        });
    }

    function collectTranslations() {
        const translations = {};
        document.querySelectorAll('.translation-row').forEach(row => {
            const keyInput = row.querySelector('.key-input');
            if (!keyInput) return;
            const key = keyInput.value;
            row.querySelectorAll('textarea').forEach(textarea => {
                const language = textarea.dataset.language;
                const value = textarea.value;
                if (!translations[language]) {
                    translations[language] = {};
                }
                setNestedValue(translations[language], key.split('.'), value);
            });
        });
        return translations;
    }

    function setNestedValue(obj, keys, value) {
        keys.reduce((o, k, i) => {
            if (i === keys.length - 1) {
                o[k] = value;
            } else {
                o[k] = o[k] || {};
            }
            return o[k];
        }, obj);
    }

    function createKey(newKey) {
        const translations = collectTranslations();
        addNewKey(translations, newKey);
        updateTranslations(translations);
    }

    function batchTranslate() {
        // Implementar lógica de tradução em lote
    }

    async function batchTranslateEmptyFields() {
        const translations = collectTranslations();
        const emptyFields = [];

        document.querySelectorAll('textarea.resizeable').forEach(textarea => {
            if (!textarea.value.trim()) {
                emptyFields.push({
                    key: textarea.dataset.key,
                    language: textarea.dataset.language
                });
            }
        });

        const languages = [...new Set(emptyFields.map(field => field.language))];

        for (const language of languages) {
            const fieldsForLanguage = emptyFields.filter(field => field.language === language);

            for (let i = 0; i < fieldsForLanguage.length; i += 20) {
                const batch = fieldsForLanguage.slice(i, i + 20);
                const batchTranslations = {};

                batch.forEach(field => {
                    const referenceText = document.querySelector(`textarea[data-key="${CSS.escape(field.key)}"][data-language="${CSS.escape(referenceLanguage)}"]`).value;
                    batchTranslations[field.key] = referenceText;
                });

                vscode.postMessage({
                    command: 'batchTranslateAI',
                    batch: batchTranslations,
                    language: language
                });

                await new Promise(resolve => setTimeout(resolve, 10000)); // Espera 10 segundos
            }
        }
    }

    function updateKey(oldKey, newKey) {
        const translations = collectTranslations();
        updateKeyInTranslations(translations, oldKey, newKey);
        updateTranslations(translations);
    }

    function updateTranslation(key, language, value) {
        const translations = collectTranslations();
        updateTranslationInTranslations(translations, key, language, value);
        updateTranslations(translations);
    }

    function saveTranslations(translations) {
        vscode.postMessage({
            command: 'save',
            translations: translations
        });
    }

    function deleteKey(key) {
        vscode.postMessage({
            command: 'deleteKey',
            key: key
        });
    }

    function addNewKey(translations, newKey) {
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
            current[keys[keys.length - 1]] = ''; // Sempre gera em branco
        });
    }

    function updateKeyInTranslations(translations, oldKey, newKey) {
        const languages = Object.keys(translations);
        languages.forEach(language => {
            const keys = oldKey.split('.');
            let current = translations[language];
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    return;
                }
                current = current[keys[i]];
            }
            const value = current[keys[keys.length - 1]];
            delete current[keys[keys.length - 1]];

            const newKeys = newKey.split('.');
            current = translations[language];
            for (let i = 0; i < newKeys.length - 1; i++) {
                if (!current[newKeys[i]]) {
                    current[newKeys[i]] = {};
                }
                current = current[newKeys[i]];
            }
            current[newKeys[newKeys.length - 1]] = value;
        });
    }

    function updateTranslationInTranslations(translations, key, language, value) {
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

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    attachEventListeners();
});