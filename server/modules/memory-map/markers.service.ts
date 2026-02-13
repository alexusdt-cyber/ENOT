import { storage, type IStorage } from "../../storage";
import type { InsertMemoryMapMarker, MemoryMapMarker } from "@shared/schema";

export interface MarkersServiceInterface {
  getMarkersByOwner(ownerId: string): Promise<MemoryMapMarker[]>;
  getSharedMarkers(userId: string): Promise<MemoryMapMarker[]>;
  getMarkerById(id: string): Promise<MemoryMapMarker | null>;
  createMarker(ownerId: string, data: InsertMemoryMapMarker): Promise<MemoryMapMarker>;
  updateMarker(id: string, data: Partial<InsertMemoryMapMarker>): Promise<MemoryMapMarker | null>;
  deleteMarker(id: string): Promise<boolean>;
  canUserAccessMarker(userId: string, markerId: string): Promise<boolean>;
  canUserEditMarker(userId: string, markerId: string): Promise<boolean>;
}

export class MarkersService implements MarkersServiceInterface {
  constructor(private readonly storageProvider: IStorage) {}

  async getMarkersByOwner(ownerId: string): Promise<MemoryMapMarker[]> {
    return this.storageProvider.getMemoryMapMarkersByOwner(ownerId);
  }

  async getSharedMarkers(userId: string): Promise<MemoryMapMarker[]> {
    return this.storageProvider.getSharedMemoryMapMarkers(userId);
  }

  async getMarkerById(id: string): Promise<MemoryMapMarker | null> {
    return this.storageProvider.getMemoryMapMarkerById(id);
  }

  async createMarker(ownerId: string, data: InsertMemoryMapMarker): Promise<MemoryMapMarker> {
    return this.storageProvider.createMemoryMapMarker(ownerId, data);
  }

  async updateMarker(id: string, data: Partial<InsertMemoryMapMarker>): Promise<MemoryMapMarker | null> {
    return this.storageProvider.updateMemoryMapMarker(id, data);
  }

  async deleteMarker(id: string): Promise<boolean> {
    return this.storageProvider.deleteMemoryMapMarker(id);
  }

  async canUserAccessMarker(userId: string, markerId: string): Promise<boolean> {
    const marker = await this.getMarkerById(markerId);
    if (!marker) return false;
    if (marker.ownerId === userId) return true;
    
    const access = await this.storageProvider.getMemoryMapAccessByMarkerAndUser(markerId, userId);
    return !!access;
  }

  async canUserEditMarker(userId: string, markerId: string): Promise<boolean> {
    const marker = await this.getMarkerById(markerId);
    if (!marker) return false;
    if (marker.ownerId === userId) return true;
    
    const access = await this.storageProvider.getMemoryMapAccessByMarkerAndUser(markerId, userId);
    return access?.role === "editor";
  }
}

export function createMarkersService(storageProvider: IStorage): MarkersServiceInterface {
  return new MarkersService(storageProvider);
}

export const markersService = createMarkersService(storage);
