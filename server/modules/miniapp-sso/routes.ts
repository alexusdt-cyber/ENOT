import { Router, Request, Response } from "express";
import { z } from "zod";
import { IStorage } from "../../storage";
import { createSsoService, SsoServiceInterface } from "./sso.service";
import type { UrlPathPattern } from "@shared/schema";

export interface MiniAppSsoModuleDependencies {
  storageProvider: IStorage;
  requireAuth: (req: Request, res: Response, next: () => void) => void;
  getCurrentUser: (req: Request) => { id: string } | undefined;
}

function matchPathPattern(pathWithQuery: string, pattern: UrlPathPattern): boolean {
  if (!pathWithQuery.startsWith("/")) {
    pathWithQuery = "/" + pathWithQuery;
  }

  switch (pattern.patternType) {
    case "exact":
      return pathWithQuery === pattern.value;
    case "prefix":
      return pathWithQuery.startsWith(pattern.value);
    case "regex": {
      const re = new RegExp(pattern.value);
      return re.test(pathWithQuery);
    }
    default:
      return false;
  }
}

function isAllowedStartUrl(app: any, startUrl: string): boolean {
  try {
    const u = new URL(startUrl);
    
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    
    const allowedOrigins = app.allowedOrigins || [];
    if (!allowedOrigins.includes(u.origin)) return false;
    
    const patterns = app.allowedStartUrlPatterns || [];
    if (patterns.length === 0) return true;
    
    const pathWithQuery = `${u.pathname}${u.search}`;
    return patterns.some((p: UrlPathPattern) => matchPathPattern(pathWithQuery, p));
  } catch {
    return false;
  }
}

