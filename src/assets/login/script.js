(() => {
    const base = window.TABORA_BASE || '';
    const form = document.getElementById('form');
    const input = document.getElementById('password');
    const submit = document.getElementById('submit');
    const errorBox = document.getElementById('error');
    const toggle = document.getElementById('toggle');
    const langBtn = document.getElementById('langBtn');

    const I18N = {
        en: {
            sub: 'Sign in to continue',
            pass: 'Password',
            go: 'Sign in',
            going: 'Signing in…',
            fail: 'Sign-in failed.',
            net: 'Network error. Please try again.',
            show: 'Show password',
            hide: 'Hide password',
        },
        fa: {
            sub: 'برای ادامه وارد شو',
            pass: 'رمز',
            go: 'ورود',
            going: 'در حال ورود…',
            fail: 'ورود ناموفق بود.',
            net: 'خطای شبکه. دوباره تلاش کن.',
            show: 'نمایش رمز',
            hide: 'پنهان کردن رمز',
        },
    };

    const stored = localStorage.getItem('tabora.lang');
    let lang = stored || ((navigator.language || '').startsWith('fa') ? 'fa' : 'en');
    if (!I18N[lang]) lang = 'en';
    const t = (k) => (I18N[lang] || I18N.en)[k];

    function applyLang() {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
        document.getElementById('subLine').textContent = t('sub');
        document.getElementById('passLabel').textContent = t('pass');
        submit.querySelector('.label').textContent = t('go');
        langBtn.textContent = lang === 'fa' ? 'فا' : 'EN';
        toggle.setAttribute('aria-label', input.type === 'text' ? t('hide') : t('show'));
        localStorage.setItem('tabora.lang', lang);
    }

    langBtn.addEventListener('click', () => {
        lang = lang === 'en' ? 'fa' : 'en';
        applyLang();
    });

    toggle.addEventListener('click', () => {
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        toggle.setAttribute('aria-label', showing ? t('show') : t('hide'));
        input.focus();
    });

    function showError(message) {
        errorBox.textContent = message;
        errorBox.hidden = false;
        errorBox.style.animation = 'none';
        void errorBox.offsetWidth;
        errorBox.style.animation = '';
    }

    function setLoading(loading) {
        submit.disabled = loading;
        submit.querySelector('.label').textContent = loading ? t('going') : t('go');
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

            showError(data.message || t('fail'));
            input.select();
        } catch {
            showError(t('net'));
        } finally {
            setLoading(false);
        }
    });

    document.addEventListener('pointermove', (e) => {
        document.documentElement.style.setProperty('--mx', e.clientX + 'px');
        document.documentElement.style.setProperty('--my', e.clientY + 'px');
    });

    applyLang();
})();
