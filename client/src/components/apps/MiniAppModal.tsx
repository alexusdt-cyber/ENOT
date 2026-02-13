import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Loader2, RefreshCw, ArrowLeft, ArrowRight } from "lucide-react";

interface MiniAppConfig {
  appId: string;
  sessionNonce: string;
  origin: string;
  startUrl: string;
  allowedPostMessageOrigins: string[];
}

interface App {
  id: string;
  name: string;
  icon: string | null;
  launchUrl: string | null;
  origin: string | null;
  allowedPostMessageOrigins: string[] | null;
}

interface MiniAppModalProps {
  app: App;
  isDark: boolean;
  onClose: () => void;
}

type MiniAppMessage = 
  | { type: "EMBED_READY"; sessionNonce: string }
  | { type: "REQUEST_REAUTH"; sessionNonce: string }
  | { type: "OPEN_LINK"; sessionNonce: string; payload: { url: string } }
  | { type: "CLOSE"; sessionNonce: string };

export function MiniAppModal({ app, isDark, onClose }: MiniAppModalProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const sessionStartedRef = useRef(false);

  const [config, setConfig] = useState<MiniAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    async function startSession() {
      try {
        const res = await fetch("/api/miniapp/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ appId: app.id }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to start session");
        }

        const data = await res.json();
        setConfig({
          appId: data.appId,
          sessionNonce: data.sessionNonce,
          origin: data.origin,
          startUrl: data.startUrl,
          allowedPostMessageOrigins: data.allowedPostMessageOrigins,
        });
      } catch (e: any) {
        setError(e.message || "Failed to open app");
        setLoading(false);
      }
    }

    startSession();
  }, [app.id]);

  const issueTicket = useCallback(async () => {
    if (!config) return;

    try {
      const res = await fetch("/api/sso/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appId: app.id, sessionNonce: config.sessionNonce }),
      });

      if (!res.ok) throw new Error("Ticket request failed");

      const { ticket } = await res.json();

      iframeRef.current?.contentWindow?.postMessage(
        { type: "SSO_TICKET", sessionNonce: config.sessionNonce, payload: { ticket, appId: app.id } },
        config.origin
      );
    } catch (e) {
      setError("Authentication failed");
    }
  }, [app.id, config]);

  useEffect(() => {
    if (!config) return;
    const currentConfig = config;

    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (!currentConfig.allowedPostMessageOrigins.includes(event.origin)) {
        console.warn("MiniApp: rejected message from unauthorized origin:", event.origin);
        return;
      }

      const msg = event.data as MiniAppMessage;
      if (!msg || typeof msg !== "object" || !msg.type) return;

      if (msg.sessionNonce !== currentConfig.sessionNonce) {
        console.warn("MiniApp: rejected message with invalid sessionNonce");
        return;
      }

      switch (msg.type) {
        case "EMBED_READY":
          issueTicket();
          break;

        case "REQUEST_REAUTH":
          issueTicket();
          break;

        case "OPEN_LINK":
          if (msg.payload?.url) {
            window.open(msg.payload.url, "_blank", "noopener");
          }
          break;

        case "CLOSE":
          onClose();
          break;
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [config, issueTicket, onClose]);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    setLoading(false);
  };

  const handleRefresh = () => {
    if (iframeRef.current && config) {
      setIframeLoaded(false);
      setLoading(true);
      const fullUrl = `${config.startUrl}${config.startUrl.includes('?') ? '&' : '?'}nonce=${encodeURIComponent(config.sessionNonce)}&appId=${encodeURIComponent(config.appId)}&parentOrigin=${encodeURIComponent(window.location.origin)}`;
      iframeRef.current.src = fullUrl;
    }
  };

  const handleBack = () => {
    try {
      iframeRef.current?.contentWindow?.history.back();
    } catch (e) {
    }
  };

  const handleForward = () => {
    try {
      iframeRef.current?.contentWindow?.history.forward();
    } catch (e) {
    }
  };

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex-1 flex flex-col items-center justify-center ${isDark ? "bg-slate-900" : "bg-gray-50"}`}
        >
          <div className={`p-8 rounded-xl text-center max-w-md ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              Ошибка запуска приложения
            </h3>
            <p className={`text-sm mb-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              {error}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white rounded-lg font-medium"
              data-testid="button-close-error"
            >
              Закрыть
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`flex-1 flex flex-col ${isDark ? "bg-slate-900" : "bg-gray-50"}`}
      >
        <div className={`flex items-center justify-between p-3 border-b ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-white"}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{app.icon || "📱"}</span>
            <h2 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              {app.name}
            </h2>
            {config && (
              <span className={`text-xs px-2 py-0.5 rounded ${isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-600"}`}>
                SSO
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 p-1 rounded-lg ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>
              <button
                onClick={handleBack}
                className={`p-1.5 rounded transition-colors ${isDark ? "hover:bg-slate-600 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`}
                title="Назад"
                data-testid="button-miniapp-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleForward}
                className={`p-1.5 rounded transition-colors ${isDark ? "hover:bg-slate-600 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`}
                title="Вперёд"
                data-testid="button-miniapp-forward"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleRefresh}
                className={`p-1.5 rounded transition-colors ${isDark ? "hover:bg-slate-600 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`}
                title="Обновить"
                data-testid="button-miniapp-refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
              data-testid="button-close-miniapp"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          {(loading || !config) && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className={`w-8 h-8 animate-spin ${isDark ? "text-slate-400" : "text-gray-400"}`} />
                <span className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Загрузка приложения...
                </span>
              </div>
            </div>
          )}
          
          {config && (
            <iframe
              ref={iframeRef}
              src={`${config.startUrl}${config.startUrl.includes('?') ? '&' : '?'}nonce=${encodeURIComponent(config.sessionNonce)}&appId=${encodeURIComponent(config.appId)}&parentOrigin=${encodeURIComponent(window.location.origin)}`}
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
              allow="clipboard-read; clipboard-write"
              onLoad={handleIframeLoad}
              className={`w-full h-full border-none transition-opacity ${iframeLoaded ? "opacity-100" : "opacity-0"}`}
              data-testid="iframe-miniapp"
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default MiniAppModal;
