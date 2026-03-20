import { z } from 'zod';

// Create department validation
export const createDepartmentSchema = z.object({
  deptCd: z
    .string()
    .min(1, { message: 'Mã phòng ban không được trống' })
    .max(20, { message: 'Mã phòng ban tối đa 20 ký tự' })
    .regex(/^[A-Z0-9-]+$/, {
      message: 'Mã phòng ban chỉ chứa chữ hoa, số và dấu gạch ngang',
    }),
  deptNm: z
    .string()
    .min(1, { message: 'Tên phòng ban không được trống' })
    .max(100, { message: 'Tên phòng ban tối đa 100 ký tự' }),
  upperDeptId: z.string().uuid({ message: 'ID phòng ban cha không hợp lệ' }).nullable().optional(),
  deptHeadId: z.string().uuid({ message: 'ID trưởng phòng không hợp lệ' }).nullable().optional(),
  sortOrd: z.number().int().min(0, { message: 'Thứ tự phải >= 0' }).nullable().optional(),
  useYn: z.enum(['Y', 'N']).default('Y'),
});

// Update department validation (deptCd is immutable)
export const updateDepartmentSchema = createDepartmentSchema.omit({ deptCd: true }).partial();

// Batch sort validation
export const sortDepartmentsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid({ message: 'ID phòng ban không hợp lệ' }),
        sortOrd: z.number().int().min(0),
      }),
    )
    .min(1, { message: 'Danh sách sắp xếp không được trống' }),
});

// Type exports
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type SortDepartmentsInput = z.infer<typeof sortDepartmentsSchema>;
