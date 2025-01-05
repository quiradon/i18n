function checkEmptyFields() {
    const inputs = document.querySelectorAll('input.verify_vazio');
    inputs.forEach(input => {
        const aiButton = input.previousElementSibling;

        const updateFieldState = () => {
            if (input.value.trim() === '') {
                input.style.border = '2px solid red';
                if (aiButton) aiButton.style.display = 'inline-block';
            } else {
                input.style.border = '0px solid';
                if (aiButton) aiButton.style.display = 'none';
            }
        };

        updateFieldState();
        input.addEventListener('input', updateFieldState);
    });
}
