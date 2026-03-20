import { z } from 'zod';

export const employeeStatusEnum = z.enum(['WORKING', 'ON_LEAVE', 'RESIGNED']);

// Create employee validation
export const createEmployeeSchema = z.object({
  emplNm: z
    .string()
    .min(1, { message: 'Họ tên không được trống' })
    .max(100, { message: 'Họ tên tối đa 100 ký tự' }),
  email: z
    .string()
    .email({ message: 'Email không hợp lệ' })
    .max(255, { message: 'Email tối đa 255 ký tự' }),
  phoneNo: z
    .string()
    .regex(/^[0-9+]+$/, { message: 'Số điện thoại chỉ chứa số và dấu +' })
    .min(10, { message: 'Số điện thoại tối thiểu 10 ký tự' })
    .max(20, { message: 'Số điện thoại tối đa 20 ký tự' })
    .nullable()
    .optional(),
  deptId: z.string().uuid({ message: 'ID phòng ban không hợp lệ' }).nullable().optional(),
  posiNm: z
    .string()
    .max(50, { message: 'Chức vụ tối đa 50 ký tự' })
    .nullable()
    .optional(),
  joinDt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày vào làm phải có format YYYY-MM-DD' }),
  resignDt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày nghỉ việc phải có format YYYY-MM-DD' })
    .nullable()
    .optional(),
  emplSttsCd: employeeStatusEnum.default('WORKING'),
  userId: z.string().uuid({ message: 'ID tài khoản không hợp lệ' }).nullable().optional(),
});

// Update employee validation — email/emplNm must not be empty string if provided
export const updateEmployeeSchema = createEmployeeSchema
  .extend({
    emplNm: createEmployeeSchema.shape.emplNm.optional(),
    email: createEmployeeSchema.shape.email.optional(),
  })
  .partial();

// Link user validation
export const linkUserSchema = z.object({
  userId: z.string().uuid({ message: 'ID tài khoản không hợp lệ' }).nullable(),
});

// Type exports
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type LinkUserInput = z.infer<typeof linkUserSchema>;
