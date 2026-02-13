import { storage, type IStorage } from "../../storage";
import type { InsertMemoryMapMedia, MemoryMapMedia } from "@shared/schema";

export interface MediaServiceInterface {
  getMediaByMarker(markerId: string): Promise<MemoryMapMedia[]>;
  getMediaById(id: string): Promise<MemoryMapMedia | null>;
  addMedia(markerId: string, data: Omit<InsertMemoryMapMedia, "markerId">): Promise<MemoryMapMedia>;
  deleteMedia(id: string): Promise<boolean>;
  reorderMedia(markerId: string, mediaIds: string[]): Promise<boolean>;
}

export class MediaService implements MediaServiceInterface {
  constructor(private readonly storageProvider: IStorage) {}

  async getMediaByMarker(markerId: string): Promise<MemoryMapMedia[]> {
    return this.storageProvider.getMemoryMapMediaByMarker(markerId);
  }

  async getMediaById(id: string): Promise<MemoryMapMedia | null> {
    return this.storageProvider.getMemoryMapMediaById(id);
  }

  async addMedia(markerId: string, data: Omit<InsertMemoryMapMedia, "markerId">): Promise<MemoryMapMedia> {
    return this.storageProvider.createMemoryMapMedia(markerId, data);
  }

  async deleteMedia(id: string): Promise<boolean> {
    return this.storageProvider.deleteMemoryMapMedia(id);
  }

  async reorderMedia(markerId: string, mediaIds: string[]): Promise<boolean> {
    return this.storageProvider.reorderMemoryMapMedia(markerId, mediaIds);
  }
}

export function createMediaService(storageProvider: IStorage): MediaServiceInterface {
  return new MediaService(storageProvider);
}

export const mediaService = createMediaService(storage);
