/**
 * Validation schemas for API requests
 */

import { z } from 'zod';

/**
 * Place search validation
 */
export const placeSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  locationBias: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});

/**
 * Add location to list validation
 */
export const addLocationSchema = z.object({
  placeId: z.string().min(1, 'Place ID is required'),
  category: z.string().optional(),
  userNote: z.string().optional(),
  descriptor: z.string().max(120).optional(),
});

/**
 * Login validation
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Signup validation
 */
export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Process import validation
 */
export const processImportSchema = z.object({
  listTitle: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  templateType: z.string().min(1, 'Template type is required'),
  locations: z.array(z.object({
    name: z.string().min(1),
    address: z.string().optional(),
    comment: z.string().optional(),
  }))
    .min(1, 'At least one location is required')
    .max(500, 'Maximum 500 locations per import. Please split larger files into multiple imports.'),
});

export type PlaceSearchInput = z.infer<typeof placeSearchSchema>;
export type AddLocationInput = z.infer<typeof addLocationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ProcessImportInput = z.infer<typeof processImportSchema>;
