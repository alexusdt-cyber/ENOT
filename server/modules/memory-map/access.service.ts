import { storage, type IStorage } from "../../storage";
import type { MemoryMapAccess } from "@shared/schema";

export interface AccessServiceInterface {
  getMarkerAccess(markerId: string): Promise<MemoryMapAccess[]>;
  grantAccess(markerId: string, userId: string, role: "viewer" | "editor"): Promise<MemoryMapAccess>;
  revokeAccess(markerId: string, userId: string): Promise<boolean>;
  updateAccess(markerId: string, userId: string, role: "viewer" | "editor"): Promise<MemoryMapAccess | null>;
  findUserByLogin(login: string): Promise<{ id: string; username: string | null } | null>;
}

export class AccessService implements AccessServiceInterface {
  constructor(private readonly storageProvider: IStorage) {}

  async getMarkerAccess(markerId: string): Promise<MemoryMapAccess[]> {
    return this.storageProvider.getMemoryMapAccessByMarker(markerId);
  }

  async grantAccess(markerId: string, userId: string, role: "viewer" | "editor"): Promise<MemoryMapAccess> {
    return this.storageProvider.createMemoryMapAccess(markerId, userId, role);
  }

  async revokeAccess(markerId: string, userId: string): Promise<boolean> {
    return this.storageProvider.deleteMemoryMapAccess(markerId, userId);
  }

  async updateAccess(markerId: string, userId: string, role: "viewer" | "editor"): Promise<MemoryMapAccess | null> {
    return this.storageProvider.updateMemoryMapAccess(markerId, userId, role);
  }

  async findUserByLogin(login: string): Promise<{ id: string; username: string | null } | null> {
    return this.storageProvider.getUserByUsername(login);
  }
}

export function createAccessService(storageProvider: IStorage): AccessServiceInterface {
  return new AccessService(storageProvider);
}

export const accessService = createAccessService(storage);
