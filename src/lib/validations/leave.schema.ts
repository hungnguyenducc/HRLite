import { z } from 'zod';

export const approvalStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);

// === Leave Type ===

export const createLeaveTypeSchema = z.object({
  lvTypeCd: z
    .string()
    .min(1, { message: 'Mã loại nghỉ không được trống' })
    .max(20, { message: 'Mã loại nghỉ tối đa 20 ký tự' })
    .regex(/^[A-Z_]+$/, { message: 'Mã loại nghỉ chỉ chứa chữ hoa và dấu gạch dưới' }),
  lvTypeNm: z
    .string()
    .min(1, { message: 'Tên loại nghỉ không được trống' })
    .max(50, { message: 'Tên loại nghỉ tối đa 50 ký tự' }),
  maxDays: z
    .number()
    .int({ message: 'Số ngày phải là số nguyên' })
    .positive({ message: 'Số ngày phải lớn hơn 0' })
    .nullable()
    .optional(),
});

export const updateLeaveTypeSchema = z.object({
  lvTypeNm: z.string().min(1).max(50).optional(),
  maxDays: z.number().int().positive().nullable().optional(),
  useYn: z.enum(['Y', 'N']).optional(),
});

// === Leave Request ===

export const createLeaveRequestSchema = z
  .object({
    emplId: z.string().uuid({ message: 'ID nhân viên không hợp lệ' }).optional(),
    lvTypeCd: z.string().min(1, { message: 'Loại nghỉ phép không được trống' }),
    startDt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày bắt đầu phải có format YYYY-MM-DD' }),
    endDt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày kết thúc phải có format YYYY-MM-DD' }),
    rsn: z
      .string()
      .min(1, { message: 'Lý do không được trống' })
      .max(500, { message: 'Lý do tối đa 500 ký tự' }),
  })
  .refine((data) => new Date(data.endDt) >= new Date(data.startDt), {
    message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
    path: ['endDt'],
  });

export const rejectLeaveSchema = z.object({
  reason: z.string().max(500).optional(),
});

// Type exports
export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;
export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
