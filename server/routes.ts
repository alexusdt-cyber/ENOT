import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import session from "express-session";
import passport, { requireAuth, getCurrentUser, verifyTelegramAuth, handleTelegramAuth, verifyTelegramWebApp, handleTelegramWebAppAuth, type TelegramAuthData } from "./auth";
import { storage } from "./storage";
import { notificationService } from "./notificationService";
import { encrypt, decrypt } from "./services/cryptoService";
import { walletApiService } from "./services/walletApiService";
import memoryMapRoutes from "./modules/memory-map/routes";
import { createMiniAppSsoRouter } from "./modules/miniapp-sso";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";
import {
  insertUserSchema,
  loginSchema,
  insertCategorySchema,
  insertNoteSchema,
  updateNoteSchema,
  insertNoteShareSchema,
  insertTaskCategorySchema,
  insertTaskSchema,
  updateTaskSchema,
  insertSubtaskSchema,
  insertGoalSchema,
  updateGoalSchema,
  insertFolderSchema,
  updateFolderSchema,
  updateFileSchema,
  insertRoadmapCategorySchema,
  insertRoadmapSchema,
  updateRoadmapSchema,
  insertMilestoneSchema,
  updateMilestoneSchema,
  insertLinkCategorySchema,
  insertLinkSchema,
  updateLinkSchema,
  insertAppCategorySchema,
  insertAppSchema,
  insertUserAppSchema,
  insertAppReviewSchema,
  type User,
} from "@shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    passport?: { user?: string };
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const sessionSecret = process.env.SESSION_SECRET || "your-secret-key-change-in-production";

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, username } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email и пароль обязательны" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Пользователь с таким email уже существует" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        username: username || email.split("@")[0],
        displayName: username || email.split("@")[0],
        authMethod: "email",
      });

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Ошибка авторизации" });
        }
        res.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Ошибка регистрации" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Ошибка авторизации" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Неверные учетные данные" });
      }
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Ошибка авторизации" });
        }
        res.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
      });
    })(req, res, next);
  });

  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Ошибка выхода" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Не авторизован" });
    }
    res.json({ user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl } });
  });

  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const telegramData = req.body as TelegramAuthData;
      
      if (!telegramData.id || !telegramData.auth_date || !telegramData.hash) {
        return res.status(400).json({ error: "Неверные данные Telegram" });
      }

      const isValid = verifyTelegramAuth(telegramData);
      if (!isValid) {
        return res.status(401).json({ error: "Неверная подпись Telegram" });
      }

      const user = await handleTelegramAuth(telegramData);
      if (!user) {
        return res.status(500).json({ error: "Ошибка создания пользователя" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Telegram login error:", err);
          return res.status(500).json({ error: "Ошибка авторизации" });
        }
        res.json({ user: { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl } });
      });
    } catch (error) {
      console.error("Telegram auth error:", error);
      res.status(500).json({ error: "Ошибка авторизации через Telegram" });
    }
  });

  app.get("/api/auth/telegram/config", (req, res) => {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    if (!botUsername) {
      return res.status(404).json({ error: "Telegram not configured" });
    }
    res.json({ botUsername });
  });

  app.post("/api/auth/telegram/webapp", async (req, res) => {
    try {
      const { initData } = req.body;
      
      if (!initData) {
        return res.status(400).json({ error: "initData обязателен" });
      }

      const webAppData = verifyTelegramWebApp(initData);
      if (!webAppData) {
        return res.status(401).json({ error: "Неверные данные Telegram WebApp" });
      }

      const user = await handleTelegramWebAppAuth(webAppData);
      if (!user) {
        return res.status(500).json({ error: "Ошибка создания пользователя" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Telegram WebApp login error:", err);
          return res.status(500).json({ error: "Ошибка авторизации" });
        }
        res.json({ user: { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl } });
      });
    } catch (error) {
      console.error("Telegram WebApp auth error:", error);
      res.status(500).json({ error: "Ошибка авторизации через Telegram" });
    }
  });

  // Category Routes
  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const categories = await storage.getCategories(user.id);
      res.json(categories);
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({ error: "Ошибка получения категорий" });
    }
  });

  app.post("/api/categories", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const categoryData = insertCategorySchema.parse({ ...req.body, userId: user.id });
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create category error:", error);
      res.status(500).json({ error: "Ошибка создания категории" });
    }
  });

  app.patch("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, updates);
      if (!category) {
        return res.status(404).json({ error: "Категория не найдена" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update category error:", error);
      res.status(500).json({ error: "Ошибка обновления категории" });
    }
  });

  app.delete("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCategory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({ error: "Ошибка удаления категории" });
    }
  });

  // Note Routes
  app.get("/api/notes", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const { categoryId, search, isPinned } = req.query;
      
      const filters: any = {};
      if (categoryId) filters.categoryId = categoryId as string;
      if (search) filters.search = search as string;
      if (isPinned !== undefined) filters.isPinned = isPinned === "true";

      const notes = await storage.getNotes(user.id, filters);
      res.json(notes);
    } catch (error) {
      console.error("Get notes error:", error);
      res.status(500).json({ error: "Ошибка получения заметок" });
    }
  });

  app.get("/api/notes/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const note = await storage.getNote(id);

      if (!note) {
        return res.status(404).json({ error: "Заметка не найдена" });
      }

      const hasAccess = await storage.checkNoteAccess(id, user.id);
      if (!hasAccess && note.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      await storage.updateLastAccessed(id);
      res.json(note);
    } catch (error) {
      console.error("Get note error:", error);
      res.status(500).json({ error: "Ошибка получения заметки" });
    }
  });

  app.get("/api/notes/share/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const note = await storage.getNoteByShareToken(token);

      if (!note || !note.isPublic) {
        return res.status(404).json({ error: "Заметка не найдена или недоступна" });
      }

      await storage.updateLastAccessed(note.id);
      res.json(note);
    } catch (error) {
      console.error("Get shared note error:", error);
      res.status(500).json({ error: "Ошибка получения заметки" });
    }
  });

  app.post("/api/notes", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const noteData = insertNoteSchema.parse({ ...req.body, userId: user.id });
      const note = await storage.createNote(noteData);
      res.json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create note error:", error);
      res.status(500).json({ error: "Ошибка создания заметки" });
    }
  });

  app.patch("/api/notes/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const note = await storage.getNote(id);

      if (!note) {
        return res.status(404).json({ error: "Заметка не найдена" });
      }

      if (note.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      const updates = updateNoteSchema.parse(req.body);
      const updatedNote = await storage.updateNote(id, updates);
      res.json(updatedNote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update note error:", error);
      res.status(500).json({ error: "Ошибка обновления заметки" });
    }
  });

  app.delete("/api/notes/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const note = await storage.getNote(id);

      if (!note) {
        return res.status(404).json({ error: "Заметка не найдена" });
      }

      if (note.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      await storage.deleteNote(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete note error:", error);
      res.status(500).json({ error: "Ошибка удаления заметки" });
    }
  });

  app.post("/api/notes/:id/share", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const note = await storage.getNote(id);

      if (!note) {
        return res.status(404).json({ error: "Заметка не найдена" });
      }

      if (note.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      const shareToken = await storage.generateShareToken(id);
      res.json({ shareToken, shareUrl: `/notes/share/${shareToken}` });
    } catch (error) {
      console.error("Share note error:", error);
      res.status(500).json({ error: "Ошибка создания ссылки" });
    }
  });

  app.post("/api/notes/:id/shares", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const note = await storage.getNote(id);

      if (!note) {
        return res.status(404).json({ error: "Заметка не найдена" });
      }

      if (note.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      const shareData = insertNoteShareSchema.parse({
        ...req.body,
        noteId: id,
        createdBy: user.id,
      });

      const share = await storage.createNoteShare(shareData);
      res.json(share);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create share error:", error);
      res.status(500).json({ error: "Ошибка создания доступа" });
    }
  });

  app.get("/api/notes/:id/shares", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const note = await storage.getNote(id);

      if (!note) {
        return res.status(404).json({ error: "Заметка не найдена" });
      }

      if (note.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      const shares = await storage.getNoteShares(id);
      res.json(shares);
    } catch (error) {
      console.error("Get shares error:", error);
      res.status(500).json({ error: "Ошибка получения списка доступов" });
    }
  });

  app.delete("/api/shares/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteNoteShare(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete share error:", error);
      res.status(500).json({ error: "Ошибка удаления доступа" });
    }
  });

  const transformNoteForSharing = (note: any) => {
    let blocks = [];
    try {
      const parsed = JSON.parse(note.content);
      if (Array.isArray(parsed)) {
        blocks = parsed;
      } else {
        blocks = [{ id: "b1", type: "text", content: note.content }];
      }
    } catch {
      blocks = [{ id: "b1", type: "text", content: note.content || "" }];
    }
    
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      contentType: note.contentType,
      userId: note.userId,
      categoryId: note.categoryId,
      blocks,
    };
  };

  app.get("/api/shared/:shareLink", async (req, res) => {
    try {
      const { shareLink } = req.params;
      const shares = await storage.getNoteShareByLink(shareLink);
      
      if (!shares) {
        return res.status(404).json({ error: "Share not found" });
      }

      const note = await storage.getNote(shares.noteId);
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }

      await storage.updateLastAccessed(note.id);
      
      const hasPassword = !!shares.password;
      
      if (hasPassword) {
        res.json({
          note: null,
          shareType: shares.shareType === 'password' ? 'can_edit' : shares.shareType,
          requiresPassword: true,
        });
      } else {
        res.json({
          note: transformNoteForSharing(note),
          shareType: shares.shareType,
          requiresPassword: false,
        });
      }
    } catch (error) {
      console.error("Get shared note error:", error);
      res.status(500).json({ error: "Ошибка получения заметки" });
    }
  });

  app.post("/api/shared/:shareLink/verify", async (req, res) => {
    try {
      const { shareLink } = req.params;
      const { password } = req.body;
      const shares = await storage.getNoteShareByLink(shareLink);
      
      if (!shares) {
        return res.status(404).json({ error: "Share not found" });
      }

      if (shares.password) {
        if (!password || password !== shares.password) {
          return res.status(401).json({ error: "Invalid password" });
        }
      }

      const note = await storage.getNote(shares.noteId);
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }

      const effectiveShareType = shares.shareType === 'password' ? 'can_edit' : shares.shareType;

      await storage.updateLastAccessed(note.id);
      res.json({ 
        note: transformNoteForSharing(note), 
        shareType: effectiveShareType, 
        canEdit: effectiveShareType === 'can_edit' 
      });
    } catch (error) {
      console.error("Verify share error:", error);
      res.status(500).json({ error: "Ошибка проверки доступа" });
    }
  });

  app.put("/api/shared/:shareLink/note", async (req, res) => {
    try {
      const { shareLink } = req.params;
      const { title, blocks } = req.body;
      const shares = await storage.getNoteShareByLink(shareLink);
      
      if (!shares) {
        return res.status(404).json({ error: "Share not found" });
      }

      const effectiveShareType = shares.shareType === 'password' ? 'can_edit' : shares.shareType;
      if (effectiveShareType !== 'can_edit') {
        return res.status(403).json({ error: "No edit permission" });
      }

      const note = await storage.getNote(shares.noteId);
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }

      const updatePayload: any = {};
      if (title !== undefined) {
        updatePayload.title = title;
      }
      if (blocks !== undefined) {
        updatePayload.content = JSON.stringify(blocks);
      }

      if (Object.keys(updatePayload).length === 0) {
        return res.json(transformNoteForSharing(note));
      }

      const updated = await storage.updateNote(note.id, updatePayload);
      res.json(transformNoteForSharing(updated));
    } catch (error) {
      console.error("Update shared note error:", error);
      res.status(500).json({ error: "Ошибка обновления заметки" });
    }
  });

  // Shared note image upload (tied to the note owner's account)
  // Middleware to verify share permissions before processing upload
  const verifyShareUploadPermission = async (req: any, res: any, next: any) => {
    try {
      const { shareLink } = req.params;
      const shares = await storage.getNoteShareByLink(shareLink);
      
      if (!shares) {
        return res.status(403).json({ error: "Upload not authorized" });
      }
      
      const effectiveShareType = shares.shareType === 'password' ? 'can_edit' : shares.shareType;
      if (effectiveShareType !== 'can_edit') {
        return res.status(403).json({ error: "Upload not authorized" });
      }
      
      req.shareOwnerId = shares.createdBy;
      next();
    } catch (error) {
      console.error("Share verification error:", error);
      return res.status(500).json({ error: "Ошибка проверки доступа" });
    }
  };

  const sharedImageStorage = multer.diskStorage({
    destination: (req: any, _file, cb) => {
      const ownerId = req.shareOwnerId;
      if (!ownerId) {
        return cb(new Error("Not authorized"), "");
      }
      const uploadDir = path.join(process.cwd(), "uploads", ownerId, "eNotesPictures");
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  });

  const sharedImageUpload = multer({
    storage: sharedImageStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"));
      }
    },
  });

  app.post("/api/shared/:shareLink/upload/image", verifyShareUploadPermission, sharedImageUpload.single("image"), async (req: any, res) => {
    try {
      const file = req.file;
      const ownerId = req.shareOwnerId;
      
      if (!file) {
        return res.status(400).json({ error: "No image file provided" });
      }
      
      const imageUrl = `/uploads/${ownerId}/eNotesPictures/${file.filename}`;
      res.json({ url: imageUrl, filename: file.filename, size: file.size });
    } catch (error) {
      console.error("Shared image upload error:", error);
      res.status(500).json({ error: "Ошибка загрузки изображения" });
    }
  });

  app.post("/api/shared/:shareLink/upload/images", verifyShareUploadPermission, sharedImageUpload.array("images", 10), async (req: any, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const ownerId = req.shareOwnerId;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No image files provided" });
      }
      
      const images = files.map(file => ({
        url: `/uploads/${ownerId}/eNotesPictures/${file.filename}`,
        filename: file.filename,
        size: file.size
      }));
      res.json({ images });
    } catch (error) {
      console.error("Shared images upload error:", error);
      res.status(500).json({ error: "Ошибка загрузки изображений" });
    }
  });

  // Image Upload Routes
  const imageStorage = multer.diskStorage({
    destination: (req, res, cb) => {
      const user = getCurrentUser(req as any);
      if (!user) {
        return cb(new Error("Unauthorized"), "");
      }
      const uploadDir = path.join(process.cwd(), "uploads", user.id, "eNotesPictures");
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  });

  const imageUpload = multer({
    storage: imageStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"));
      }
    },
  });

  app.use("/uploads", (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, express.static(path.join(process.cwd(), "uploads")));

  app.post("/api/upload/image", requireAuth, imageUpload.single("image"), async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No image file provided" });
      }
      const imageUrl = `/uploads/${user.id}/eNotesPictures/${file.filename}`;
      res.json({ url: imageUrl, filename: file.filename, size: file.size });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ error: "Ошибка загрузки изображения" });
    }
  });

  app.post("/api/upload/images", requireAuth, imageUpload.array("images", 10), async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No image files provided" });
      }
      const urls = files.map(file => ({
        url: `/uploads/${user.id}/eNotesPictures/${file.filename}`,
        filename: file.filename,
        size: file.size,
      }));
      res.json({ images: urls });
    } catch (error) {
      console.error("Images upload error:", error);
      res.status(500).json({ error: "Ошибка загрузки изображений" });
    }
  });

  app.delete("/api/upload/image", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: "Image URL is required" });
      }
      const expectedPrefix = `/uploads/${user.id}/eNotesPictures/`;
      if (!imageUrl.startsWith(expectedPrefix)) {
        return res.status(403).json({ error: "Unauthorized to delete this image" });
      }
      const filePath = path.join(process.cwd(), imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: "Image deleted successfully" });
      } else {
        res.status(404).json({ error: "Image not found" });
      }
    } catch (error) {
      console.error("Image delete error:", error);
      res.status(500).json({ error: "Ошибка удаления изображения" });
    }
  });

  // MyRoadMap Image Upload Routes
  const roadmapImageStorage = multer.diskStorage({
    destination: (req, res, cb) => {
      const user = getCurrentUser(req as any);
      if (!user) {
        return cb(new Error("Unauthorized"), "");
      }
      const uploadDir = path.join(process.cwd(), "uploads", user.id, "MyRoadMap");
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  });

  const roadmapImageUpload = multer({
    storage: roadmapImageStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"));
      }
    },
  });

  app.post("/api/upload/roadmap-image", requireAuth, roadmapImageUpload.single("image"), async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No image file provided" });
      }
      const imageUrl = `/uploads/${user.id}/MyRoadMap/${file.filename}`;
      res.json({ url: imageUrl, filename: file.filename, size: file.size });
    } catch (error) {
      console.error("Roadmap image upload error:", error);
      res.status(500).json({ error: "Ошибка загрузки изображения" });
    }
  });

  app.post("/api/upload/roadmap-images", requireAuth, roadmapImageUpload.array("images", 10), async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No image files provided" });
      }
      const urls = files.map(file => ({
        url: `/uploads/${user.id}/MyRoadMap/${file.filename}`,
        filename: file.filename,
        size: file.size,
      }));
      res.json({ images: urls });
    } catch (error) {
      console.error("Roadmap images upload error:", error);
      res.status(500).json({ error: "Ошибка загрузки изображений" });
    }
  });

  app.delete("/api/upload/roadmap-image", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: "Image URL is required" });
      }
      const expectedPrefix = `/uploads/${user.id}/MyRoadMap/`;
      if (!imageUrl.startsWith(expectedPrefix)) {
        return res.status(403).json({ error: "Unauthorized to delete this image" });
      }
      const filePath = path.join(process.cwd(), imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: "Image deleted successfully" });
      } else {
        res.status(404).json({ error: "Image not found" });
      }
    } catch (error) {
      console.error("Roadmap image delete error:", error);
      res.status(500).json({ error: "Ошибка удаления изображения" });
    }
  });

  // MyRoadMap PDF Upload Routes
  const roadmapPdfStorage = multer.diskStorage({
    destination: (req, res, cb) => {
      const user = getCurrentUser(req as any);
      if (!user) {
        return cb(new Error("Unauthorized"), "");
      }
      const uploadDir = path.join(process.cwd(), "uploads", user.id, "MyRoadMap", "pdf");
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 50);
      cb(null, `${uniqueSuffix}-${safeName}`);
    },
  });

  const roadmapPdfUpload = multer({
    storage: roadmapPdfStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for PDFs
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
        cb(null, true);
      } else {
        cb(new Error("Only PDF files are allowed"));
      }
    },
  });

  app.post("/api/upload/roadmap-pdf", requireAuth, roadmapPdfUpload.single("pdf"), async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No PDF file provided" });
      }
      const pdfUrl = `/uploads/${user.id}/MyRoadMap/pdf/${file.filename}`;
      res.json({ 
        url: pdfUrl, 
        filename: file.filename, 
        originalName: file.originalname,
        size: file.size 
      });
    } catch (error) {
      console.error("Roadmap PDF upload error:", error);
      res.status(500).json({ error: "Ошибка загрузки PDF" });
    }
  });

  app.post("/api/upload/roadmap-pdfs", requireAuth, roadmapPdfUpload.array("pdfs", 10), async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No PDF files provided" });
      }
      const pdfs = files.map(file => ({
        url: `/uploads/${user.id}/MyRoadMap/pdf/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
      }));
      res.json({ pdfs });
    } catch (error) {
      console.error("Roadmap PDFs upload error:", error);
      res.status(500).json({ error: "Ошибка загрузки PDF файлов" });
    }
  });

  app.delete("/api/upload/roadmap-pdf", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const { pdfUrl } = req.body;
      if (!pdfUrl) {
        return res.status(400).json({ error: "PDF URL is required" });
      }
      const expectedPrefix = `/uploads/${user.id}/MyRoadMap/pdf/`;
      if (!pdfUrl.startsWith(expectedPrefix)) {
        return res.status(403).json({ error: "Unauthorized to delete this PDF" });
      }
      const filePath = path.join(process.cwd(), pdfUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: "PDF deleted successfully" });
      } else {
        res.status(404).json({ error: "PDF not found" });
      }
    } catch (error) {
      console.error("Roadmap PDF delete error:", error);
      res.status(500).json({ error: "Ошибка удаления PDF" });
    }
  });

  // MyRoadMap Video Upload Routes
  const roadmapVideoStorage = multer.diskStorage({
    destination: (req, res, cb) => {
      const user = getCurrentUser(req as any);
      if (!user) {
        return cb(new Error("Unauthorized"), "");
      }
      const uploadDir = path.join(process.cwd(), "uploads", user.id, "MyRoadMap", "video");
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 50);
      cb(null, `${uniqueSuffix}-${safeName}`);
    },
  });

  const roadmapVideoUpload = multer({
    storage: roadmapVideoStorage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for videos
    fileFilter: (req, file, cb) => {
      const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
      const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
      if (videoTypes.includes(file.mimetype) || videoExts.includes(path.extname(file.originalname).toLowerCase())) {
        cb(null, true);
      } else {
        cb(new Error("Only video files are allowed"));
      }
    },
  });

  app.post("/api/upload/roadmap-video", requireAuth, roadmapVideoUpload.single("video"), async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No video file provided" });
      }
      const videoUrl = `/uploads/${user.id}/MyRoadMap/video/${file.filename}`;
      res.json({ 
        url: videoUrl, 
        filename: file.filename, 
        originalName: file.originalname,
        size: file.size 
      });
    } catch (error) {
      console.error("Roadmap video upload error:", error);
      res.status(500).json({ error: "Ошибка загрузки видео" });
    }
  });

  app.post("/api/upload/roadmap-videos", requireAuth, roadmapVideoUpload.array("videos", 10), async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No video files provided" });
      }
      const videos = files.map(file => ({
        url: `/uploads/${user.id}/MyRoadMap/video/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
      }));
      res.json({ videos });
    } catch (error) {
      console.error("Roadmap videos upload error:", error);
      res.status(500).json({ error: "Ошибка загрузки видео файлов" });
    }
  });

  app.delete("/api/upload/roadmap-video", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const { videoUrl } = req.body;
      if (!videoUrl) {
        return res.status(400).json({ error: "Video URL is required" });
      }
      const expectedPrefix = `/uploads/${user.id}/MyRoadMap/video/`;
      if (!videoUrl.startsWith(expectedPrefix)) {
        return res.status(403).json({ error: "Unauthorized to delete this video" });
      }
      const filePath = path.join(process.cwd(), videoUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: "Video deleted successfully" });
      } else {
        res.status(404).json({ error: "Video not found" });
      }
    } catch (error) {
      console.error("Roadmap video delete error:", error);
      res.status(500).json({ error: "Ошибка удаления видео" });
    }
  });

  // Task Category Routes
  app.get("/api/task-categories", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const categories = await storage.getTaskCategories(user.id);
      res.json(categories);
    } catch (error) {
      console.error("Get task categories error:", error);
      res.status(500).json({ error: "Ошибка получения категорий задач" });
    }
  });

  app.post("/api/task-categories", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const categoryData = insertTaskCategorySchema.parse({ ...req.body, userId: user.id });
      const category = await storage.createTaskCategory(categoryData);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create task category error:", error);
      res.status(500).json({ error: "Ошибка создания категории задач" });
    }
  });

  app.patch("/api/task-categories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertTaskCategorySchema.partial().parse(req.body);
      const category = await storage.updateTaskCategory(id, updates);
      if (!category) {
        return res.status(404).json({ error: "Категория не найдена" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update task category error:", error);
      res.status(500).json({ error: "Ошибка обновления категории" });
    }
  });

  app.delete("/api/task-categories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTaskCategory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete task category error:", error);
      res.status(500).json({ error: "Ошибка удаления категории" });
    }
  });

  // Task Routes
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const allTasks = await storage.getTasks(user.id);
      const tasksWithSubtasks = await Promise.all(
        allTasks.map(async (task) => {
          const subtasks = await storage.getSubtasks(task.id);
          return { ...task, subtasks };
        })
      );
      res.json(tasksWithSubtasks);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Ошибка получения задач" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const rawData = { ...req.body, userId: user.id };
      // Convert empty categoryId to null to satisfy foreign key constraint
      if (rawData.categoryId === '' || rawData.categoryId === undefined) {
        rawData.categoryId = null;
      }
      const taskData = insertTaskSchema.parse(rawData);
      const task = await storage.createTask(taskData);
      res.json({ ...task, subtasks: [] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create task error:", error);
      res.status(500).json({ error: "Ошибка создания задачи" });
    }
  });

  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = updateTaskSchema.parse(req.body);
      const task = await storage.updateTask(id, updates);
      if (!task) {
        return res.status(404).json({ error: "Задача не найдена" });
      }
      const subtasks = await storage.getSubtasks(id);
      res.json({ ...task, subtasks });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update task error:", error);
      res.status(500).json({ error: "Ошибка обновления задачи" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTask(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Ошибка удаления задачи" });
    }
  });

  app.post("/api/tasks/reorder", requireAuth, async (req, res) => {
    try {
      const { taskIds } = req.body;
      if (!Array.isArray(taskIds)) {
        return res.status(400).json({ error: "taskIds должен быть массивом" });
      }
      await storage.reorderTasks(taskIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Reorder tasks error:", error);
      res.status(500).json({ error: "Ошибка изменения порядка задач" });
    }
  });

  // Subtask Routes
  app.post("/api/tasks/:taskId/subtasks", requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const subtaskData = insertSubtaskSchema.parse({ ...req.body, taskId });
      const subtask = await storage.createSubtask(subtaskData);
      res.json(subtask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create subtask error:", error);
      res.status(500).json({ error: "Ошибка создания подзадачи" });
    }
  });

  app.patch("/api/subtasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { completed, title } = req.body;
      const updates: any = {};
      if (completed !== undefined) updates.completed = completed;
      if (title !== undefined) updates.title = title;
      const subtask = await storage.updateSubtask(id, updates);
      if (!subtask) {
        return res.status(404).json({ error: "Подзадача не найдена" });
      }
      res.json(subtask);
    } catch (error) {
      console.error("Update subtask error:", error);
      res.status(500).json({ error: "Ошибка обновления подзадачи" });
    }
  });

  app.delete("/api/subtasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSubtask(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete subtask error:", error);
      res.status(500).json({ error: "Ошибка удаления подзадачи" });
    }
  });

  // Goals Image Upload
  const goalImageStorage = multer.diskStorage({
    destination: (req, res, cb) => {
      const user = getCurrentUser(req as any);
      if (!user) {
        return cb(new Error("Unauthorized"), "");
      }
      const uploadDir = path.join(process.cwd(), "uploads", user.id, "MyGoalDesk");
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  });

  const goalImageUpload = multer({
    storage: goalImageStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"));
      }
    },
  });

  app.post("/api/upload/goal-image", requireAuth, goalImageUpload.single("image"), async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No image file provided" });
      }
      const imageUrl = `/uploads/${user.id}/MyGoalDesk/${file.filename}`;
      res.json({ url: imageUrl, filename: file.filename, size: file.size });
    } catch (error) {
      console.error("Goal image upload error:", error);
      res.status(500).json({ error: "Ошибка загрузки изображения" });
    }
  });

  // Goals Routes
  app.get("/api/goals", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      console.log("Fetching goals for user:", user.id);
      const goals = await storage.getGoals(user.id);
      console.log("Found", goals.length, "goals for user:", user.id);
      res.json(goals);
    } catch (error) {
      console.error("Get goals error:", error);
      res.status(500).json({ error: "Ошибка получения целей" });
    }
  });

  app.post("/api/goals", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      console.log("Creating goal for user:", user.id, "with data:", JSON.stringify(req.body));
      const goalData = insertGoalSchema.parse({ ...req.body, userId: user.id });
      console.log("Parsed goal data:", JSON.stringify(goalData));
      const goal = await storage.createGoal(goalData);
      console.log("Goal created successfully:", JSON.stringify(goal));
      res.json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation error:", error.errors);
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create goal error:", error);
      res.status(500).json({ error: "Ошибка создания цели" });
    }
  });

  app.patch("/api/goals/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = updateGoalSchema.parse(req.body);
      const goal = await storage.updateGoal(id, updates);
      if (!goal) {
        return res.status(404).json({ error: "Цель не найдена" });
      }
      res.json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update goal error:", error);
      res.status(500).json({ error: "Ошибка обновления цели" });
    }
  });

  app.delete("/api/goals/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGoal(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete goal error:", error);
      res.status(500).json({ error: "Ошибка удаления цели" });
    }
  });

  app.post("/api/goals/reorder", requireAuth, async (req, res) => {
    try {
      const { goalIds } = req.body;
      if (!Array.isArray(goalIds)) {
        return res.status(400).json({ error: "goalIds must be an array" });
      }
      await storage.reorderGoals(goalIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Reorder goals error:", error);
      res.status(500).json({ error: "Ошибка изменения порядка целей" });
    }
  });

  // File Manager Routes
  const fileManagerStorage = multer.diskStorage({
    destination: (req, res, cb) => {
      const user = getCurrentUser(req as any);
      if (!user) {
        return cb(new Error("Unauthorized"), "");
      }
      const folderId = (req as any).query.folderId || "root";
      const uploadDir = path.join(process.cwd(), "uploads", user.id, "files", folderId);
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      cb(null, uniqueSuffix + "-" + safeName);
    },
  });

  const fileManagerUpload = multer({
    storage: fileManagerStorage,
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  // Helper to determine file type
  const getFileType = (mimeType: string, filename: string): "image" | "document" | "video" | "audio" | "code" | "archive" | "other" => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text/")) return "document";
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar") || mimeType.includes("gzip")) return "archive";
    const codeExtensions = [".js", ".ts", ".tsx", ".jsx", ".css", ".html", ".py", ".java", ".cpp", ".c", ".go", ".rs", ".json", ".xml", ".yaml", ".yml"];
    if (codeExtensions.some(ext => filename.toLowerCase().endsWith(ext))) return "code";
    return "other";
  };

  // Folder Routes
  app.get("/api/folders", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const foldersList = await storage.getFolders(user.id);
      
      const foldersWithStats = await Promise.all(
        foldersList.map(async (folder) => {
          const folderFiles = await storage.getFiles(user.id, folder.id);
          const totalSize = folderFiles.reduce((sum, f) => sum + f.size, 0);
          return {
            ...folder,
            filesCount: folderFiles.length,
            size: totalSize,
          };
        })
      );
      
      res.json(foldersWithStats);
    } catch (error) {
      console.error("Get folders error:", error);
      res.status(500).json({ error: "Ошибка получения папок" });
    }
  });

  app.post("/api/folders", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const folderData = insertFolderSchema.parse({ ...req.body, userId: user.id });
      const folder = await storage.createFolder(folderData);
      res.json({ ...folder, filesCount: 0, size: 0 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create folder error:", error);
      res.status(500).json({ error: "Ошибка создания папки" });
    }
  });

  app.patch("/api/folders/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const folder = await storage.getFolder(id);
      
      if (!folder) {
        return res.status(404).json({ error: "Папка не найдена" });
      }
      
      if (folder.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      const updates = updateFolderSchema.parse(req.body);
      const updatedFolder = await storage.updateFolder(id, updates);
      res.json(updatedFolder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update folder error:", error);
      res.status(500).json({ error: "Ошибка обновления папки" });
    }
  });

  app.delete("/api/folders/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const folder = await storage.getFolder(id);
      
      if (!folder) {
        return res.status(404).json({ error: "Папка не найдена" });
      }
      
      if (folder.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      // Delete files from disk
      const folderFiles = await storage.getFiles(user.id, id);
      for (const file of folderFiles) {
        const filePath = path.join(process.cwd(), file.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      await storage.deleteFolder(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete folder error:", error);
      res.status(500).json({ error: "Ошибка удаления папки" });
    }
  });

  // File Routes
  app.get("/api/files", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const { folderId } = req.query;
      const filesList = await storage.getFiles(user.id, folderId as string | undefined);
      res.json(filesList);
    } catch (error) {
      console.error("Get files error:", error);
      res.status(500).json({ error: "Ошибка получения файлов" });
    }
  });

  // Scan filesystem for real files in user's uploads directory
  app.get("/api/files/scan", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const userUploadsDir = path.join(process.cwd(), "uploads", user.id);
      
      if (!fs.existsSync(userUploadsDir)) {
        return res.json({ folders: [], files: [] });
      }
      
      const scanDirectory = (dirPath: string, relativePath: string = ""): { folders: any[], files: any[] } => {
        const result = { folders: [] as any[], files: [] as any[] };
        
        try {
          const items = fs.readdirSync(dirPath);
          
          for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
              const subScan = scanDirectory(fullPath, itemRelativePath);
              result.folders.push({
                id: itemRelativePath,
                name: item,
                type: "folder",
                color: "#6366f1",
                filesCount: subScan.files.length,
                size: subScan.files.reduce((sum, f) => sum + f.size, 0),
                createdAt: stat.birthtime,
                path: itemRelativePath,
              });
              result.files.push(...subScan.files);
            } else {
              const ext = path.extname(item).toLowerCase();
              let fileType: "image" | "document" | "video" | "audio" | "code" | "archive" | "other" = "other";
              
              if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"].includes(ext)) fileType = "image";
              else if ([".mp4", ".avi", ".mov", ".mkv", ".webm"].includes(ext)) fileType = "video";
              else if ([".mp3", ".wav", ".flac", ".ogg", ".m4a"].includes(ext)) fileType = "audio";
              else if ([".pdf", ".doc", ".docx", ".txt", ".rtf", ".xls", ".xlsx"].includes(ext)) fileType = "document";
              else if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(ext)) fileType = "archive";
              else if ([".js", ".ts", ".tsx", ".jsx", ".css", ".html", ".py", ".java", ".cpp", ".c", ".go", ".rs", ".json", ".xml", ".yaml", ".yml"].includes(ext)) fileType = "code";
              
              result.files.push({
                id: itemRelativePath,
                name: item,
                type: "file",
                size: stat.size,
                folderId: relativePath || "root",
                fileType,
                uploadedAt: stat.mtime,
                url: `/uploads/${user.id}/${itemRelativePath}`,
                path: `uploads/${user.id}/${itemRelativePath}`,
              });
            }
          }
        } catch (err) {
          console.error("Error scanning directory:", dirPath, err);
        }
        
        return result;
      };
      
      const scanResult = scanDirectory(userUploadsDir);
      res.json(scanResult);
    } catch (error) {
      console.error("Scan files error:", error);
      res.status(500).json({ error: "Ошибка сканирования файлов" });
    }
  });

  // Download file endpoint
  app.get("/api/files/download/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      
      if (!fileId) {
        return res.status(400).json({ error: "File ID is required" });
      }

      // Sanitize the fileId to prevent directory traversal
      const safePath = fileId.replace(/\.\./g, '').replace(/^\/+/, '');
      
      // Iterate through all users' uploads to find the file
      const uploadsDir = path.join(process.cwd(), "uploads");
      let filePath: string | null = null;

      if (fs.existsSync(uploadsDir)) {
        const userDirs = fs.readdirSync(uploadsDir);
        for (const userId of userDirs) {
          const userDir = path.join(uploadsDir, userId);
          const potentialPath = path.join(userDir, safePath);
          
          // Check if file exists and is within user directory
          if (fs.existsSync(potentialPath) && potentialPath.startsWith(userDir)) {
            filePath = potentialPath;
            break;
          }
        }
      }

      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      const fileName = path.basename(filePath);
      res.download(filePath, fileName);
    } catch (error) {
      console.error("Download file error:", error);
      res.status(500).json({ error: "Ошибка скачивания файла" });
    }
  });

  // Create folder in filesystem
  app.post("/api/files/folders", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const { name } = req.body;
      
      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Folder name is required" });
      }
      
      const safeName = name.replace(/[^a-zA-Z0-9_\-\s]/g, "_").trim();
      if (!safeName) {
        return res.status(400).json({ error: "Invalid folder name" });
      }
      
      const folderPath = path.join(process.cwd(), "uploads", user.id, safeName);
      
      if (fs.existsSync(folderPath)) {
        return res.status(400).json({ error: "Folder already exists" });
      }
      
      fs.mkdirSync(folderPath, { recursive: true });
      
      const stat = fs.statSync(folderPath);
      res.json({
        id: safeName,
        name: safeName,
        type: "folder",
        color: "#6366f1",
        filesCount: 0,
        size: 0,
        createdAt: stat.birthtime,
        path: safeName,
      });
    } catch (error) {
      console.error("Create folder error:", error);
      res.status(500).json({ error: "Ошибка создания папки" });
    }
  });

  // Delete folder from filesystem
  app.delete("/api/files/folders/:folderPath(*)", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const { folderPath } = req.params;
      
      if (!folderPath || folderPath.includes("..")) {
        return res.status(400).json({ error: "Invalid folder path" });
      }
      
      const fullPath = path.join(process.cwd(), "uploads", user.id, folderPath);
      
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "Folder not found" });
      }
      
      fs.rmSync(fullPath, { recursive: true, force: true });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete folder error:", error);
      res.status(500).json({ error: "Ошибка удаления папки" });
    }
  });

  // Delete file from filesystem
  app.delete("/api/files/filesystem/:filePath(*)", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const { filePath } = req.params;
      
      if (!filePath || filePath.includes("..")) {
        return res.status(400).json({ error: "Invalid file path" });
      }
      
      const fullPath = path.join(process.cwd(), "uploads", user.id, filePath);
      
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      fs.unlinkSync(fullPath);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({ error: "Ошибка удаления файла" });
    }
  });

  // Upload files to filesystem folder
  const filesystemStorage = multer.diskStorage({
    destination: (req, res, cb) => {
      const user = getCurrentUser(req as any);
      if (!user) {
        return cb(new Error("Unauthorized"), "");
      }
      const folderId = (req as any).query.folderId || "";
      const safeFolderId = folderId.replace(/\.\./g, "");
      const uploadDir = path.join(process.cwd(), "uploads", user.id, safeFolderId);
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      cb(null, safeName);
    },
  });

  const filesystemUpload = multer({
    storage: filesystemStorage,
    limits: { fileSize: 100 * 1024 * 1024 },
  });

  app.post("/api/files/upload", requireAuth, filesystemUpload.array("files", 10), async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const uploadedFiles = req.files as Express.Multer.File[];
      const { folderId } = req.query;
      
      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }
      
      const safeFolderId = (folderId as string || "").replace(/\.\./g, "");
      
      const savedFiles = uploadedFiles.map((file) => {
        const filePath = safeFolderId ? `${safeFolderId}/${file.filename}` : file.filename;
        const fileType = getFileType(file.mimetype, file.originalname);
        
        return {
          id: filePath,
          name: file.filename,
          originalName: file.originalname,
          size: file.size,
          fileType,
          url: `/uploads/${user.id}/${filePath}`,
          path: `uploads/${user.id}/${filePath}`,
          uploadedAt: new Date(),
        };
      });
      
      res.json(savedFiles);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Ошибка загрузки файлов" });
    }
  });

  app.patch("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const file = await storage.getFile(id);
      
      if (!file) {
        return res.status(404).json({ error: "Файл не найден" });
      }
      
      if (file.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      const updates = updateFileSchema.parse(req.body);
      const updatedFile = await storage.updateFile(id, updates);
      res.json(updatedFile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update file error:", error);
      res.status(500).json({ error: "Ошибка обновления файла" });
    }
  });

  app.delete("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const file = await storage.getFile(id);
      
      if (!file) {
        return res.status(404).json({ error: "Файл не найден" });
      }
      
      if (file.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      // Delete from disk
      const filePath = path.join(process.cwd(), file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      await storage.deleteFile(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({ error: "Ошибка удаления файла" });
    }
  });

  // Roadmap Category Routes
  app.get("/api/roadmap-categories", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      let categories = await storage.getRoadmapCategories(user.id);
      // If no roadmap categories exist, sync from regular categories ONCE
      if (categories.length === 0) {
        const normalCategories = await storage.getCategories(user.id);
        const newCategories = [];
        for (const cat of normalCategories) {
          const newCat = await storage.createRoadmapCategory({
            userId: user.id,
            name: cat.name,
            color: cat.color || "#6366f1",
            icon: cat.icon || undefined,
          });
          newCategories.push(newCat);
        }
        categories = newCategories;
      }
      res.json(categories);
    } catch (error) {
      console.error("Get roadmap categories error:", error);
      res.status(500).json({ error: "Ошибка получения категорий" });
    }
  });

  app.post("/api/roadmap-categories", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const data = insertRoadmapCategorySchema.parse({ ...req.body, userId: user.id });
      const category = await storage.createRoadmapCategory(data);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create roadmap category error:", error);
      res.status(500).json({ error: "Ошибка создания категории" });
    }
  });

  app.patch("/api/roadmap-categories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const category = await storage.getRoadmapCategory(id);
      
      if (!category) {
        return res.status(404).json({ error: "Категория не найдена" });
      }
      
      if (category.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      const updates = insertRoadmapCategorySchema.partial().parse(req.body);
      const updatedCategory = await storage.updateRoadmapCategory(id, updates);
      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update roadmap category error:", error);
      res.status(500).json({ error: "Ошибка обновления категории" });
    }
  });

  app.delete("/api/roadmap-categories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const category = await storage.getRoadmapCategory(id);
      
      if (!category) {
        return res.status(404).json({ error: "Категория не найдена" });
      }
      
      if (category.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      await storage.deleteRoadmapCategory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete roadmap category error:", error);
      res.status(500).json({ error: "Ошибка удаления категории" });
    }
  });

  // Roadmap Routes
  app.get("/api/roadmaps", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const roadmapsList = await storage.getRoadmaps(user.id);
      
      const roadmapsWithMilestones = await Promise.all(
        roadmapsList.map(async (roadmap) => {
          const milestonesList = await storage.getMilestones(roadmap.id);
          return {
            ...roadmap,
            milestones: milestonesList,
          };
        })
      );
      
      res.json(roadmapsWithMilestones);
    } catch (error) {
      console.error("Get roadmaps error:", error);
      res.status(500).json({ error: "Ошибка получения дорожных карт" });
    }
  });

  app.get("/api/roadmaps/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const roadmap = await storage.getRoadmap(id);
      
      if (!roadmap) {
        return res.status(404).json({ error: "Дорожная карта не найдена" });
      }
      
      if (roadmap.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      const milestonesList = await storage.getMilestones(id);
      res.json({ ...roadmap, milestones: milestonesList });
    } catch (error) {
      console.error("Get roadmap error:", error);
      res.status(500).json({ error: "Ошибка получения дорожной карты" });
    }
  });

  app.post("/api/roadmaps", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const data = insertRoadmapSchema.parse({ ...req.body, userId: user.id });
      const roadmap = await storage.createRoadmap(data);
      res.json({ ...roadmap, milestones: [] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create roadmap error:", error);
      res.status(500).json({ error: "Ошибка создания дорожной карты" });
    }
  });

  app.patch("/api/roadmaps/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const roadmap = await storage.getRoadmap(id);
      
      if (!roadmap) {
        return res.status(404).json({ error: "Дорожная карта не найдена" });
      }
      
      if (roadmap.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      const updates = updateRoadmapSchema.parse(req.body);
      const updatedRoadmap = await storage.updateRoadmap(id, updates);
      const milestonesList = await storage.getMilestones(id);
      res.json({ ...updatedRoadmap, milestones: milestonesList });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update roadmap error:", error);
      res.status(500).json({ error: "Ошибка обновления дорожной карты" });
    }
  });

  app.delete("/api/roadmaps/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const roadmap = await storage.getRoadmap(id);
      
      if (!roadmap) {
        return res.status(404).json({ error: "Дорожная карта не найдена" });
      }
      
      if (roadmap.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      await storage.deleteRoadmap(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete roadmap error:", error);
      res.status(500).json({ error: "Ошибка удаления дорожной карты" });
    }
  });

  // Milestone Routes
  app.post("/api/roadmaps/:roadmapId/milestones", requireAuth, async (req, res) => {
    try {
      const { roadmapId } = req.params;
      const user = getCurrentUser(req)!;
      const roadmap = await storage.getRoadmap(roadmapId);
      
      if (!roadmap) {
        return res.status(404).json({ error: "Дорожная карта не найдена" });
      }
      
      if (roadmap.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      const data = insertMilestoneSchema.parse({ ...req.body, roadmapId });
      const milestone = await storage.createMilestone(data);
      res.json(milestone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create milestone error:", error);
      res.status(500).json({ error: "Ошибка создания этапа" });
    }
  });

  app.patch("/api/milestones/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const milestone = await storage.getMilestone(id);
      
      if (!milestone) {
        return res.status(404).json({ error: "Этап не найден" });
      }
      
      const roadmap = await storage.getRoadmap(milestone.roadmapId);
      if (!roadmap || roadmap.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      const updates = updateMilestoneSchema.parse(req.body);
      const wasCompleted = milestone.completed;
      const updatedMilestone = await storage.updateMilestone(id, updates);
      
      if (!wasCompleted && updates.completed === true) {
        await notificationService.notifyMilestoneCompleted(
          user.id,
          id,
          milestone.title,
          roadmap.title
        );
      }
      
      res.json(updatedMilestone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update milestone error:", error);
      res.status(500).json({ error: "Ошибка обновления этапа" });
    }
  });

  app.delete("/api/milestones/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const milestone = await storage.getMilestone(id);
      
      if (!milestone) {
        return res.status(404).json({ error: "Этап не найден" });
      }
      
      const roadmap = await storage.getRoadmap(milestone.roadmapId);
      if (!roadmap || roadmap.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      await storage.deleteMilestone(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete milestone error:", error);
      res.status(500).json({ error: "Ошибка удаления этапа" });
    }
  });

  app.post("/api/files/:fileId/share-link", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const { fileId } = req.params;
      
      // Construct the file path from the fileId (which is formatted as "folder/filename")
      const filePath = `uploads/${user.id}/${fileId}`;
      const fullPath = path.join(process.cwd(), filePath);
      
      // Verify file exists in filesystem
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Check if user directory matches (security check)
      const userUploadsDir = path.join(process.cwd(), "uploads", user.id);
      if (!fullPath.startsWith(userUploadsDir)) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Check for existing token
      const existingToken = await storage.getDownloadTokenByPath(user.id, filePath);
      if (existingToken) {
        return res.json({ 
          token: existingToken.token,
          downloadCount: existingToken.downloadCount 
        });
      }
      
      // Create new token
      const fileName = path.basename(fullPath);
      const token = randomBytes(32).toString("hex");
      const newToken = await storage.createDownloadToken({
        userId: user.id,
        token,
        filePath: filePath,
        fileName: fileName,
      });
      
      res.json({ 
        token: newToken.token,
        downloadCount: newToken.downloadCount 
      });
    } catch (error) {
      console.error("Generate share link error:", error);
      res.status(500).json({ error: "Failed to generate share link" });
    }
  });

  app.get("/file/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const downloadToken = await storage.getDownloadToken(token);
      if (!downloadToken) {
        return res.status(404).json({ error: "Invalid or expired download link" });
      }
      
      const filePath = path.join(process.cwd(), downloadToken.filePath);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      await storage.incrementDownloadCount(token);
      
      const contentType = downloadToken.fileName.endsWith('.pdf') ? 'application/pdf' :
                         downloadToken.fileName.endsWith('.jpg') || downloadToken.fileName.endsWith('.jpeg') ? 'image/jpeg' :
                         downloadToken.fileName.endsWith('.png') ? 'image/png' :
                         downloadToken.fileName.endsWith('.gif') ? 'image/gif' :
                         downloadToken.fileName.endsWith('.mp4') ? 'video/mp4' :
                         downloadToken.fileName.endsWith('.mp3') ? 'audio/mpeg' :
                         'application/octet-stream';
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(downloadToken.fileName)}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Download file error:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  // ========== LINK CENTER ROUTES ==========

  // Link Categories
  app.get("/api/link-categories", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const categoriesList = await storage.getLinkCategories(user.id);
      res.json(categoriesList);
    } catch (error) {
      console.error("Get link categories error:", error);
      res.status(500).json({ error: "Ошибка получения категорий" });
    }
  });

  app.post("/api/link-categories", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const data = insertLinkCategorySchema.parse({ ...req.body, userId: user.id });
      const category = await storage.createLinkCategory(data);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create link category error:", error);
      res.status(500).json({ error: "Ошибка создания категории" });
    }
  });

  app.patch("/api/link-categories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const category = await storage.getLinkCategory(id);
      
      if (!category) {
        return res.status(404).json({ error: "Категория не найдена" });
      }
      
      if (category.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      const updates = insertLinkCategorySchema.partial().parse(req.body);
      const updatedCategory = await storage.updateLinkCategory(id, updates);
      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update link category error:", error);
      res.status(500).json({ error: "Ошибка обновления категории" });
    }
  });

  app.delete("/api/link-categories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const category = await storage.getLinkCategory(id);
      
      if (!category) {
        return res.status(404).json({ error: "Категория не найдена" });
      }
      
      if (category.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      await storage.deleteLinkCategory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete link category error:", error);
      res.status(500).json({ error: "Ошибка удаления категории" });
    }
  });

  // Links
  app.get("/api/links", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const { categoryId } = req.query;
      const linksList = await storage.getLinks(user.id, categoryId as string | undefined);
      res.json(linksList);
    } catch (error) {
      console.error("Get links error:", error);
      res.status(500).json({ error: "Ошибка получения ссылок" });
    }
  });

  app.post("/api/links", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const data = insertLinkSchema.parse({ ...req.body, userId: user.id });
      const link = await storage.createLink(data);
      res.json(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create link error:", error);
      res.status(500).json({ error: "Ошибка создания ссылки" });
    }
  });

  app.patch("/api/links/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const link = await storage.getLink(id);
      
      if (!link) {
        return res.status(404).json({ error: "Ссылка не найдена" });
      }
      
      if (link.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      const updates = updateLinkSchema.parse(req.body);
      const updatedLink = await storage.updateLink(id, updates);
      res.json(updatedLink);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update link error:", error);
      res.status(500).json({ error: "Ошибка обновления ссылки" });
    }
  });

  app.delete("/api/links/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = getCurrentUser(req)!;
      const link = await storage.getLink(id);
      
      if (!link) {
        return res.status(404).json({ error: "Ссылка не найдена" });
      }
      
      if (link.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }
      
      await storage.deleteLink(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete link error:", error);
      res.status(500).json({ error: "Ошибка удаления ссылки" });
    }
  });

  // Fetch URL metadata (title, description, favicon)
  app.post("/api/links/fetch-metadata", requireAuth, async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "URL обязателен" });
      }

      // SSRF protection: validate URL
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(400).json({ error: "Некорректный URL" });
      }

      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: "Допускаются только HTTP/HTTPS ссылки" });
      }

      // Block internal/private IPs and localhost
      const hostname = parsedUrl.hostname.toLowerCase();
      const blockedPatterns = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        '10.',
        '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.',
        '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.',
        '192.168.',
        '169.254.',
        'metadata.google',
        'metadata.aws',
      ];
      
      if (blockedPatterns.some(pattern => hostname.startsWith(pattern) || hostname === pattern)) {
        return res.status(400).json({ error: "Приватные адреса недоступны" });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LinkCenter/1.0)',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        return res.json({ title: null, description: null, favicon: null, image: null });
      }

      const html = await response.text();
      
      // Parse title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
                         html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
      const title = titleMatch ? titleMatch[1].trim() : null;

      // Parse description
      const descMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i);
      const description = descMatch ? descMatch[1].trim() : null;

      // Parse image (og:image)
      const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
      let image = imageMatch ? imageMatch[1].trim() : null;
      
      // Make relative URLs absolute
      if (image && !image.startsWith('http')) {
        const urlObj = new URL(url);
        image = image.startsWith('/') ? `${urlObj.origin}${image}` : `${urlObj.origin}/${image}`;
      }

      // Parse favicon
      const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i);
      let favicon = faviconMatch ? faviconMatch[1].trim() : null;
      
      // Make relative URLs absolute
      if (favicon && !favicon.startsWith('http')) {
        const urlObj = new URL(url);
        favicon = favicon.startsWith('/') ? `${urlObj.origin}${favicon}` : `${urlObj.origin}/${favicon}`;
      }
      
      // Fallback to /favicon.ico
      if (!favicon) {
        const urlObj = new URL(url);
        favicon = `${urlObj.origin}/favicon.ico`;
      }

      res.json({ title, description, favicon, image });
    } catch (error) {
      console.error("Fetch metadata error:", error);
      res.json({ title: null, description: null, favicon: null, image: null });
    }
  });

  // ============== Notification Routes ==============
  
  // Get notification categories
  app.get("/api/notifications/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getNotificationCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get notification categories error:", error);
      res.status(500).json({ error: "Ошибка получения категорий уведомлений" });
    }
  });

  // Get notifications for current user
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const { category, status, limit } = req.query;
      const filters: { categoryKey?: string; status?: string; limit?: number } = {};
      
      if (category) filters.categoryKey = category as string;
      if (status) filters.status = status as string;
      if (limit) filters.limit = parseInt(limit as string, 10);

      const notifications = await storage.getNotifications(user.id, filters);
      
      // Enrich notifications with category info
      const categories = await storage.getNotificationCategories();
      const enrichedNotifications = notifications.map(n => {
        const cat = categories.find(c => c.id === n.categoryId);
        return {
          ...n,
          category: cat ? { key: cat.key, name: cat.name, color: cat.color } : null
        };
      });
      
      res.json(enrichedNotifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Ошибка получения уведомлений" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const count = await storage.getUnreadNotificationCount(user.id);
      res.json(count);
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ error: "Ошибка получения количества уведомлений" });
    }
  });

  // Create a new notification (for internal use / API)
  app.post("/api/notifications", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const { categoryKey, typeKey, title, body, sourceType, sourceId, actionUrl, metadata } = req.body;
      
      if (!categoryKey || !title) {
        return res.status(400).json({ error: "Категория и заголовок обязательны" });
      }

      const category = await storage.getNotificationCategoryByKey(categoryKey);
      if (!category) {
        return res.status(400).json({ error: "Категория не найдена" });
      }

      let typeId = null;
      if (typeKey) {
        const type = await storage.getNotificationTypeByKey(categoryKey, typeKey);
        if (type) typeId = type.id;
      }

      const notification = await storage.createNotification({
        userId: user.id,
        categoryId: category.id,
        typeId,
        title,
        body,
        sourceType,
        sourceId,
        actionUrl,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        status: "unread"
      });

      res.json(notification);
    } catch (error) {
      console.error("Create notification error:", error);
      res.status(500).json({ error: "Ошибка создания уведомления" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const notification = await storage.getNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Уведомление не найдено" });
      }
      if (notification.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      const updated = await storage.markNotificationRead(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Ошибка обновления уведомления" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const { categoryKey } = req.body;
      await storage.markAllNotificationsRead(user.id, categoryKey);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark all read error:", error);
      res.status(500).json({ error: "Ошибка обновления уведомлений" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const notification = await storage.getNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Уведомление не найдено" });
      }
      if (notification.userId !== user.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      await storage.deleteNotification(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ error: "Ошибка удаления уведомления" });
    }
  });

  // ==================== APP STORE ROUTES ====================

  // Get all app categories
  app.get("/api/app-categories", async (req, res) => {
    try {
      const categories = await storage.getAppCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get app categories error:", error);
      res.status(500).json({ error: "Ошибка получения категорий" });
    }
  });

  // Get all apps (optionally filtered by category)
  app.get("/api/apps", async (req, res) => {
    try {
      const { categoryId } = req.query;
      const appsList = await storage.getApps(categoryId as string | undefined);
      res.json(appsList);
    } catch (error) {
      console.error("Get apps error:", error);
      res.status(500).json({ error: "Ошибка получения приложений" });
    }
  });

  // Get featured apps
  app.get("/api/apps/featured", async (req, res) => {
    try {
      const featuredApps = await storage.getFeaturedApps();
      res.json(featuredApps);
    } catch (error) {
      console.error("Get featured apps error:", error);
      res.status(500).json({ error: "Ошибка получения рекомендуемых приложений" });
    }
  });

  // Get single app
  app.get("/api/apps/:id", async (req, res) => {
    try {
      const app = await storage.getApp(req.params.id);
      if (!app) {
        return res.status(404).json({ error: "Приложение не найдено" });
      }
      res.json(app);
    } catch (error) {
      console.error("Get app error:", error);
      res.status(500).json({ error: "Ошибка получения приложения" });
    }
  });

  // Get user's added apps
  app.get("/api/user-apps", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }
      const userApps = await storage.getUserApps(user.id);
      res.json(userApps);
    } catch (error) {
      console.error("Get user apps error:", error);
      res.status(500).json({ error: "Ошибка получения приложений пользователя" });
    }
  });

  // Add app to user's collection
  app.post("/api/user-apps", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const parsed = insertUserAppSchema.safeParse({ ...req.body, userId: user.id });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const existing = await storage.getUserApp(user.id, parsed.data.appId);
      if (existing) {
        return res.status(400).json({ error: "Приложение уже добавлено" });
      }

      const userApp = await storage.addUserApp(parsed.data);
      res.json(userApp);
    } catch (error) {
      console.error("Add user app error:", error);
      res.status(500).json({ error: "Ошибка добавления приложения" });
    }
  });

  // Remove app from user's collection
  app.delete("/api/user-apps/:appId", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      await storage.removeUserApp(user.id, req.params.appId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove user app error:", error);
      res.status(500).json({ error: "Ошибка удаления приложения" });
    }
  });

  // Update app launch time
  app.post("/api/user-apps/:appId/launch", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      await storage.updateUserAppLaunch(user.id, req.params.appId);
      res.json({ success: true });
    } catch (error) {
      console.error("Update app launch error:", error);
      res.status(500).json({ error: "Ошибка обновления времени запуска" });
    }
  });

  // Toggle app favorite
  app.post("/api/user-apps/:appId/favorite", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const updated = await storage.toggleUserAppFavorite(user.id, req.params.appId);
      if (!updated) {
        return res.status(404).json({ error: "Приложение не найдено" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Toggle favorite error:", error);
      res.status(500).json({ error: "Ошибка обновления избранного" });
    }
  });

  // Get app reviews
  app.get("/api/apps/:id/reviews", async (req, res) => {
    try {
      const reviews = await storage.getAppReviews(req.params.id);
      res.json(reviews);
    } catch (error) {
      console.error("Get reviews error:", error);
      res.status(500).json({ error: "Ошибка получения отзывов" });
    }
  });

  // Check if user already has a review for this app
  app.get("/api/apps/:id/my-review", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const review = await storage.getUserAppReview(user.id, req.params.id);
      res.json({ hasReview: !!review, review: review || null });
    } catch (error) {
      console.error("Get my review error:", error);
      res.status(500).json({ error: "Ошибка получения отзыва" });
    }
  });

  // Create app review
  app.post("/api/apps/:id/reviews", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      // Check if user already has a review
      const existingReview = await storage.getUserAppReview(user.id, req.params.id);
      if (existingReview) {
        return res.status(409).json({ error: "Вы уже оставили отзыв на это приложение" });
      }

      const parsed = insertAppReviewSchema.safeParse({ ...req.body, appId: req.params.id, userId: user.id });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const review = await storage.createAppReview(parsed.data);
      res.json(review);
    } catch (error) {
      console.error("Create review error:", error);
      res.status(500).json({ error: "Ошибка создания отзыва" });
    }
  });

  // ==================== BALANCES ====================

  // Get user balances
  app.get("/api/balances", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      // Ensure user has balances (for existing users who registered before the feature)
      await storage.ensureUserBalances(user.id);
      
      const userBalances = await storage.getUserBalances(user.id);
      res.json(userBalances);
    } catch (error) {
      console.error("Get balances error:", error);
      res.status(500).json({ error: "Ошибка получения балансов" });
    }
  });

  // ==================== CRYPTO WALLETS ====================

  // Helper: Check if user has crypto wallets feature enabled
  async function checkWalletsFeature(userId: string): Promise<boolean> {
    const feature = await storage.getUserFeature(userId, 'crypto_wallets');
    return feature?.enabled ?? false;
  }

  // Get all crypto networks (available without feature activation for network browsing)
  app.get("/api/crypto/networks", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const networks = await storage.getCryptoNetworks();
      res.json(networks);
    } catch (error) {
      console.error("Get networks error:", error);
      res.status(500).json({ error: "Ошибка получения сетей" });
    }
  });

  // Get coins for a network (available without feature activation for browsing)
  app.get("/api/crypto/networks/:networkId/coins", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const coins = await storage.getCryptoCoinsByNetwork(req.params.networkId);
      res.json(coins);
    } catch (error) {
      console.error("Get coins error:", error);
      res.status(500).json({ error: "Ошибка получения монет" });
    }
  });

  // Get user's wallets
  app.get("/api/crypto/wallets", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const networkId = req.query.networkId as string | undefined;
      const wallets = await storage.getCryptoWallets(user.id, networkId);
      
      // Remove encrypted private keys from response
      const safeWallets = wallets.map(w => ({
        ...w,
        encryptedPrivateKey: undefined,
        hasPrivateKey: !!w.encryptedPrivateKey
      }));
      
      res.json(safeWallets);
    } catch (error) {
      console.error("Get wallets error:", error);
      res.status(500).json({ error: "Ошибка получения кошельков" });
    }
  });

  // Create wallet via external API
  app.post("/api/crypto/wallets", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const { networkId, label } = req.body;
      if (!networkId) {
        return res.status(400).json({ error: "networkId обязателен" });
      }

      const network = await storage.getCryptoNetwork(networkId);
      if (!network) {
        return res.status(404).json({ error: "Сеть не найдена" });
      }

      // Create wallet via external API
      const result = await walletApiService.createWallet(user.id, network.nodeId);
      if (!result.success || !result.data) {
        return res.status(500).json({ error: result.error || "Ошибка создания кошелька" });
      }

      // Encrypt private key before storing
      const encryptedPrivateKey = encrypt(result.data.private_key, user.id);

      // Save wallet to database
      const wallet = await storage.createCryptoWallet({
        userId: user.id,
        networkId,
        address: result.data.address,
        label: label || `${network.name} Wallet`,
        encryptedPrivateKey,
        managedByApi: true,
        externalWalletId: result.data.id
      });

      res.json({
        ...wallet,
        encryptedPrivateKey: undefined,
        hasPrivateKey: true
      });
    } catch (error) {
      console.error("Create wallet error:", error);
      res.status(500).json({ error: "Ошибка создания кошелька" });
    }
  });

  // Import external wallet (user provides address and private key)
  app.post("/api/crypto/wallets/import", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const hasFeature = await checkWalletsFeature(user.id);
      if (!hasFeature) {
        return res.status(403).json({ error: "Функция кошельков не активирована" });
      }

      const { networkId, address, privateKey, label } = req.body;
      if (!networkId || !address) {
        return res.status(400).json({ error: "networkId и address обязательны" });
      }

      const network = await storage.getCryptoNetwork(networkId);
      if (!network) {
        return res.status(404).json({ error: "Сеть не найдена" });
      }

      // Check if wallet already exists
      const existing = await storage.getCryptoWalletByAddress(user.id, address);
      if (existing) {
        return res.status(400).json({ error: "Кошелек с таким адресом уже существует" });
      }

      // Encrypt private key if provided
      const encryptedPrivateKey = privateKey ? encrypt(privateKey, user.id) : undefined;

      const wallet = await storage.createCryptoWallet({
        userId: user.id,
        networkId,
        address,
        label: label || `${network.name} Wallet`,
        encryptedPrivateKey,
        managedByApi: false
      });

      res.json({
        ...wallet,
        encryptedPrivateKey: undefined,
        hasPrivateKey: !!encryptedPrivateKey
      });
    } catch (error) {
      console.error("Import wallet error:", error);
      res.status(500).json({ error: "Ошибка импорта кошелька" });
    }
  });

  // Get wallet balance
  app.get("/api/crypto/wallets/:walletId/balance", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const hasFeature = await checkWalletsFeature(user.id);
      if (!hasFeature) {
        return res.status(403).json({ error: "Функция кошельков не активирована" });
      }

      const wallet = await storage.getCryptoWallet(req.params.walletId);
      if (!wallet || wallet.userId !== user.id) {
        return res.status(404).json({ error: "Кошелек не найден" });
      }

      const network = await storage.getCryptoNetwork(wallet.networkId);
      if (!network) {
        return res.status(404).json({ error: "Сеть не найдена" });
      }

      const result = await walletApiService.getBalance(user.id, wallet.address, network.nodeId);
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Ошибка получения баланса" });
      }

      res.json(result.data);
    } catch (error) {
      console.error("Get balance error:", error);
      res.status(500).json({ error: "Ошибка получения баланса" });
    }
  });

  // Transfer funds
  app.post("/api/crypto/wallets/:walletId/transfer", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const hasFeature = await checkWalletsFeature(user.id);
      if (!hasFeature) {
        return res.status(403).json({ error: "Функция кошельков не активирована" });
      }

      const wallet = await storage.getCryptoWallet(req.params.walletId);
      if (!wallet || wallet.userId !== user.id) {
        return res.status(404).json({ error: "Кошелек не найден" });
      }

      if (!wallet.managedByApi) {
        return res.status(400).json({ error: "Переводы доступны только для кошельков созданных через API" });
      }

      const network = await storage.getCryptoNetwork(wallet.networkId);
      if (!network) {
        return res.status(404).json({ error: "Сеть не найдена" });
      }

      const { toAddress, amount, tokenContract } = req.body;
      if (!toAddress || !amount) {
        return res.status(400).json({ error: "toAddress и amount обязательны" });
      }

      const result = await walletApiService.transfer(
        user.id,
        wallet.address,
        toAddress,
        amount,
        network.nodeId,
        tokenContract
      );

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Ошибка перевода" });
      }

      res.json(result.data);
    } catch (error) {
      console.error("Transfer error:", error);
      res.status(500).json({ error: "Ошибка перевода" });
    }
  });

  // Get user's selected networks
  app.get("/api/crypto/user-networks", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const userNetworks = await storage.getUserNetworks(user.id);
      res.json(userNetworks);
    } catch (error) {
      console.error("Get user networks error:", error);
      res.status(500).json({ error: "Ошибка получения сетей пользователя" });
    }
  });

  // Add network to user's list
  app.post("/api/crypto/user-networks", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const { networkId } = req.body;
      if (!networkId) {
        return res.status(400).json({ error: "networkId обязателен" });
      }

      const network = await storage.getCryptoNetwork(networkId);
      if (!network) {
        return res.status(404).json({ error: "Сеть не найдена" });
      }

      const userNetwork = await storage.addUserNetwork({
        userId: user.id,
        networkId
      });
      res.json(userNetwork);
    } catch (error) {
      console.error("Add user network error:", error);
      res.status(500).json({ error: "Ошибка добавления сети" });
    }
  });

  // Remove network from user's list
  app.delete("/api/crypto/user-networks/:networkId", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      await storage.removeUserNetwork(user.id, req.params.networkId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove user network error:", error);
      res.status(500).json({ error: "Ошибка удаления сети" });
    }
  });

  // Delete wallet
  app.delete("/api/crypto/wallets/:walletId", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const wallet = await storage.getCryptoWallet(req.params.walletId);
      if (!wallet || wallet.userId !== user.id) {
        return res.status(404).json({ error: "Кошелек не найден" });
      }

      await storage.deleteCryptoWallet(req.params.walletId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete wallet error:", error);
      res.status(500).json({ error: "Ошибка удаления кошелька" });
    }
  });

  // Update wallet label
  app.patch("/api/crypto/wallets/:walletId", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const wallet = await storage.getCryptoWallet(req.params.walletId);
      if (!wallet || wallet.userId !== user.id) {
        return res.status(404).json({ error: "Кошелек не найден" });
      }

      const { label } = req.body;
      if (!label) {
        return res.status(400).json({ error: "label обязателен" });
      }

      const updated = await storage.updateCryptoWallet(req.params.walletId, { label });
      res.json({
        ...updated,
        encryptedPrivateKey: undefined,
        hasPrivateKey: !!updated?.encryptedPrivateKey
      });
    } catch (error) {
      console.error("Update wallet error:", error);
      res.status(500).json({ error: "Ошибка обновления кошелька" });
    }
  });

  // Get/Set user feature (crypto_wallets)
  app.get("/api/user/features/:featureName", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const feature = await storage.getUserFeature(user.id, req.params.featureName);
      res.json(feature || { featureName: req.params.featureName, isEnabled: false });
    } catch (error) {
      console.error("Get feature error:", error);
      res.status(500).json({ error: "Ошибка получения настройки" });
    }
  });

  app.post("/api/user/features/:featureName", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "enabled должен быть boolean" });
      }

      const featureKey = req.params.featureName as 'crypto_wallets' | 'advanced_notes' | 'premium_themes';
      const feature = await storage.setUserFeature({
        userId: user.id,
        featureKey,
        enabled
      });
      res.json(feature);
    } catch (error) {
      console.error("Set feature error:", error);
      res.status(500).json({ error: "Ошибка обновления настройки" });
    }
  });

  // My Memory Map routes
  app.use("/api/memory-map", memoryMapRoutes);

  // Mini App SSO routes
  const miniAppSsoRouter = createMiniAppSsoRouter({
    storageProvider: storage,
    requireAuth,
    getCurrentUser,
  });
  app.use("/api", miniAppSsoRouter);

  // Serve uploaded files for My Memory Map
  app.use("/uploads/MyMemoryMap", express.static(path.join(process.cwd(), "uploads", "MyMemoryMap")));

  // Serve attached_assets for app screenshots
  app.use("/attached_assets", express.static(path.join(process.cwd(), "attached_assets")));

  // ==================== Widget System API ====================

  // Get all grid presets
  app.get("/api/grid-presets", async (req, res) => {
    try {
      const presets = await storage.getGridPresets();
      res.json(presets);
    } catch (error) {
      console.error("Get presets error:", error);
      res.status(500).json({ error: "Ошибка получения пресетов" });
    }
  });

  // Get single grid preset
  app.get("/api/grid-presets/:id", async (req, res) => {
    try {
      const preset = await storage.getGridPreset(req.params.id);
      if (!preset) {
        return res.status(404).json({ error: "Пресет не найден" });
      }
      res.json(preset);
    } catch (error) {
      console.error("Get preset error:", error);
      res.status(500).json({ error: "Ошибка получения пресета" });
    }
  });

  // Get widgets catalog
  app.get("/api/widgets/catalog", async (req, res) => {
    try {
      const widgets = await storage.getWidgetsCatalog();
      res.json(widgets);
    } catch (error) {
      console.error("Get widgets catalog error:", error);
      res.status(500).json({ error: "Ошибка получения каталога виджетов" });
    }
  });

  // Get user layout
  app.get("/api/layout", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const layout = await storage.getUserWidgetLayout(user.id);
      if (!layout) {
        // Return default layout with default preset
        const presets = await storage.getGridPresets();
        const defaultPreset = presets.find(p => p.isDefault) || presets[0];
        if (defaultPreset) {
          const slots = (defaultPreset.slots as any[]) || [];
          return res.json({
            presetId: defaultPreset.id,
            preset: defaultPreset,
            slotsMapping: slots.map((slot: any) => ({
              slotId: slot.slotId,
              widgetId: null,
              widgetConfig: {}
            }))
          });
        }
        return res.json(null);
      }

      // Include preset info
      const preset = await storage.getGridPreset(layout.presetId);
      res.json({
        ...layout,
        preset
      });
    } catch (error) {
      console.error("Get layout error:", error);
      res.status(500).json({ error: "Ошибка получения раскладки" });
    }
  });

  // Save user layout
  app.put("/api/layout", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const { presetId, slotsMapping } = req.body;
      
      if (!presetId) {
        return res.status(400).json({ error: "presetId обязателен" });
      }

      // Validate preset exists
      const preset = await storage.getGridPreset(presetId);
      if (!preset) {
        return res.status(400).json({ error: "Пресет не найден" });
      }

      // Validate widgets exist
      if (slotsMapping && Array.isArray(slotsMapping)) {
        const catalog = await storage.getWidgetsCatalog();
        const widgetIds = catalog.map(w => w.key);
        
        for (const mapping of slotsMapping) {
          if (mapping.widgetId && !widgetIds.includes(mapping.widgetId)) {
            return res.status(400).json({ error: `Виджет ${mapping.widgetId} не найден в каталоге` });
          }
        }
      }

      const layout = await storage.saveUserWidgetLayout(user.id, {
        presetId,
        slotsMapping: slotsMapping || []
      });

      res.json({
        ...layout,
        preset
      });
    } catch (error) {
      console.error("Save layout error:", error);
      res.status(500).json({ error: "Ошибка сохранения раскладки" });
    }
  });

  // Widget data endpoints
  app.get("/api/widgets/balance", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }
      res.json({
        balance: user.balance || 0,
        currency: "USDT",
        change24h: 0
      });
    } catch (error) {
      res.status(500).json({ error: "Ошибка получения баланса" });
    }
  });

  app.get("/api/widgets/transactions", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }
      // Placeholder - return empty for now
      res.json({ transactions: [], total: 0 });
    } catch (error) {
      res.status(500).json({ error: "Ошибка получения транзакций" });
    }
  });

  app.get("/api/widgets/stats", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }
      
      const [notesCount, tasksCount, goalsCount] = await Promise.all([
        storage.getUserNotesCount(user.id),
        storage.getUserTasksCount(user.id),
        storage.getUserGoalsCount(user.id)
      ]);

      res.json({
        notes: notesCount,
        tasks: tasksCount,
        goals: goalsCount,
        achievements: 0
      });
    } catch (error) {
      res.status(500).json({ error: "Ошибка получения статистики" });
    }
  });

  app.get("/api/widgets/achievements", requireAuth, async (req, res) => {
    try {
      res.json({ achievements: [], total: 0 });
    } catch (error) {
      res.status(500).json({ error: "Ошибка получения достижений" });
    }
  });

  app.get("/api/widgets/news", async (req, res) => {
    try {
      res.json({ news: [], total: 0 });
    } catch (error) {
      res.status(500).json({ error: "Ошибка получения новостей" });
    }
  });

  app.get("/api/widgets/referrals", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }
      res.json({
        totalReferrals: 0,
        activeReferrals: 0,
        earnings: 0
      });
    } catch (error) {
      res.status(500).json({ error: "Ошибка получения рефералов" });
    }
  });

  app.get("/api/widgets/calendar", requireAuth, async (req, res) => {
    try {
      res.json({ events: [], total: 0 });
    } catch (error) {
      res.status(500).json({ error: "Ошибка получения календаря" });
    }
  });

  app.get("/api/widgets/notes", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }
      
      const notes = await storage.getNotesByUser(user.id);
      res.json({
        notes: notes.slice(0, 5),
        total: notes.length
      });
    } catch (error) {
      res.status(500).json({ error: "Ошибка получения заметок" });
    }
  });

  app.get("/api/widgets/tasks", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }
      
      const tasks = await storage.getTasksByUser(user.id);
      res.json({
        tasks: tasks.slice(0, 5),
        total: tasks.length
      });
    } catch (error) {
      res.status(500).json({ error: "Ошибка получения задач" });
    }
  });

  return httpServer;
}
