import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { IStorage } from "../../storage";
import type { DbFile, Folder } from "@shared/schema";

const SYSTEM_FOLDER_NAME = "MyMemoryMap";
const SYSTEM_FOLDER_COLOR = "#10B981";

export interface StorageFileServiceInterface {
  saveFile(
    userId: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    type: "photo" | "file"
  ): Promise<{ fileId: string; filename: string; storagePath: string; url: string }>;
  deleteFile(fileId: string): Promise<boolean>;
  deleteFileByPath(storagePath: string): Promise<boolean>;
  getFilePath(storagePath: string): string;
  getOrCreateSystemFolder(userId: string): Promise<Folder>;
}

export function createStorageFileService(storage: IStorage): StorageFileServiceInterface {
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

  const getOrCreateSystemFolder = async (userId: string): Promise<Folder> => {
    const folders = await storage.getFolders(userId);
    let systemFolder = folders.find(f => f.name === SYSTEM_FOLDER_NAME);
    
    if (!systemFolder) {
      systemFolder = await storage.createFolder({
        userId,
        name: SYSTEM_FOLDER_NAME,
        color: SYSTEM_FOLDER_COLOR,
      });
      
      const folderPath = path.join(process.cwd(), "uploads", userId, "files", systemFolder.id);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
    }
    
    return systemFolder;
  };

  const saveFile = async (
    userId: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    type: "photo" | "file"
  ): Promise<{ fileId: string; filename: string; storagePath: string; url: string }> => {
    const folder = await getOrCreateSystemFolder(userId);
    
    const ext = path.extname(originalName);
    const hash = crypto.randomBytes(16).toString("hex");
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${uniqueSuffix}-${safeName}`;
    
    const relativePath = `uploads/${userId}/files/${folder.id}/${filename}`;
    const fullPath = path.join(process.cwd(), relativePath);
    const url = `/uploads/${userId}/files/${folder.id}/${filename}`;
    
    const folderPath = path.dirname(fullPath);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    await fs.promises.writeFile(fullPath, buffer);
    
    const fileType = getFileType(mimeType, originalName);
    
    const dbFile = await storage.createFile({
      userId,
      folderId: folder.id,
      name: filename,
      originalName,
      mimeType,
      size: buffer.length,
      fileType,
      path: relativePath,
      url,
    });
    
    return {
      fileId: dbFile.id,
      filename,
      storagePath: relativePath,
      url,
    };
  };

  const deleteFile = async (fileId: string): Promise<boolean> => {
    try {
      const file = await storage.getFile(fileId);
      if (!file) return false;
      
      const fullPath = path.join(process.cwd(), file.path);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
      
      await storage.deleteFile(fileId);
      return true;
    } catch {
      return false;
    }
  };

  const deleteFileByPath = async (storagePath: string): Promise<boolean> => {
    try {
      const fullPath = path.join(process.cwd(), storagePath);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const getFilePath = (storagePath: string): string => {
    return path.join(process.cwd(), storagePath);
  };

  return {
    saveFile,
    deleteFile,
    deleteFileByPath,
    getFilePath,
    getOrCreateSystemFolder,
  };
}

import { storage } from "../../storage";
export const storageFileService = createStorageFileService(storage);
