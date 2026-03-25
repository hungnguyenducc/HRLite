import { baseLayout } from './base-layout';
import { escapeHtml } from '../utils';

interface LeaveApprovedData {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  approverName: string;
}

export function leaveApprovedTemplate(data: LeaveApprovedData): string {
  const content = `
    <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">Yêu cầu nghỉ phép đã được duyệt</h2>
    <p style="margin:0 0 24px;color:#374151;line-height:1.6;">
      Xin chào <strong>${escapeHtml(data.employeeName)}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#374151;line-height:1.6;">
      Yêu cầu nghỉ phép của bạn đã được phê duyệt với thông tin sau:
    </p>
    <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;margin-bottom:24px;">
      <tr style="background-color:#f9fafb;">
        <td style="font-weight:600;color:#374151;width:40%;">Loại nghỉ</td>
        <td style="color:#111827;">${escapeHtml(data.leaveType)}</td>
      </tr>
      <tr>
        <td style="font-weight:600;color:#374151;">Từ ngày</td>
        <td style="color:#111827;">${escapeHtml(data.startDate)}</td>
      </tr>
      <tr style="background-color:#f9fafb;">
        <td style="font-weight:600;color:#374151;">Đến ngày</td>
        <td style="color:#111827;">${escapeHtml(data.endDate)}</td>
      </tr>
      <tr>
        <td style="font-weight:600;color:#374151;">Số ngày</td>
        <td style="color:#111827;">${escapeHtml(String(data.days))} ngày</td>
      </tr>
      <tr style="background-color:#f9fafb;">
        <td style="font-weight:600;color:#374151;">Người duyệt</td>
        <td style="color:#111827;">${escapeHtml(data.approverName)}</td>
      </tr>
    </table>
    <div style="padding:16px;background-color:#ecfdf5;border-radius:6px;border-left:4px solid #10b981;">
      <p style="margin:0;color:#065f46;font-size:14px;">
        Yêu cầu nghỉ phép của bạn đã được chấp thuận. Chúc bạn nghỉ ngơi vui vẻ!
      </p>
    </div>`;

  return baseLayout(content);
}
