# Chiến lược kiểm thử — HRLite

## Tổng quan

### Mục tiêu
- Đảm bảo chất lượng code trước khi triển khai
- Phát hiện lỗi sớm trong chu kỳ phát triển
- Duy trì test coverage tối thiểu 70%

## Cấp độ kiểm thử

### 1. Unit Test
- **Phạm vi**: Service layer, utility functions, hooks
- **Công cụ**: Jest, @testing-library/react
- **Coverage mục tiêu**: ≥ 70%
- **Quy tắc đặt tên**: `{filename}.test.ts` hoặc `{filename}.spec.ts`

### 2. Integration Test
- **Phạm vi**: API endpoints, database operations
- **Công cụ**: Jest + Supertest (API), Prisma test utils (DB)
- **Coverage mục tiêu**: API endpoints chính

### 3. E2E Test
- **Phạm vi**: Luồng nghiệp vụ hoàn chỉnh
- **Công cụ**: Chrome MCP (via `/test-run`)
- **Kịch bản**: Tạo bởi `/test-scenario`

## Môi trường kiểm thử

| Môi trường | Database | Mục đích |
|-----------|----------|---------|
| Local | PostgreSQL (Docker) | Phát triển + Unit test |
| CI | PostgreSQL (container) | Integration test |
| Staging | PostgreSQL (staging) | E2E test + UAT |

## Quy tắc đặt tên test

```
describe('{ModuleName}', () => {
  describe('{method/feature}', () => {
    it('nên {hành vi mong đợi} khi {điều kiện}', () => {
      // Arrange - Act - Assert
    });
  });
});
```

## Phạm vi tự động hóa

| Loại | Tự động | Thủ công |
|------|---------|---------|
| Unit Test | ✅ CI/CD | |
| Integration Test | ✅ CI/CD | |
| E2E Test | ✅ `/test-run` | Kiểm tra UX |
| Performance Test | | ✅ Theo yêu cầu |

## Quản lý test case

- Test case theo sprint: `docs/tests/test-cases/sprint-N/`
- Báo cáo test: `docs/tests/test-reports/`
- Mỗi sprint phải có báo cáo coverage đạt được
