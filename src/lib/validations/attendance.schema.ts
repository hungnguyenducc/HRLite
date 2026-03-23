import { z } from 'zod';

export const attendanceStatusEnum = z.enum(['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'HOLIDAY']);

// Create attendance (Admin manual entry)
export const createAttendanceSchema = z
  .object({
    emplId: z.string().uuid({ message: 'ID nhân viên không hợp lệ' }),
    atndDt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày chấm công phải có format YYYY-MM-DD' }),
    chkInTm: z.string().datetime({ message: 'Giờ vào không hợp lệ' }).nullable().optional(),
    chkOutTm: z.string().datetime({ message: 'Giờ ra không hợp lệ' }).nullable().optional(),
    atndSttsCd: attendanceStatusEnum,
    rmk: z.string().max(500, { message: 'Ghi chú tối đa 500 ký tự' }).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.chkInTm && data.chkOutTm) {
        return new Date(data.chkOutTm) > new Date(data.chkInTm);
      }
      return true;
    },
    { message: 'Giờ ra phải sau giờ vào', path: ['chkOutTm'] },
  );

// Update attendance (Admin)
export const updateAttendanceSchema = z
  .object({
    chkInTm: z.string().datetime({ message: 'Giờ vào không hợp lệ' }).nullable().optional(),
    chkOutTm: z.string().datetime({ message: 'Giờ ra không hợp lệ' }).nullable().optional(),
    atndSttsCd: attendanceStatusEnum.optional(),
    rmk: z.string().max(500, { message: 'Ghi chú tối đa 500 ký tự' }).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.chkInTm && data.chkOutTm) {
        return new Date(data.chkOutTm) > new Date(data.chkInTm);
      }
      return true;
    },
    { message: 'Giờ ra phải sau giờ vào', path: ['chkOutTm'] },
  );

// Type exports
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
