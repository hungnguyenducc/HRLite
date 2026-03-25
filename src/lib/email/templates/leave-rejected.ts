import { baseLayout } from './base-layout';
import { escapeHtml } from '../utils';

interface LeaveRejectedData {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  approverName: string;
  reason?: string;
}

export function leaveRejectedTemplate(data: LeaveRejectedData): string {
  const reasonRow = data.reason
    ? `<tr>
        <td style="font-weight:600;color:#374151;">Lý do từ chối</td>
        <td style="color:#111827;">${escapeHtml(data.reason)}</td>
      </tr>`
    : '';

  const content = `
    <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">Yêu cầu nghỉ phép bị từ chối</h2>
    <p style="margin:0 0 24px;color:#374151;line-height:1.6;">
      Xin chào <strong>${escapeHtml(data.employeeName)}</strong>,
    </p>
    <p style="margin:0 0 16px;color:#374151;line-height:1.6;">
      Yêu cầu nghỉ phép của bạn đã bị từ chối với thông tin sau:
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
        <td style="font-weight:600;color:#374151;">Người xử lý</td>
        <td style="color:#111827;">${escapeHtml(data.approverName)}</td>
      </tr>
      ${reasonRow}
    </table>
    <div style="padding:16px;background-color:#fef2f2;border-radius:6px;border-left:4px solid #ef4444;">
      <p style="margin:0;color:#991b1b;font-size:14px;">
        Yêu cầu nghỉ phép của bạn đã bị từ chối. Vui lòng liên hệ quản lý nếu cần thêm thông tin.
      </p>
    </div>`;

  return baseLayout(content);
}
