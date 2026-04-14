interface FirebaseErrorLike {
  code?: string;
  message?: string;
}

export function mapFirebaseError(error: unknown): string {
  const firebaseError = error as FirebaseErrorLike;
  const code = firebaseError?.code ?? '';

  switch (code) {
    // Sign In
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email hoặc mật khẩu không đúng';
    case 'auth/user-disabled':
      return 'Tài khoản đã bị vô hiệu hóa';
    case 'auth/too-many-requests':
      return 'Quá nhiều lần thử. Vui lòng thử lại sau';

    // Sign Up
    case 'auth/email-already-in-use':
      return 'Email đã được sử dụng';
    case 'auth/weak-password':
      return 'Mật khẩu quá yếu. Tối thiểu 6 ký tự';
    case 'auth/invalid-email':
      return 'Email không hợp lệ';

    // Google Sign-In
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Đăng nhập bị hủy';
    case 'auth/popup-blocked':
      return 'Cửa sổ popup bị chặn. Vui lòng cho phép popup và thử lại';
    case 'auth/account-exists-with-different-credential':
      return 'Email đã được đăng ký bằng phương thức khác';
    case 'auth/unauthorized-domain':
      return 'Domain chưa được ủy quyền. Kiểm tra Authorized Domains trong Firebase Console';
    case 'auth/operation-not-allowed':
      return 'Phương thức đăng nhập này chưa được bật trong Firebase Console';
    case 'auth/internal-error':
      return 'Lỗi hệ thống xác thực. Vui lòng thử lại sau';

    // Password Reset
    case 'auth/invalid-action-code':
      return 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn';
    case 'auth/expired-action-code':
      return 'Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng gửi lại';

    // Session
    case 'auth/session-cookie-expired':
      return 'Phiên đăng nhập hết hạn';
    case 'auth/session-cookie-revoked':
      return 'Phiên đăng nhập đã bị thu hồi';

    default:
      return firebaseError?.message ?? 'Đã xảy ra lỗi xác thực';
  }
}
