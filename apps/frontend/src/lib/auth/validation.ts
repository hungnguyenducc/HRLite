import { z } from 'zod';

// Firebase signup validation schema (server-side — receives Firebase ID Token)
export const signupFirebaseSchema = z.object({
  idToken: z.string().min(1, { message: 'ID Token không được để trống' }),
  displayName: z.string().min(1, { message: 'Tên hiển thị không được để trống' }).optional(),
  agreedTermsIds: z.array(z.string().uuid({ message: 'ID điều khoản không hợp lệ' })),
});

// Session creation validation schema
export const sessionSchema = z.object({
  idToken: z.string().min(1, { message: 'ID Token không được để trống' }),
});

// Client-side signup validation (before calling Firebase)
export const signupSchema = z.object({
  email: z.string().email({ message: 'Địa chỉ email không hợp lệ' }),
  password: z
    .string()
    .min(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
    .regex(/[A-Z]/, { message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa' })
    .regex(/[a-z]/, { message: 'Mật khẩu phải chứa ít nhất 1 chữ thường' })
    .regex(/[0-9]/, { message: 'Mật khẩu phải chứa ít nhất 1 chữ số' }),
  displayName: z.string().min(1, { message: 'Tên hiển thị không được để trống' }).optional(),
});

// Client-side login validation
export const loginSchema = z.object({
  email: z.string().email({ message: 'Địa chỉ email không hợp lệ' }),
  password: z.string().min(1, { message: 'Mật khẩu không được để trống' }),
});

// Update profile validation schema
export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, { message: 'Tên hiển thị không được để trống' })
    .nullable()
    .optional(),
  phone: z.string().nullable().optional(),
  photoUrl: z.string().url({ message: 'URL ảnh không hợp lệ' }).nullable().optional(),
});

// Terms agreement validation schema
export const agreeTermsSchema = z.object({
  termsIds: z
    .array(z.string().uuid({ message: 'ID điều khoản không hợp lệ' }))
    .min(1, { message: 'Phải chọn ít nhất một điều khoản' }),
});

// Type exports
export type SignupFirebaseInput = z.infer<typeof signupFirebaseSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AgreeTermsInput = z.infer<typeof agreeTermsSchema>;
