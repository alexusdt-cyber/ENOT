import crypto from "crypto";
import jwt from "jsonwebtoken";
import { IStorage } from "../../storage";
import type { App } from "@shared/schema";

const JWT_SECRET = process.env.HOST_TICKET_SECRET || process.env.SESSION_SECRET || "dev-secret-change-me";
const TICKET_TTL_SECONDS = 60;
const SESSION_TTL_MINUTES = 30;

export interface SsoServiceInterface {
  generateSessionNonce(): string;
  createSession(userId: string, appId: string, appOrigin: string): Promise<{ sessionNonce: string; expiresAt: Date }>;
  validateSession(sessionNonce: string): Promise<{ userId: string; appId: string; appOrigin: string } | null>;
  generateTicket(userId: string, appId: string, app: App): Promise<{ ticket: string; jti: string; expiresIn: number }>;
  introspectTicket(ticket: string, appId: string): Promise<{ valid: boolean; reason?: string; sub?: string; scopes?: string[]; appOrigin?: string }>;
  markTicketUsed(jti: string): Promise<boolean>;
}

export class SsoService implements SsoServiceInterface {
  constructor(private readonly storage: IStorage) {}

  generateSessionNonce(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  async createSession(userId: string, appId: string, appOrigin: string): Promise<{ sessionNonce: string; expiresAt: Date }> {
    const sessionNonce = this.generateSessionNonce();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000);
    
    await this.storage.createMiniAppSession(userId, appId, sessionNonce, appOrigin, expiresAt);
    
    return { sessionNonce, expiresAt };
  }

  async validateSession(sessionNonce: string): Promise<{ userId: string; appId: string; appOrigin: string } | null> {
    const session = await this.storage.getMiniAppSession(sessionNonce);
    if (!session) return null;
    
    return { userId: session.userId, appId: session.appId, appOrigin: session.appOrigin };
  }

  async generateTicket(userId: string, appId: string, app: App): Promise<{ ticket: string; jti: string; expiresIn: number }> {
    const jti = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const exp = now + TICKET_TTL_SECONDS;

    const payload = {
      iss: process.env.HOST_URL || "https://host.local",
      sub: userId,
      aud: appId,
      iat: now,
      exp,
      jti,
      scopes: app.scopes || [],
      appOrigin: app.origin || "",
    };

    const ticket = jwt.sign(payload, JWT_SECRET, { algorithm: "HS256" });
    
    await this.storage.createSsoTicket(jti, userId, appId, new Date(exp * 1000));

    return { ticket, jti, expiresIn: TICKET_TTL_SECONDS };
  }

  async introspectTicket(ticket: string, appId: string): Promise<{ valid: boolean; reason?: string; sub?: string; scopes?: string[]; appOrigin?: string }> {
    try {
      const decoded = jwt.verify(ticket, JWT_SECRET, { 
        algorithms: ["HS256"],
        audience: appId,
      }) as any;

      const existingTicket = await this.storage.getSsoTicket(decoded.jti);
      if (!existingTicket) {
        return { valid: false, reason: "Ticket not found" };
      }

      if (existingTicket.used) {
        return { valid: false, reason: "Ticket already used" };
      }

      const markedUsed = await this.storage.markSsoTicketUsed(decoded.jti);
      if (!markedUsed) {
        return { valid: false, reason: "Failed to mark ticket as used (concurrent use)" };
      }

      return {
        valid: true,
        sub: decoded.sub,
        scopes: decoded.scopes,
        appOrigin: decoded.appOrigin,
      };
    } catch (e: any) {
      if (e.name === "TokenExpiredError") {
        return { valid: false, reason: "Ticket expired" };
      }
      if (e.name === "JsonWebTokenError") {
        return { valid: false, reason: e.message };
      }
      return { valid: false, reason: "Invalid ticket" };
    }
  }

  async markTicketUsed(jti: string): Promise<boolean> {
    return this.storage.markSsoTicketUsed(jti);
  }
}

export function createSsoService(storage: IStorage): SsoServiceInterface {
  return new SsoService(storage);
}
