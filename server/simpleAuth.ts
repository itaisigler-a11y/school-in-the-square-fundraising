import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import crypto from "crypto";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// Default user configuration for single-user mode
const DEFAULT_USER = {
  id: "test-user-123", // Use existing user ID to avoid conflicts
  email: "admin@schoolinthesquare.org",
  firstName: "School",
  lastName: "Administrator",
  jobTitle: "Administrator",
  profileImageUrl: null,
  role: "administrator" as const,
  permissions: {},
  isActive: true,
  lastLogin: new Date(),
};

export function getSimpleSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const isProduction = process.env.NODE_ENV === 'production';
  
  // CRITICAL SECURITY: Validate SESSION_SECRET in production
  if (isProduction && !process.env.SESSION_SECRET) {
    console.error('❌ CRITICAL SECURITY ERROR: SESSION_SECRET environment variable is required in production!');
    process.exit(1);
  }
  
  if (isProduction && process.env.SESSION_SECRET === 'simple-auth-secret-key-for-single-user') {
    console.error('❌ CRITICAL SECURITY ERROR: Default SESSION_SECRET detected in production! Set a secure SESSION_SECRET.');
    process.exit(1);
  }

  // PERFORMANCE FIX: Use in-memory session store for single-user mode
  // This eliminates 1000+ms database overhead on every request
  const MemoryStore = session.MemoryStore;
  const sessionStore = new MemoryStore();
  
  return session({
    secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret-' + crypto.randomBytes(16).toString('hex'),
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    name: 'simple_auth_sid',
    cookie: {
      httpOnly: true, // Prevent XSS
      secure: isProduction, // HTTPS only in production
      sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
      maxAge: sessionTtl,
    },
    genid: () => {
      // Generate secure session IDs
      return crypto.randomBytes(32).toString('hex');
    },
  });
}

// Ensure default user exists in database
async function ensureDefaultUser(): Promise<User> {
  try {
    // Check if user exists first
    let existingUser = await storage.getUserByEmail(DEFAULT_USER.email);
    
    if (existingUser) {
      // User exists - ensure they have administrator role
      if (existingUser.role !== 'administrator') {
        console.log('🔄 Upgrading existing user to administrator role for single-user mode');
        
        // Direct update to ensure role gets changed
        const upgradedUser = await storage.upsertUser({
          ...existingUser,
          role: 'administrator',
          firstName: DEFAULT_USER.firstName,
          lastName: DEFAULT_USER.lastName,
          jobTitle: DEFAULT_USER.jobTitle,
          permissions: DEFAULT_USER.permissions,
          isActive: true,
          lastLogin: new Date(),
        });
        
        console.log('✅ Upgraded user to administrator role:', upgradedUser.role);
        return upgradedUser;
      } else {
        console.log('✅ User already has administrator role');
        return existingUser;
      }
    } else {
      // Create new user
      const newUser = await storage.upsertUser(DEFAULT_USER);
      console.log('✅ Created new admin user for single-user mode');
      return newUser;
    }
  } catch (error) {
    console.error('❌ Error ensuring default user:', error);
    throw error;
  }
}

// Simple authentication middleware
export const isSimpleAuthenticated: RequestHandler = async (req, res, next) => {
  // SECURITY CHECK: Only enable simplified auth in single-user mode
  const isSingleUserMode = process.env.SINGLE_USER_MODE === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && !isSingleUserMode) {
    console.error('❌ SECURITY ERROR: Single-user authentication should not be used in production without SINGLE_USER_MODE=true');
    return res.status(500).json({ 
      message: "Authentication configuration error"
    });
  }

  // Check if user is already authenticated in session
  if (req.session && (req.session as any).userId) {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (user) {
        // CRITICAL FIX: Ensure user has administrator role in single-user mode
        if (user.role !== 'administrator') {
          console.log('🔄 Upgrading session user to administrator role');
          const upgradedUser = await storage.upsertUser({
            ...user,
            role: 'administrator',
            firstName: DEFAULT_USER.firstName,
            lastName: DEFAULT_USER.lastName,
            jobTitle: DEFAULT_USER.jobTitle,
            permissions: DEFAULT_USER.permissions,
            isActive: true,
            lastLogin: new Date(),
          });
          console.log('✅ Upgraded session user to administrator role:', upgradedUser.role);
          (req as any).user = upgradedUser;
        } else {
          (req as any).user = user;
        }
        return next();
      }
    } catch (error) {
      console.error('Error retrieving user from session:', error);
    }
  }

  // Only auto-authenticate in single-user mode or development
  if (isSingleUserMode || !isProduction) {
    try {
      const defaultUser = await ensureDefaultUser();
      
      // Create session for default user
      if (req.session) {
        (req.session as any).userId = defaultUser.id;
        (req.session as any).save((err: any) => {
          if (err) {
            console.error('Session save error:', err);
          }
        });
      }
      
      // Attach user to request
      (req as any).user = defaultUser;
      return next();
    } catch (error) {
      console.error('Simple authentication failed:', error);
      return res.status(500).json({ 
        message: "Authentication system error",
        error: process.env.NODE_ENV === 'development' ? error : undefined 
      });
    }
  } else {
    return res.status(401).json({ 
      message: "Authentication required"
    });
  }
};

export async function setupSimpleAuth(app: Express) {
  // Configure session middleware
  app.use(getSimpleSession());
  
  // Add simple authentication middleware to all routes that need it
  // Routes will use `isSimpleAuthenticated` instead of the complex OIDC middleware
  
  // Auto-login endpoint - ensures user is authenticated
  app.get("/api/auth/auto-login", async (req, res) => {
    try {
      const defaultUser = await ensureDefaultUser();
      
      // Create/update session
      if (req.session) {
        (req.session as any).userId = defaultUser.id;
        (req.session as any).save((err: any) => {
          if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ message: "Session error" });
          }
          
          res.json({ 
            message: "Auto-login successful",
            user: defaultUser,
            redirectTo: "/"
          });
        });
      } else {
        res.status(500).json({ message: "Session not available" });
      }
    } catch (error) {
      console.error('Auto-login error:', error);
      res.status(500).json({ 
        message: "Auto-login failed",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/user", isSimpleAuthenticated, (req, res) => {
    const user = (req as any).user;
    res.json(user);
  });

  // Update user profile endpoint
  app.patch("/api/auth/user/profile", isSimpleAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const updates = req.body;
      
      const updatedUser = await storage.upsertUser({
        id: userId,
        ...updates,
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ 
        message: "Profile update failed",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Simple logout endpoint
  app.get("/api/logout", (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ message: "Logout error" });
        }
        res.redirect("/");
      });
    } else {
      res.redirect("/");
    }
  });

  // Legacy login endpoint - redirects to auto-login for compatibility
  app.get("/api/login", (req, res) => {
    res.redirect("/api/auth/auto-login");
  });

  console.log('✅ Simple authentication system initialized');
}