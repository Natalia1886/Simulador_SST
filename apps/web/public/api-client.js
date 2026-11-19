(function () {
    const isLocal =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

    const API_BASE_URL = isLocal
        ? 'http://localhost:4000'
        : 'https://simulador-sst.onrender.com';

    const TOKEN_KEY = 'simulsst_token';
    const USER_KEY = 'simulsst_user';

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';
    }

    function setSession(token, user) {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
    }

    // Intercepta globalmente window.fetch para:
    // 1. Redirigir cualquier llamada a http://localhost:4000 hacia API_BASE_URL
    // 2. Adjuntar Authorization: Bearer <token> automáticamente
    // 3. Redirigir al inicio si el servidor devuelve 401 (sesión expirada) en rutas protegidas
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async function (input, init = {}) {
        let url = typeof input === 'string' ? input : input.url;

        if (url.startsWith('http://localhost:4000')) {
            url = url.replace('http://localhost:4000', API_BASE_URL);
        } else if (url.startsWith('/api/')) {
            url = `${API_BASE_URL}${url}`;
        }

        const token = getToken();
        const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
        if (token && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        const finalInit = { ...init, headers };
        const response = await nativeFetch(url, finalInit);

        const isAuthEndpoint = url.includes('/api/users/login') || url.includes('/api/users/register');
        if (response.status === 401 && !isAuthEndpoint) {
            clearSession();
            if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
                window.location.href = './index.html';
            }
        }

        return response;
    };

    window.SimulSST = {
        API_BASE_URL,
        getToken,
        setSession,
        clearSession,
    };
})();