export function createMiniAppSsoRouter(deps: MiniAppSsoModuleDependencies): Router {
  const router = Router();
  const ssoService = createSsoService(deps.storageProvider);

  const sessionStartSchema = z.object({
    appId: z.string().min(1),
  });

  router.post("/miniapp/session/start", deps.requireAuth, async (req: Request, res: Response) => {
    try {
      const user = deps.getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const parseResult = sessionStartSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "appId is required" });
      }

      const { appId } = parseResult.data;
      const app = await deps.storageProvider.getApp(appId);
      
      if (!app) {
        return res.status(404).json({ error: "App not found" });
      }

      if (app.status !== "active") {
        return res.status(403).json({ error: "App is not active" });
      }

      if (app.launchMode !== "iframe" || !app.origin) {
        return res.status(400).json({ error: "App does not support iframe mode" });
      }

      if (app.launchUrl && !isAllowedStartUrl(app, app.launchUrl)) {
        return res.status(400).json({ error: "Invalid app configuration: startUrl not allowed" });
      }

      const appOrigin = app.origin || "";
      const { sessionNonce, expiresAt } = await ssoService.createSession(user.id, appId, appOrigin);

      res.json({
        appId: app.id,
        sessionNonce,
        origin: app.origin,
        startUrl: app.launchUrl,
        allowedPostMessageOrigins: app.allowedPostMessageOrigins || [app.origin],
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error("Failed to start miniapp session:", error);
      res.status(500).json({ error: "Failed to start session" });
    }
  });

  const ticketRequestSchema = z.object({
    appId: z.string().min(1),
    sessionNonce: z.string().min(1).optional(),
  });

  router.post("/sso/ticket", deps.requireAuth, async (req: Request, res: Response) => {
    try {
      const user = deps.getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const parseResult = ticketRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "appId is required" });
      }

      const { appId, sessionNonce } = parseResult.data;

      const app = await deps.storageProvider.getApp(appId);
      
      if (!app) {
        return res.status(404).json({ error: "App not found" });
      }

      if (sessionNonce) {
        const session = await ssoService.validateSession(sessionNonce);
        if (!session || session.userId !== user.id || session.appId !== appId) {
          return res.status(403).json({ error: "Invalid session" });
        }
        
        if (session.appOrigin && app.origin && session.appOrigin !== app.origin) {
          return res.status(403).json({ error: "Session origin mismatch" });
        }
      } else {
        return res.status(400).json({ error: "sessionNonce is required for iframe SSO" });
      }

      if (app.status !== "active") {
        return res.status(403).json({ error: "App is not active" });
      }

      const { ticket, expiresIn } = await ssoService.generateTicket(user.id, appId, app);

      res.json({ ticket, expiresIn });
    } catch (error) {
      console.error("Failed to generate ticket:", error);
      res.status(500).json({ error: "Failed to generate ticket" });
    }
  });

  const introspectSchema = z.object({
    ticket: z.string().min(1),
    appId: z.string().min(1),
  });

  router.post("/sso/introspect", async (req: Request, res: Response) => {
    try {
      const parseResult = introspectSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ valid: false, reason: "ticket and appId are required" });
      }

      const { ticket, appId } = parseResult.data;
      
      const result = await ssoService.introspectTicket(ticket, appId);
      
      res.json(result);
    } catch (error) {
      console.error("Failed to introspect ticket:", error);
      res.status(500).json({ valid: false, reason: "Internal error" });
    }
  });

  router.post("/miniapp/demo/init", deps.requireAuth, async (req: Request, res: Response) => {
    try {
      const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
      const baseOrigin = `${protocol}://${req.get("host")}`;
      
      const existingApps = await deps.storageProvider.getApps();
      const demoApp = existingApps.find(a => a.componentKey === "demo_sso_app");
      
      if (demoApp) {
        await deps.storageProvider.updateApp(demoApp.id, {
          launchUrl: `${baseOrigin}/demo-miniapp/index.html`,
          origin: baseOrigin,
          allowedOrigins: [baseOrigin],
          allowedPostMessageOrigins: [baseOrigin],
          ssoMode: "postMessageTicket",
        });
        return res.json({ appId: demoApp.id, message: "Demo app updated", origin: baseOrigin });
      }
      
      let categoryId: string | null = null;
      const categories = await deps.storageProvider.getAppCategories();
      const devCategory = categories.find(c => c.name.toLowerCase().includes("dev") || c.name.toLowerCase().includes("util"));
      if (devCategory) {
        categoryId = devCategory.id;
      }
      
      const newApp = await deps.storageProvider.createApp({
        categoryId,
        name: "Demo SSO App",
        description: "Test application for Mini Apps SSO integration. Demonstrates postMessage-based authentication flow.",
        shortDescription: "SSO integration demo",
        icon: "🔐",
        developer: "NoteFlow Team",
        version: "1.0.0",
        launchUrl: `${baseOrigin}/demo-miniapp/index.html`,
        featured: false,
        appType: "external",
        launchMode: "iframe",
        componentKey: "demo_sso_app",
        origin: baseOrigin,
        allowedOrigins: [baseOrigin],
        allowedPostMessageOrigins: [baseOrigin],
        allowedStartUrlPatterns: [{ patternType: "prefix", value: "/demo-miniapp/" }],
        scopes: ["profile", "email"],
        ssoMode: "postMessageTicket",
        status: "active",
      });
      
      res.json({ appId: newApp.id, message: "Demo app created", origin: baseOrigin });
    } catch (error) {
      console.error("Failed to init demo app:", error);
      res.status(500).json({ error: "Failed to create demo app" });
    }
  });

  router.post("/miniapp/register-external", deps.requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, origin, launchUrl, icon, description, shortDescription, componentKey } = req.body;
      
      if (!name || !origin || !launchUrl) {
        return res.status(400).json({ error: "name, origin, and launchUrl are required" });
      }

      const existingApps = await deps.storageProvider.getApps();
      const existingApp = existingApps.find(a => a.componentKey === componentKey || a.origin === origin);
      
      if (existingApp) {
        await deps.storageProvider.updateApp(existingApp.id, {
          name,
          launchUrl,
          origin,
          allowedOrigins: [origin],
          allowedPostMessageOrigins: [origin],
          ssoMode: "postMessageTicket",
          status: "active",
        });
        return res.json({ appId: existingApp.id, message: "App updated", origin });
      }

      const newApp = await deps.storageProvider.createApp({
        categoryId: null,
        name,
        description: description || `External app: ${name}`,
        shortDescription: shortDescription || name,
        icon: icon || "🔗",
        developer: "External",
        version: "1.0.0",
        launchUrl,
        featured: false,
        appType: "external",
        launchMode: "iframe",
        componentKey: componentKey || `external_${Date.now()}`,
        origin,
        allowedOrigins: [origin],
        allowedPostMessageOrigins: [origin],
        allowedStartUrlPatterns: [{ patternType: "prefix", value: "/" }],
        scopes: ["profile", "email"],
        ssoMode: "postMessageTicket",
        status: "active",
      });
      
      res.json({ appId: newApp.id, message: "App registered", origin });
    } catch (error) {
      console.error("Failed to register external app:", error);
      res.status(500).json({ error: "Failed to register app" });
    }
  });

  return router;
}
