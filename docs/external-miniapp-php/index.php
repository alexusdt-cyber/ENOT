<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SwiftX Exchange - Mini App</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        .logo { font-size: 48px; margin-bottom: 20px; }
        h1 { font-size: 24px; margin-bottom: 10px; }
        .status {
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
        .status.loading { border: 2px solid #f39c12; }
        .status.success { border: 2px solid #27ae60; }
        .status.error { border: 2px solid #e74c3c; }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: #f39c12;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .user-info { text-align: left; }
        .user-info p { margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px; }
        .user-info strong { color: #3498db; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">💱</div>
        <h1>SwiftX Exchange</h1>
        
        <div id="loading" class="status loading">
            <div class="spinner"></div>
            <p>Авторизация через NoteFlow...</p>
        </div>
        
        <div id="success" class="status success hidden">
            <h3 style="margin-bottom: 15px;">✅ Авторизация успешна!</h3>
            <div class="user-info" id="userInfo"></div>
        </div>
        
        <div id="error" class="status error hidden">
            <h3>❌ Ошибка авторизации</h3>
            <p id="errorMessage"></p>
        </div>
    </div>

    <script>
    (() => {
        const params = new URLSearchParams(window.location.search);
        const sessionNonce = params.get("nonce");
        const appId = params.get("appId");
        const parentOriginParam = params.get("parentOrigin");

        const $loading = document.getElementById("loading");
        const $success = document.getElementById("success");
        const $error = document.getElementById("error");
        const $userInfo = document.getElementById("userInfo");
        const $errorMessage = document.getElementById("errorMessage");

        function showError(msg) {
            $loading.classList.add("hidden");
            $error.classList.remove("hidden");
            $errorMessage.textContent = msg;
        }

        function showSuccess(user) {
            $loading.classList.add("hidden");
            $success.classList.remove("hidden");
            $userInfo.innerHTML = `
                <p><strong>User ID:</strong> ${user.id || user.sub || 'N/A'}</p>
                <p><strong>Session:</strong> Активна</p>
            `;
        }

        if (!sessionNonce || !appId || !parentOriginParam) {
            showError("Отсутствуют параметры SSO (nonce, appId, parentOrigin)");
            return;
        }

        let parentOrigin;
        try {
            parentOrigin = new URL(parentOriginParam).origin;
        } catch {
            showError("Некорректный parentOrigin");
            return;
        }

        if (window.parent !== window) {
            window.parent.postMessage(
                { type: "EMBED_READY", sessionNonce },
                parentOrigin
            );
        }

        window.addEventListener("message", async (event) => {
            if (event.origin !== parentOrigin) return;

            const msg = event.data;
            if (!msg || msg.type !== "SSO_TICKET") return;
            if (msg.sessionNonce !== sessionNonce) return;

            const ticket = msg.payload?.ticket;
            if (!ticket) {
                showError("Не получен ticket");
                return;
            }

            try {
                const resp = await fetch("/api/sso/exchange.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ticket, appId })
                });

                const data = await resp.json();

                if (!resp.ok || !data.ok) {
                    showError(data.error || "Ошибка обмена ticket");
                    return;
                }

                showSuccess(data.user);
            } catch (err) {
                showError("Сетевая ошибка: " + err.message);
            }
        });
    })();
    </script>
</body>
</html>
