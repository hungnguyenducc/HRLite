import { sendEmail } from '../send-email';
import { leaveApprovedTemplate } from '../templates/leave-approved';
import { leaveRejectedTemplate } from '../templates/leave-rejected';
import logger from '@/lib/logger';

interface LeaveEmailData {
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  approverName: string;
  reason?: string;
}

export function sendLeaveApprovedEmail(data: LeaveEmailData): void {
  try {
    const html = leaveApprovedTemplate({
      employeeName: data.employeeName,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      days: data.days,
      approverName: data.approverName,
    });

    sendEmail({
      to: data.employeeEmail,
      subject: `[HRLite] Yêu cầu nghỉ phép đã được duyệt — ${data.leaveType}`,
      html,
    }).catch((error) => {
      logger.error('[LeaveEmail] Không gửi được email duyệt nghỉ phép', {
        employeeEmail: data.employeeEmail,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  } catch (error) {
    logger.error('[LeaveEmail] Lỗi tạo template email duyệt nghỉ phép', {
      employeeEmail: data.employeeEmail,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function sendLeaveRejectedEmail(data: LeaveEmailData): void {
  try {
    const html = leaveRejectedTemplate({
      employeeName: data.employeeName,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      days: data.days,
      approverName: data.approverName,
      reason: data.reason,
    });

    sendEmail({
      to: data.employeeEmail,
      subject: `[HRLite] Yêu cầu nghỉ phép bị từ chối — ${data.leaveType}`,
      html,
    }).catch((error) => {
      logger.error('[LeaveEmail] Không gửi được email từ chối nghỉ phép', {
        employeeEmail: data.employeeEmail,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  } catch (error) {
    logger.error('[LeaveEmail] Lỗi tạo template email từ chối nghỉ phép', {
      employeeEmail: data.employeeEmail,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
