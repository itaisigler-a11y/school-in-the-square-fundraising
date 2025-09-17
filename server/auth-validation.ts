import { z } from 'zod';

// Zod validation schemas for authentication endpoints
export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  jobTitle: z.string().min(1, 'Job title is required').max(100, 'Job title too long'),
  email: z.string().email('Invalid email address').optional(),
}).strict(); // Prevent additional properties

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
}).strict();

export const userIdSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

// Validation middleware factory
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: 'Validation error',
          errors: result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      req.validatedBody = result.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({ message: 'Validation system error' });
    }
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.safeParse(req.params);
      if (!result.success) {
        return res.status(400).json({
          message: 'Invalid parameters',
          errors: result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      req.validatedParams = result.data;
      next();
    } catch (error) {
      console.error('Parameter validation error:', error);
      res.status(500).json({ message: 'Parameter validation system error' });
    }
  };
}