import { z } from 'zod';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
}

export interface SignUpResult {
  user: UserProfile;
  session: any | null;
}

// Zod schemas for validation
export const loginSchema = z.object({
  email: z.string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export type LoginFormInput = z.infer<typeof loginSchema>;
export type SignUpFormInput = z.infer<typeof signUpSchema>;
