document.getElementById('save-translations').addEventListener('click', async function() {
    const translations = {};

    document.querySelectorAll('table tr').forEach(row => {
        const keyCell = row.querySelector('.key-cell');
        if (keyCell) {
            const key = keyCell.textContent;
            row.querySelectorAll('input').forEach(input => {
                const language = input.getAttribute('data-language');
                const value = input.value;
                if (!translations[language]) translations[language] = {};
                const keys = key.split('.');
                let current = translations[language];
                keys.forEach((keyPart, index) => {
                    if (index === keys.length - 1) {
                        current[keyPart] = value;
                    } else {
                        current[keyPart] = current[keyPart] || {};
                        current = current[keyPart];
                    }
                });
            });
        }
    });

    const zip = new JSZip();
    Object.keys(translations).forEach(language => {
        const jsonOutput = JSON.stringify(translations[language]);
        if (jsonOutput !== '{}') zip.file(`${language}.json`, jsonOutput);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'translations.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

window.addEventListener('load', function() {
    const savedTranslations = localStorage.getItem('translations');
    if (savedTranslations) {
        const translations = JSON.parse(savedTranslations);
        loadTranslations(translations, document.getElementById('translations-container'));
        document.getElementById('translations-section').style.display = 'block';
        checkEmptyFields();
    }
});
