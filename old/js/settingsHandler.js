document.getElementById('settings-button').addEventListener('click', function() {
    const modal = document.getElementById('settings-modal');
    const closeButton = modal.querySelector('.close-button');
    const saveButton = document.getElementById('save-settings');
    const apiTokenInput = document.getElementById('api-token');

    apiTokenInput.value = localStorage.getItem('api-token') || '';
    modal.style.display = 'block';

    const closeModal = () => modal.style.display = 'none';
    closeButton.onclick = closeModal;
    window.onclick = event => { if (event.target == modal) closeModal(); };
    window.onkeydown = event => { if (event.key === 'Escape') closeModal(); };

    saveButton.onclick = () => {
        const apiToken = apiTokenInput.value;
        initializeGenAI(apiToken);
        localStorage.setItem('api-token', apiToken);
        alert('API Token salvo.');
        closeModal();
    };
});
