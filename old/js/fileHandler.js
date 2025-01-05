let translations = {};

document.querySelector('#idiomas_input').addEventListener('change', function() {
    const files = Array.from(this.files);

    if (files.length === 0) {
        alert('Por favor, selecione um ou mais arquivos JSON!');
        return;
    }

    document.getElementById('upload-section').style.display = 'none';

    let filesProcessed = 0;

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const jsonData = JSON.parse(e.target.result);
                const language = file.name.split('.')[0];
                translations[language] = jsonData;
                filesProcessed++;

                if (filesProcessed === files.length) {
                    loadTranslations(translations, document.getElementById('translations-container'));
                    document.getElementById('translations-section').style.display = 'block';
                    checkEmptyFields();
                }
            } catch (error) {
                console.error(`Erro ao processar o arquivo ${file.name}: ${error.message}`);
            }
        };
        reader.readAsText(file);
    });
});