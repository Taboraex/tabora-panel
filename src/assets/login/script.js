(() => {
    const base = window.TABORA_BASE || '';
    const form = document.getElementById('form');
    const input = document.getElementById('password');
    const submit = document.getElementById('submit');
    const errorBox = document.getElementById('error');
    const toggle = document.getElementById('toggle');

    toggle.addEventListener('click', () => {
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
        input.focus();
    });

    function showError(message) {
        errorBox.textContent = message;
        errorBox.hidden = false;
        // Restart the shake animation.
        errorBox.style.animation = 'none';
        void errorBox.offsetWidth;
        errorBox.style.animation = '';
    }

    function setLoading(loading) {
        submit.disabled = loading;
        submit.querySelector('.label').textContent = loading ? 'Signing in…' : 'Sign in';
        submit.querySelector('.spinner').hidden = !loading;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorBox.hidden = true;
        setLoading(true);

        try {
            const res = await fetch(`${base}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: input.value }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success) {
                window.location.href = `${base}/panel`;
                return;
            }

            showError(data.message || 'Sign-in failed.');
            input.select();
        } catch {
            showError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    });
})();
