window.addEventListener('DOMContentLoaded', (event) => {
    const vscode = acquireVsCodeApi();
    const createKeyButton = document.getElementById('add-key-btn');
    const saveButton = document.getElementById('save-btn');
    const searchInput = document.getElementById('search-input');
    const searchType = document.getElementById('search-type');
    const batchTranslateButton = document.getElementById('batch-translate-ai-btn');
    const hiddenTranslationsInput = document.getElementById('hidden-translations-input'); // Novo input oculto
    const quickAddButton = document.getElementById('quick-add-btn');
    let referenceLanguage = 'en'; // Valor padrão
    let translations = JSON.parse(hiddenTranslationsInput.value); // Usar o valor do input oculto

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
            batchTranslateEmptyFields();
        });
    }

    if (saveButton) {
        saveButton.addEventListener('click', () => {
            translations = collectTranslations(); // Coletar traduções antes de salvar
            saveTranslations(translations);
            updateHighlight();
            updateProgress();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            const query = normalizeString(searchInput.value);
            const type = searchType.value;
            filterTranslations(query, type);
        }, 300));
    }

    if (searchType) {
        searchType.addEventListener('change', () => {
            searchInput.dispatchEvent(new Event('input'));
        });
    }

    if (quickAddButton) {
        quickAddButton.addEventListener('click', () => {
            openQuickAddModal();
        });
    }

    window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'setReferenceLanguage') {
            referenceLanguage = message.referenceLanguage;
        } else if (message.command === 'updateTranslations') {
            translations = message.translations;
            hiddenTranslationsInput.value = JSON.stringify(translations); // Atualizar o valor do input oculto
            updateTranslations(translations);
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
        } else if (message.command === 'quickAdd') {
            openQuickAddModal();
        } else if (message.command === 'updateTranslations') {
            translations = message.translations;
            updateTranslations(translations);
        }
    });

    updateTranslations(translations); // Adicione esta linha para gerar as traduções a partir do objeto translations

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

        const rows = generateRows(sortedKeys, languages, translations);

        translationsBody.innerHTML = rows;
        attachEventListeners();
        applyFilter(currentFilter);
    }

    function generateRows(keys, languages, translations) {
        return keys.map(key => {
            const cells = languages.map(language => {
                const value = getNestedValue(translations[language], key.split('.')) || '';
                return `<td>
                          <textarea class="resizeable" data-key="${key}" data-language="${language}" style="border-color: ${value ? 'lightgreen' : 'lightcoral'};">${value}</textarea>
                          <button class="translate-ai-btn" data-key="${key}" data-language="${language}">IA</button>
                        </td>`;
            }).join('');

            return `<tr class="translation-row">
                      <td>
                        <span class="key-text" data-key="${key}" style="width: ${key.length + 2}ch;">${key}</span>
                        <button class="delete-key-btn" data-key="${key}">🗑️</button>
                      </td>
                      ${cells}
                    </tr>`;
        }).join('');
    }

    function filterTranslations(query, type) {
        const rows = document.querySelectorAll('.translation-row');
        rows.forEach(row => {
            const keyText = row.querySelector('.key-text');
            if (!keyText) return;
            const key = normalizeString(keyText.textContent);
            const cells = Array.from(row.querySelectorAll('textarea')).map(cell => normalizeString(cell.value));
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
                    const referenceText = getReferenceText(key);
                    if (referenceText) {
                        vscode.postMessage({
                            command: 'translateAI',
                            key: key,
                            language: language,
                            text: referenceText
                        });
                    } else {
                        console.log('Não tem conteúdo de referência.');
                    }
                }
            });
        });
    }

    function collectTranslations() {
        const translations = {};
        document.querySelectorAll('.translation-row').forEach(row => {
            const keyText = row.querySelector('.key-text');
            if (!keyText) return;
            const key = keyText.textContent;
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
        addNewKey(translations, newKey);
        updateTranslations(translations);
    }

    function deleteKey(key) {
        removeKeyFromTranslations(translations, key);
        updateTranslations(translations);
    }

    async function batchTranslateEmptyFields() {
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
                    const referenceText = getReferenceText(field.key);
                    batchTranslations[field.key] = referenceText;
                });

                try {
                    vscode.postMessage({
                        command: 'batchTranslateAI',
                        batch: batchTranslations,
                        language: language
                    });
                    await new Promise(resolve => setTimeout(resolve, 10000)); // Espera 10 segundos
                } catch (error) {
                    console.error('Error in batch translation:', error);
                }
            }
        }
    }

    function updateTranslation(key, language, value) {
        setNestedValue(translations[language], key.split('.'), value);
        updateTranslations(translations);
    }

    function saveTranslations(translations) {
        if (Object.keys(translations).length === 0) {
            hiddenTranslationsInput.value = '{}'; // Atualizar o valor do input oculto para um JSON vazio
        } else {
            hiddenTranslationsInput.value = JSON.stringify(translations); // Atualizar o valor do input oculto
        }
        vscode.postMessage({
            command: 'save',
            translations: translations
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

    function removeKeyFromTranslations(translations, key) {
        const languages = Object.keys(translations);
        languages.forEach(language => {
            const keys = key.split('.');
            let current = translations[language];
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) return;
                current = current[keys[i]];
            }
            delete current[keys[keys.length - 1]];
        });
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

    function normalizeString(str) {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function openQuickAddModal() {
        if (!document.getElementById('search-input')) {
            vscode.postMessage({
                command: 'showAlert',
                message: 'Campo de busca não encontrado. Não é possível abrir o modal de Adição Rápida.'
            });
            return;
        }

        const modal = document.createElement('div');
        modal.classList.add('modal');
        modal.style.width = '600px'; // Aumenta o tamanho horizontal do modal
        modal.style.maxWidth = '90%'; // Torna o modal mais responsivo
        modal.style.padding = '20px';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-btn">&times;</span>
                <h2>Adição Rápida</h2>
                <p>Idioma de referência: <strong>${referenceLanguage}</strong></p>
                <p>Nome da chave: <strong>${document.getElementById('search-input').value || 'N/A'}</strong></p>
                <label for="quick-add-text">Texto:</label>
                <textarea id="quick-add-text"></textarea>
                <button id="quick-add-submit">Adicionar</button>
            </div>
        `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });

        const submitBtn = modal.querySelector('#quick-add-submit');
        submitBtn.addEventListener('click', () => {
            const text = document.getElementById('quick-add-text').value.trim();
            const key = document.getElementById('search-input').value.trim(); // Obtém o valor do campo de busca

            if (!key || key.length === 0) {
                vscode.postMessage({
                    command: 'showAlert',
                    message: 'O campo de busca está vazio. Por favor, insira um valor válido.'
                });
                return;
            }

            if (!text || text.length === 0) {
                vscode.postMessage({
                    command: 'showAlert',
                    message: 'O campo de texto está vazio. Por favor, insira um valor válido.'
                });
                return;
            }

            vscode.postMessage({
                command: 'quickAdd',
                key: key,
                text: text,
                language: referenceLanguage
            });
            modal.remove();
        });
    }

    function getReferenceText(key) {
        const referenceTextarea = document.querySelector(`textarea[data-key="${key}"][data-language="${referenceLanguage}"]`);
        if (referenceTextarea) {
            return referenceTextarea.value;
        } else {
            console.warn(`Reference textarea not found for key: ${key} and language: ${referenceLanguage}`);
            return '';
        }
    }
    attachEventListeners();
});
