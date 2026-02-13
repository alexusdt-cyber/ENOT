import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { User } from "@shared/schema";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as User).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user || null);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: "Неверный email или пароль" });
        }

        if (!user.password) {
          return done(null, false, { message: "Этот аккаунт использует другой метод входа" });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: "Неверный email или пароль" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await storage.getUserByGoogleId(profile.id);

          if (!user) {
            const email = profile.emails?.[0]?.value;
            if (email) {
              user = await storage.getUserByEmail(email);
            }

            if (!user) {
              user = await storage.createUser({
                googleId: profile.id,
                email: profile.emails?.[0]?.value,
                displayName: profile.displayName,
                avatarUrl: profile.photos?.[0]?.value,
                authMethod: "google",
              });
            } else {
              user = await storage.updateUser(user.id, {
                googleId: profile.id,
                displayName: profile.displayName,
                avatarUrl: profile.photos?.[0]?.value,
              }) || user;
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebAppData {
  user?: TelegramWebAppUser;
  auth_date: number;
  hash: string;
  query_id?: string;
  chat_instance?: string;
  chat_type?: string;
  start_param?: string;
}

export function verifyTelegramWebApp(initData: string): TelegramWebAppData | null {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not set");
    return null;
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      return null;
    }

    params.delete('hash');
    const dataCheckArr = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`);
    
    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TELEGRAM_BOT_TOKEN).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    if (hmac !== hash) {
      console.error("Telegram WebApp hash mismatch");
      return null;
    }

    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - authDate > 86400) {
      console.error("Telegram WebApp auth_date expired");
      return null;
    }

    const userStr = params.get('user');
    const user = userStr ? JSON.parse(userStr) : undefined;

    return {
      user,
      auth_date: authDate,
      hash,
      query_id: params.get('query_id') || undefined,
      chat_instance: params.get('chat_instance') || undefined,
      chat_type: params.get('chat_type') || undefined,
      start_param: params.get('start_param') || undefined,
    };
  } catch (error) {
    console.error("Error verifying Telegram WebApp data:", error);
    return null;
  }
}

export async function handleTelegramWebAppAuth(data: TelegramWebAppData): Promise<User | null> {
  if (!data.user) {
    return null;
  }

  const telegramId = data.user.id.toString();
  
  let user = await storage.getUserByTelegramId(telegramId);
  
  if (!user) {
    const displayName = data.user.first_name + (data.user.last_name ? ` ${data.user.last_name}` : '');
    user = await storage.createUser({
      telegramId,
      username: data.user.username,
      displayName,
      avatarUrl: data.user.photo_url,
      authMethod: "telegram",
    });
  } else {
    const displayName = data.user.first_name + (data.user.last_name ? ` ${data.user.last_name}` : '');
    user = await storage.updateUser(user.id, {
      displayName,
      avatarUrl: data.user.photo_url,
      username: data.user.username || user.username || undefined,
    }) || user;
  }
  
  return user;
}

export function verifyTelegramAuth(data: TelegramAuthData): boolean {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not set");
    return false;
  }

  const authDate = data.auth_date;
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime - authDate > 86400) {
    return false;
  }

  const { hash, ...dataToCheck } = data;
  
  const dataCheckArr = Object.entries(dataToCheck)
    .filter(([_, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`);
  
  const dataCheckString = dataCheckArr.join('\n');
  
  const secretKey = crypto.createHash('sha256').update(TELEGRAM_BOT_TOKEN).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  return hmac === hash;
}

export async function handleTelegramAuth(data: TelegramAuthData): Promise<User | null> {
  const telegramId = data.id.toString();
  
  let user = await storage.getUserByTelegramId(telegramId);
  
  if (!user) {
    const displayName = data.first_name + (data.last_name ? ` ${data.last_name}` : '');
    user = await storage.createUser({
      telegramId,
      username: data.username,
      displayName,
      avatarUrl: data.photo_url,
      authMethod: "telegram",
    });
  } else {
    const displayName = data.first_name + (data.last_name ? ` ${data.last_name}` : '');
    user = await storage.updateUser(user.id, {
      displayName,
      avatarUrl: data.photo_url,
      username: data.username || user.username || undefined,
    }) || user;
  }
  
  return user;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Требуется авторизация" });
}

export function getCurrentUser(req: Request): User | undefined {
  return req.user as User | undefined;
}

export default passport;
