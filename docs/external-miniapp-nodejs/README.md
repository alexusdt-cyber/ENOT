# SwiftX External Mini App - Node.js Integration

## Архитектура

```
NoteFlow (Host)
 └─ POST /api/sso/introspect   ← server-to-server

SwiftX Mini App (api.swiftx.online)
 ├─ Frontend (iframe)
 │    └─ получает SSO_TICKET от Host
 │    └─ POST /api/sso/exchange (на СВОЙ backend)
 └─ Backend
      └─ POST Host /api/sso/introspect
      └─ создаёт локальную сессию
```

## Установка

```bash
npm install express cookie-parser node-fetch
# или
yarn add express cookie-parser node-fetch
```

## Файлы

### 1. Backend: server.js

```javascript
import express from "express";
import fetch from "node-fetch";
import cookieParser from "cookie-parser";
import path from "path";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

// ============================================================
// КОНФИГУРАЦИЯ - ИЗМЕНИТЕ ЭТИ ЗНАЧЕНИЯ!
// ============================================================

const HOST_BASE = "https://ВАШ-NOTEFLOW-ДОМЕН.replit.app";
const APP_ID = "exchanger_swiftx";

// ============================================================
// SSO EXCHANGE ENDPOINT
// ============================================================

app.post("/api/sso/exchange", async (req, res) => {
  const { ticket, appId } = req.body || {};

  if (!ticket || !appId) {
    return res.status(400).json({ ok: false, error: "ticket and appId required" });
  }

  if (appId !== APP_ID) {
    return res.status(403).json({ ok: false, error: "Invalid appId" });
  }

  try {
    // Server-to-server introspect
    const response = await fetch(`${HOST_BASE}/api/sso/introspect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket, appId })
    });

    const data = await response.json();

    if (!data || data.valid === false) {
      return res.status(401).json({ ok: false, error: data.reason || "Invalid ticket" });
    }

    const externalUserId = data.sub;
    if (!externalUserId) {
      return res.status(401).json({ ok: false, error: "No user ID in response" });
    }

    // JIT user creation (replace with your DB logic)
    const user = await findOrCreateUser(externalUserId, data);

    // Create local session
    const sessionId = await createSession(user.id);

    res.cookie("swiftx_session", sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({
      ok: true,
      user: { 
        id: user.id,
        externalId: externalUserId,
        scopes: data.scopes || []
      }
    });
  } catch (err) {
    console.error("SSO exchange error:", err);
    return res.status(500).json({ ok: false, error: "Internal error" });
  }
});

// ============================================================
// HELPER FUNCTIONS (replace with your DB implementation)
// ============================================================

async function findOrCreateUser(externalUserId, ssoData) {
  // TODO: Implement with your database
  // Example with Prisma:
  // return prisma.user.upsert({
  //   where: { externalId: externalUserId },
  //   update: {},
  //   create: { externalId: externalUserId }
  // });
  
  return { id: `user_${externalUserId}` };
}

async function createSession(userId) {
  // TODO: Implement with your session store
  const crypto = await import("crypto");
  return crypto.randomBytes(32).toString("hex");
}

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SwiftX Mini App running on port ${PORT}`);
});
```

### 2. Frontend: public/index.html

```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SwiftX Exchange - Mini App</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container { max-width: 500px; width: 100%; text-align: center; }
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
            width: 40px; height: 40px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: #f39c12;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
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
            <h3>✅ Авторизация успешна!</h3>
            <div id="userInfo" style="text-align:left; margin-top:15px;"></div>
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
            $userInfo.innerHTML = `<p><strong>User ID:</strong> ${user.id}</p>`;
        }

        if (!sessionNonce || !appId || !parentOriginParam) {
            showError("Missing SSO parameters");
            return;
        }

        let parentOrigin;
        try {
            parentOrigin = new URL(parentOriginParam).origin;
        } catch {
            showError("Invalid parentOrigin");
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
                showError("No ticket received");
                return;
            }

            try {
                const resp = await fetch("/api/sso/exchange", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ticket, appId })
                });

                const data = await resp.json();

                if (!resp.ok || !data.ok) {
                    showError(data.error || "Exchange failed");
                    return;
                }

                showSuccess(data.user);
            } catch (err) {
                showError("Network error: " + err.message);
            }
        });
    })();
    </script>
</body>
</html>
```

## Протокол SSO (последовательность)

1. **Host** открывает iframe с URL: 
   ```
   https://api.swiftx.online/?nonce=XXX&appId=YYY&parentOrigin=https://host.example.com
   ```

2. **Mini App Frontend** читает параметры и отправляет:
   ```javascript
   window.parent.postMessage({ type: "EMBED_READY", sessionNonce }, parentOrigin);
   ```

3. **Host** получает EMBED_READY, создает JWT ticket и отправляет:
   ```javascript
   iframe.postMessage({ 
     type: "SSO_TICKET", 
     sessionNonce,
     payload: { ticket, appId } 
   }, appOrigin);
   ```

4. **Mini App Frontend** получает ticket и отправляет на свой backend:
   ```javascript
   fetch("/api/sso/exchange", { body: JSON.stringify({ ticket, appId }) })
   ```

5. **Mini App Backend** делает server-to-server запрос:
   ```javascript
   fetch(`${HOST_BASE}/api/sso/introspect`, { body: JSON.stringify({ ticket, appId }) })
   ```

6. **Host** валидирует ticket и возвращает:
   ```json
   { "sub": "userId123", "scopes": ["profile", "email"] }
   ```

7. **Mini App Backend** создает локальную сессию и ставит cookie.

## Безопасность

- ✅ Ticket валидируется server-to-server (не из браузера)
- ✅ parentOrigin передается явно (не через document.referrer)
- ✅ sessionNonce проверяется при получении SSO_TICKET
- ✅ Origin проверяется при получении postMessage
- ✅ Ticket одноразовый (introspect помечает его использованным)
