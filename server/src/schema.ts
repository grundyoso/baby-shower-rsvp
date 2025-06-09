
import { z } from 'zod';

// RSVP response enum
export const rsvpResponseEnum = z.enum(['Yes', 'Maybe', 'No']);
export type RsvpResponse = z.infer<typeof rsvpResponseEnum>;

// Device type enum
export const deviceTypeSchema = z.enum(['iPhone', 'Android', 'Other']);
export type DeviceType = z.infer<typeof deviceTypeSchema>;

// RSVP schema
export const rsvpSchema = z.object({
  id: z.number(),
  phone_number: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  response: rsvpResponseEnum,
  comment: z.string().nullable(),
  device_type: deviceTypeSchema.nullable(),
  wallet_pass_id: z.string().nullable(),
  wallet_pass_url: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Rsvp = z.infer<typeof rsvpSchema>;

// Input schema for creating RSVP
export const createRsvpInputSchema = z.object({
  phone_number: z.string().length(10, 'Phone number must be exactly 10 digits').regex(/^\d{10}$/, 'Phone number must contain only digits'),
  first_name: z.string().min(1, 'First name is required').max(50),
  last_name: z.string().min(1, 'Last name is required').max(50),
  response: rsvpResponseEnum,
  comment: z.string().max(500).nullable(),
  recaptcha_token: z.string().min(1, 'reCAPTCHA verification is required'),
  device_type: deviceTypeSchema
});

export type CreateRsvpInput = z.infer<typeof createRsvpInputSchema>;

// Schema for RSVP display (public view)
export const rsvpDisplaySchema = z.object({
  first_name: z.string(),
  last_name_initial: z.string(),
  comment: z.string().nullable()
});

export type RsvpDisplay = z.infer<typeof rsvpDisplaySchema>;

// Wallet pass response schema
export const walletPassResponseSchema = z.object({
  pass_id: z.string(),
  pass_url: z.string(),
  qr_code_url: z.string().optional()
});

export type WalletPassResponse = z.infer<typeof walletPassResponseSchema>;

// Complete RSVP response schema (includes wallet pass if applicable)
export const createRsvpResponseSchema = z.object({
  rsvp: rsvpSchema,
  wallet_pass: walletPassResponseSchema.nullable()
});

export type CreateRsvpResponse = z.infer<typeof createRsvpResponseSchema>;
