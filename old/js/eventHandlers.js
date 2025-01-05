document.getElementById('add_key')?.addEventListener('click', function() {
    const key = prompt('Digite a nova chave:');
    if (key) {
        const languages = Array.from(document.querySelectorAll('th[data-language]')).map(th => th.getAttribute('data-language'));
        const row = document.createElement('tr');
        row.id = `row-${key}`;
        const keyCell = document.createElement('td');
        keyCell.textContent = key;
        keyCell.classList.add('key-cell');
        row.appendChild(keyCell);

        languages.forEach(language => {
            const valueCell = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'text';
            input.classList.add('expand-input', 'verify_vazio');
            input.setAttribute('data-language', language);
            input.setAttribute('readonly', true);
            input.addEventListener('focus', () => openEditModal(input));
            input.addEventListener('input', () => updateTranslationPercentage(language));
            valueCell.appendChild(input);
            row.appendChild(valueCell);
        });

        const actionsCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Deletar';
        deleteButton.classList.add('btn', 'btn-danger');
        deleteButton.addEventListener('click', function() {
            row.remove();
            languages.forEach(language => updateTranslationPercentage(language));
        });
        actionsCell.appendChild(deleteButton);
        row.appendChild(actionsCell);

        const fillCell = document.createElement('td');
        const fillButton = document.createElement('button');
        fillButton.textContent = 'IA';
        fillButton.classList.add('btn', 'btn-primary', 'ml-2', 'ai-button');
        fillButton.addEventListener('click', async function() {
            await fillWithAI(input, key, language);
        });
        fillCell.appendChild(fillButton);
        row.appendChild(fillCell);

        const tbody = document.getElementById('translations-tbody');
        tbody.insertBefore(row, tbody.firstChild);
        row.scrollIntoView({ behavior: 'smooth' });

        languages.forEach(language => updateTranslationPercentage(language));
    }
});

let currentEmptyFieldIndex = 0;

document.getElementById('next-empty-field')?.addEventListener('click', function() {
    const emptyFields = document.querySelectorAll('input.verify_vazio');
    if (emptyFields.length > 0) {
        currentEmptyFieldIndex = (currentEmptyFieldIndex + 1) % emptyFields.length;
        const row = emptyFields[currentEmptyFieldIndex].closest('tr');
        row.classList.add('highlight-row');
        row.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => row.classList.remove('highlight-row'), 1000);
    }
});

document.getElementById('prev-empty-field')?.addEventListener('click', function() {
    const emptyFields = document.querySelectorAll('input.verify_vazio');
    if (emptyFields.length > 0) {
        currentEmptyFieldIndex = (currentEmptyFieldIndex - 1 + emptyFields.length) % emptyFields.length;
        const row = emptyFields[currentEmptyFieldIndex].closest('tr');
        row.classList.add('highlight-row');
        row.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => row.classList.remove('highlight-row'), 1000);
    }
});
