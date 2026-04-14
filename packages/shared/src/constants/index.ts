export const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export const EMPLOYEE_STATUS = {
  WORKING: 'WORKING',
  ON_LEAVE: 'ON_LEAVE',
  RESIGNED: 'RESIGNED',
} as const;

export const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  LATE: 'LATE',
  HALF_DAY: 'HALF_DAY',
  ABSENT: 'ABSENT',
  HOLIDAY: 'HOLIDAY',
} as const;

export const LEAVE_APPROVAL_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export const DEL_YN = {
  YES: 'Y',
  NO: 'N',
} as const;
