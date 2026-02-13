import { Router, Request, Response } from "express";
import { requireAuth, getCurrentUser } from "../../auth";
import { createMarkersService, type MarkersServiceInterface } from "./markers.service";
import { createAccessService, type AccessServiceInterface } from "./access.service";
import { createMediaService, type MediaServiceInterface } from "./media.service";
import { storageFileService, type StorageFileServiceInterface } from "./storage-file.service";
import { insertMemoryMapMarkerSchema } from "@shared/schema";
import { storage, type IStorage } from "../../storage";
import multer from "multer";
import { z } from "zod";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export interface MemoryMapModuleDependencies {
  storageProvider: IStorage;
  fileStorage: StorageFileServiceInterface;
}

export function createMemoryMapRouter(deps: MemoryMapModuleDependencies): Router {
  const router = Router();
  
  const markersService = createMarkersService(deps.storageProvider);
  const accessService = createAccessService(deps.storageProvider);
  const mediaService = createMediaService(deps.storageProvider);
  const fileStorage = deps.fileStorage;

  router.get("/markers", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const ownMarkers = await markersService.getMarkersByOwner(user.id);
      const sharedMarkers = await markersService.getSharedMarkers(user.id);

      const markersWithMedia = await Promise.all(
        [...ownMarkers, ...sharedMarkers].map(async (marker) => {
          const media = await mediaService.getMediaByMarker(marker.id);
          const access = await accessService.getMarkerAccess(marker.id);
          const isOwner = marker.ownerId === user.id;
          return { ...marker, media, sharedWith: access, isOwner };
        })
      );

      res.json(markersWithMedia);
    } catch (error) {
      console.error("Error fetching markers:", error);
      res.status(500).json({ error: "Ошибка получения маркеров" });
    }
  });

  router.get("/markers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const { id } = req.params;
      const canAccess = await markersService.canUserAccessMarker(user.id, id);
      if (!canAccess) {
        return res.status(403).json({ error: "Нет доступа к маркеру" });
      }

      const marker = await markersService.getMarkerById(id);
      if (!marker) {
        return res.status(404).json({ error: "Маркер не найден" });
      }

      const media = await mediaService.getMediaByMarker(id);
      const access = await accessService.getMarkerAccess(id);
      const isOwner = marker.ownerId === user.id;

      res.json({ ...marker, media, sharedWith: access, isOwner });
    } catch (error) {
      console.error("Error fetching marker:", error);
      res.status(500).json({ error: "Ошибка получения маркера" });
    }
  });

  router.post("/markers", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const validatedData = insertMemoryMapMarkerSchema.parse(req.body);
      const marker = await markersService.createMarker(user.id, validatedData);
      res.json(marker);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating marker:", error);
      res.status(500).json({ error: "Ошибка создания маркера" });
    }
  });

  router.put("/markers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const { id } = req.params;
      const canEdit = await markersService.canUserEditMarker(user.id, id);
      if (!canEdit) {
        return res.status(403).json({ error: "Нет прав на редактирование" });
      }

      const validatedData = insertMemoryMapMarkerSchema.partial().parse(req.body);
      const marker = await markersService.updateMarker(id, validatedData);
      if (!marker) {
        return res.status(404).json({ error: "Маркер не найден" });
      }

      res.json(marker);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating marker:", error);
      res.status(500).json({ error: "Ошибка обновления маркера" });
    }
  });

  router.put("/markers/:id/blocks", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const { id } = req.params;
      const canEdit = await markersService.canUserEditMarker(user.id, id);
      if (!canEdit) {
        return res.status(403).json({ error: "Нет прав на редактирование" });
      }

      const { blocks } = req.body;
      const marker = await markersService.updateMarker(id, { blocks });
      if (!marker) {
        return res.status(404).json({ error: "Маркер не найден" });
      }

      res.json(marker);
    } catch (error) {
      console.error("Error updating marker blocks:", error);
      res.status(500).json({ error: "Ошибка обновления блоков" });
    }
  });

  router.delete("/markers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const { id } = req.params;
      const marker = await markersService.getMarkerById(id);
      if (!marker) {
        return res.status(404).json({ error: "Маркер не найден" });
      }

      if (marker.ownerId !== user.id) {
        return res.status(403).json({ error: "Только владелец может удалить маркер" });
      }

      const media = await mediaService.getMediaByMarker(id);
      for (const m of media) {
        if (m.fileId) {
          await fileStorage.deleteFile(m.fileId);
        } else if (m.storagePath) {
          await fileStorage.deleteFileByPath(m.storagePath);
        }
      }

      await markersService.deleteMarker(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting marker:", error);
      res.status(500).json({ error: "Ошибка удаления маркера" });
    }
  });

  router.post("/markers/:id/media", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const { id } = req.params;
      const canEdit = await markersService.canUserEditMarker(user.id, id);
      if (!canEdit) {
        return res.status(403).json({ error: "Нет прав на редактирование" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Файл не загружен" });
      }

      let type: "photo" | "video" | "file" = "photo";
      if (req.body.type === "file") {
        type = "file";
      } else if (req.file.mimetype.startsWith("video/")) {
        type = "video";
      }
      
      const { fileId, filename, storagePath, url } = await fileStorage.saveFile(
        user.id,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        type === "video" ? "photo" : type
      );

      const media = await mediaService.addMedia(id, {
        type,
        filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storagePath,
        url,
        fileId,
      });

      res.json(media);
    } catch (error) {
      console.error("Error uploading media:", error);
      res.status(500).json({ error: "Ошибка загрузки файла" });
    }
  });

  router.delete("/media/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const { id } = req.params;
      
      const media = await mediaService.getMediaById(id);
      if (!media) {
        return res.status(404).json({ error: "Медиа не найдено" });
      }
      
      if (media.fileId) {
        await fileStorage.deleteFile(media.fileId);
      } else if (media.storagePath) {
        await fileStorage.deleteFileByPath(media.storagePath);
      }
      
      await mediaService.deleteMedia(id);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting media:", error);
      res.status(500).json({ error: "Ошибка удаления файла" });
    }
  });

  router.post("/markers/:id/share", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const { id } = req.params;
      const marker = await markersService.getMarkerById(id);
      if (!marker) {
        return res.status(404).json({ error: "Маркер не найден" });
      }

      if (marker.ownerId !== user.id) {
        return res.status(403).json({ error: "Только владелец может управлять доступом" });
      }

      const { login, role = "viewer" } = req.body;
      if (!login) {
        return res.status(400).json({ error: "Логин пользователя обязателен" });
      }

      const targetUser = await accessService.findUserByLogin(login);
      if (!targetUser) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      if (targetUser.id === user.id) {
        return res.status(400).json({ error: "Нельзя поделиться с самим собой" });
      }

      const access = await accessService.grantAccess(id, targetUser.id, role);
      res.json(access);
    } catch (error) {
      console.error("Error sharing marker:", error);
      res.status(500).json({ error: "Ошибка предоставления доступа" });
    }
  });

  router.delete("/markers/:id/share/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      const { id, userId } = req.params;
      const marker = await markersService.getMarkerById(id);
      if (!marker) {
        return res.status(404).json({ error: "Маркер не найден" });
      }

      if (marker.ownerId !== user.id) {
        return res.status(403).json({ error: "Только владелец может управлять доступом" });
      }

      await accessService.revokeAccess(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking access:", error);
      res.status(500).json({ error: "Ошибка отзыва доступа" });
    }
  });

  router.get("/users/search", requireAuth, async (req: Request, res: Response) => {
    try {
      const { login } = req.query;
      if (!login || typeof login !== "string") {
        return res.status(400).json({ error: "Логин обязателен" });
      }

      const targetUser = await accessService.findUserByLogin(login);
      if (!targetUser) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      res.json({ id: targetUser.id, username: targetUser.username });
    } catch (error) {
      console.error("Error searching user:", error);
      res.status(500).json({ error: "Ошибка поиска пользователя" });
    }
  });

  return router;
}

const defaultRouter = createMemoryMapRouter({
  storageProvider: storage,
  fileStorage: storageFileService,
});

export default defaultRouter;
