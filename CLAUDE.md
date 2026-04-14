# Project: HRLite

> Công cụ quản lý nhân sự nội bộ cho một tổ chức

## Ngôn ngữ

- **Ngôn ngữ dự án**: Tiếng Việt (vi)
- Tất cả phản hồi của Claude, tài liệu và nội dung template phải được viết bằng tiếng Việt.
- Các định danh kỹ thuật (tên công cụ, đường dẫn file, tên lệnh, comment trong code) giữ nguyên ngôn ngữ gốc.

## Kiến trúc
- **Monorepo**: Turborepo (npm workspaces)
- **Backend**: NestJS (`apps/backend/`) — port 3001
- **Frontend**: Next.js 15 (`apps/frontend/`) — port 3002, proxy `/api/*` sang backend
- **Database**: PostgreSQL 16 — Prisma ORM (`packages/database/`)
- **Shared**: Types, constants, utils (`packages/shared/`)

### Cấu trúc Monorepo
```
HRLite/
├── apps/
│   ├── frontend/    # Next.js 15 (UI only, proxy API sang backend)
│   └── backend/     # NestJS (REST API, business logic)
├── packages/
│   ├── database/    # @hrlite/database — Prisma schema + client
│   └── shared/      # @hrlite/shared — types, constants, pure utils
└── turbo.json
```

## Các module chính
- Quản lý nhân viên
- Quản lý phòng ban
- Chấm công
- Nghỉ phép
- Báo cáo

## Phương pháp ASTRA

Dự án này tuân theo phương pháp **ASTRA (AI-augmented Sprint Through Rapid Assembly)**.

### Nguyên tắc VIP
| Nguyên tắc | Cốt lõi | Công cụ thực hiện |
|------------|---------|-------------------|
| **V**ibe-driven Development | Không viết code, hãy truyền đạt ý định | `feature-dev`, `frontend-design` |
| **I**nstant Feedback Loop | Rút ngắn chu kỳ phản hồi xuống đơn vị giờ | `chrome-devtools` MCP, `code-review` |
| **P**lugin-powered Quality | Chất lượng được tích hợp trong code | `astra-methodology`, `security-guidance`, `hookify` |

### Chu kỳ Sprint
- Sprint **1 tuần** (tăng trưởng nhỏ, phản hồi nhanh)
- AI xử lý song song phát triển + kiểm thử + review để tăng tính linh hoạt trong chu kỳ ngắn

### Vai trò nhóm
| Vai trò | Phụ trách | Hoạt động chính |
|---------|-----------|-----------------|
| **VA** (Vibe Architect) | Senior Developer 1 người | Quản lý sprint, thiết kế workflow AI, quyết định kiến trúc, đánh giá quality gate |
| **PE** (Prompt Engineer) | Junior Developer 1~2 người | Viết prompt, xác minh kết quả AI, bổ sung tài liệu thiết kế |
| **DE** (Domain Expert) | Người dùng nghiệp vụ 1 người | Truyền đạt yêu cầu, ưu tiên backlog, phản hồi real-time, xác nhận nghiệm thu |
| **DSA** (Design System Architect) | Designer 1 người | Xây dựng design system, kiểm tra UI do AI tạo, quản lý design token |

## Quy trình phát triển

```
[Sprint tính năng]
Viết blueprint → Thiết kế DB → Viết sprint → Triển khai → Kịch bản test → Chạy test → PR/Review
                                                                                          ↓
                                    Merge nhánh chính ← Test người dùng ← Merge staging ←──┘
```

### Tài liệu tham chiếu theo giai đoạn
| Giai đoạn | Đường dẫn tham chiếu | Công cụ chính |
|-----------|---------------------|---------------|
| Lập kế hoạch dịch vụ | `docs/planner/{NNN}-{feature-name}/` | `/service-planner` |
| Design system | `src/styles/design-tokens.css`, `docs/design-system/` | `/frontend-design` |
| Viết blueprint | `docs/blueprints/{NNN}-{feature-name}/` | `/feature-dev` (chưa chỉnh sửa code) |
| Thiết kế DB | `docs/database/database-design.md` | `/feature-dev`, `/lookup-term` |
| Kế hoạch sprint | `docs/sprints/sprint-N/prompt-map.md` | `/sprint-plan` |
| Triển khai | `src/` | `/feature-dev` (dựa trên blueprint + thiết kế DB) |
| Kịch bản test | `docs/tests/test-cases/sprint-N/` | `/test-scenario` |
| Chạy test | `docs/tests/test-reports/` | `/test-run` |
| PR/Review | - | `/pr-merge`, `/code-review` |

## Quality Gates

### Gate 1: WRITE-TIME (Tự động áp dụng — khi viết code)
| Công cụ | Nội dung kiểm tra | Hoạt động |
|---------|-------------------|-----------|
| `security-guidance` | 9 mẫu bảo mật (eval, innerHTML, v.v.) | PreToolUse hook, **chặn** |
| `astra-methodology` | Từ cấm + quy tắc đặt tên | PostToolUse hook, cảnh báo |
| `hookify` | Quy tắc tùy chỉnh dự án | PreToolUse/PostToolUse hook |
| `coding-convention` skill | Convention Java/TS/RN/Python/CSS/SCSS | Tự động phát hiện áp dụng |
| `data-standard` skill | Từ điển thuật ngữ chuẩn dữ liệu công | Tự động phát hiện khi viết DB |
| `code-standard` skill | ISO 3166-1/2, ITU-T E.164 | Tự động phát hiện khi xử lý SĐT/quốc gia/địa chỉ |

### Gate 2: REVIEW-TIME (Khi PR/Review)
| Công cụ | Nội dung kiểm tra |
|---------|-------------------|
| `feature-dev` (code-reviewer tích hợp) | Chất lượng code/bug/convention (3 agent song song) |
| `/code-review` | Tuân thủ CLAUDE.md, bug, phân tích lịch sử (lọc 80+ điểm) |
| `blueprint-reviewer` agent | Kiểm tra chất lượng/tính nhất quán tài liệu thiết kế |
| `test-coverage-analyzer` agent | Phân tích chiến lược test/coverage |
| `convention-validator` agent | Kiểm tra coding convention |

### Gate 2.5: DESIGN-TIME (DSA kiểm tra thiết kế)
| Hạng mục kiểm tra | Phương pháp xác nhận |
|-------------------|---------------------|
| Tuân thủ design token | `chrome-devtools` + `design-token-validator` agent |
| Tính nhất quán component | So sánh theo từng màn hình |
| Layout responsive | Chuyển đổi viewport `chrome-devtools` |
| Kiểm tra accessibility cơ bản | Tương phản màu sắc, focus |

### Gate 3: BRIDGE-TIME (Quality gate cuối cùng khi release)
- `quality-gate-runner` agent chạy tích hợp Gate 1~3
- Bắt buộc 0 vi phạm convention/naming, 0 lỗi console

### Tóm tắt tiêu chí vượt Quality Gate
| Gate | Tiêu chí vượt | Xử lý khi bị chặn |
|------|--------------|-------------------|
| Gate 1 | 0 cảnh báo security-guidance, 0 từ cấm | Sửa ngay và viết lại |
| Gate 2 | 0 issue tin cậy cao code-review, coverage 70%+ | Quyết định fix now / fix later |
| Gate 2.5 | DSA phê duyệt kiểm tra thiết kế | Sửa prompt → Tạo lại → Kiểm tra lại |
| Gate 3 | 0 vi phạm convention/naming, 0 lỗi console | Sửa hàng loạt rồi triển khai |

## Quy tắc viết code
- Tất cả API endpoint bắt buộc có authentication middleware
- DB schema quản lý tập trung tại docs/database/database-design.md (SSoT - Single Source of Truth)
- DB entity tuân thủ từ điển thuật ngữ chuẩn dữ liệu công (dùng `/lookup-term`)
- Tiền tố tên bảng: TB_ (chung), TC_ (mã), TH_ (lịch sử), TL_ (log), TR_ (quan hệ)
- Định dạng phản hồi REST API: `{ success: boolean, data: T, error?: string }`
- Xử lý lỗi: Phân biệt exception nghiệp vụ và exception hệ thống
- Convention viết code theo ngôn ngữ được `coding-convention` skill tự động áp dụng (Java/TypeScript/React Native/Python/CSS/SCSS)
- Dùng `/check-convention src/` để kiểm tra convention thủ công
- **NestJS** (`apps/backend/`): `AllExceptionsFilter` xử lý exception toàn cục, `class-validator` + `ValidationPipe` kiểm tra DTO, Prisma ORM, `FirebaseAuthGuard` + `RolesGuard` global, `ResponseTransformInterceptor` auto-wrap response
- **Next.js** (`apps/frontend/`): App Router mặc định, Server Components ưu tiên, KHÔNG có API routes — tất cả API proxy sang NestJS backend qua `next.config.ts` rewrites

## Quy tắc thiết kế (DSA định nghĩa)
- Design token: Bắt buộc tham chiếu src/styles/design-tokens.css
- Màu sắc bắt buộc dùng CSS Variables (--color-*), cấm hardcode
- Cỡ chữ bắt buộc dùng token scale (--font-size-*)
- Khoảng cách tuân thủ hệ thống grid 8px (--spacing-*)
- Responsive breakpoint: Mobile (~767px), Tablet (768~1023px), Desktop (1024px~)
- Trang preview design system để kiểm tra token/component trực quan
- Tự động kiểm tra bằng `design-token-validator` agent (Gate 2.5)

## Thực hành bị cấm
- Cấm console.log (dùng logger)
- Cấm kiểu any
- Cấm SQL trực tiếp (dùng ORM)
- Cấm commit file .env

## Quy tắc kiểm thử
- Viết unit test cho tất cả service layer
- Tối thiểu test coverage 70%
- Chiến lược test: `docs/tests/test-strategy.md`
- Test case: `docs/tests/test-cases/sprint-N/` (quản lý theo sprint)
- Báo cáo test: `docs/tests/test-reports/` (bao gồm tỷ lệ coverage đạt được)
- Dùng `/test-scenario` tạo kịch bản E2E tự động, `/test-run` chạy test tích hợp Chrome MCP

## Quy ước Commit
- Conventional Commits (feat:, fix:, refactor:, docs:, test:)
- `/commit` — Tạo commit message tự động
- `/commit-push-pr` — Commit + Push + Tạo PR một lần
- `/pr-merge` — Toàn bộ chu trình Commit → PR → Review → Sửa → Merge

## Quy tắc tài liệu thiết kế
- Tài liệu thiết kế theo tính năng tổ chức trong thư mục docs/blueprints/{NNN}-{feature-name}/ (ví dụ: 001-auth/, 002-payment/)
- File chính của mỗi thư mục blueprint là blueprint.md, các file bổ trợ (diagram, API spec, v.v.) đặt cùng thư mục
- Thiết kế DB quản lý tập trung tại docs/database/database-design.md
- Tài liệu thiết kế bắt buộc hoàn thành và phê duyệt trước khi triển khai
- Workflow dựa trên blueprint: Viết blueprint → DE phê duyệt → Phản ánh thiết kế DB → Viết prompt map sprint → Triển khai
- Chất lượng tài liệu thiết kế được kiểm tra bởi `blueprint-reviewer` agent (Gate 2)

## Tham chiếu lệnh nhanh

| Tình huống | Lệnh |
|-----------|------|
| Thiết lập ban đầu dự án | `/project-init` |
| Checklist Sprint 0 | `/project-checklist` |
| Khởi tạo sprint | `/sprint-plan [N]` |
| Thiết kế/triển khai tính năng | `/feature-dev [mô tả]` |
| Tra cứu thuật ngữ chuẩn | `/lookup-term [thuật ngữ tiếng Hàn]` |
| Tra cứu mã quốc tế | `/lookup-code [mã]` |
| Tạo DB entity | `/generate-entity [định nghĩa tiếng Hàn]` |
| Kịch bản test E2E | `/test-scenario` |
| Chạy test tích hợp | `/test-run` |
| Kiểm tra coding convention | `/check-convention [đối tượng]` |
| Kiểm tra naming DB | `/check-naming [đối tượng]` |
| Commit | `/commit` |
| Commit + Push + PR | `/commit-push-pr` |
| Tự động hóa PR→Review→Merge | `/pr-merge` |
| Code review | `/code-review` |
| Slack→Blueprint+Sprint | `/slack-to-sprint [kênh]` |
| Trích xuất backlog Slack | `/slack-backlog [kênh]` |
| Tạo quy tắc hook | `/hookify [mô tả]` |
| Hướng dẫn tham chiếu nhanh | `/astra-guide` |

## Hướng dẫn viết Prompt

5 yếu tố của prompt tốt:

1. **What** (Cái gì): Mô tả rõ ràng tính năng cần tạo
2. **Why** (Tại sao): Mục đích kinh doanh và giá trị cho người dùng
3. **Constraint** (Ràng buộc): Ràng buộc kỹ thuật và yêu cầu hiệu suất
4. **Reference** (Tham chiếu): Đường dẫn tài liệu thiết kế liên quan (docs/blueprints/{NNN}-{feature-name}/, docs/database/)
5. **Acceptance** (Tiêu chí): Điều kiện hoàn thành và phương pháp xác minh

    KHÔNG TỐT: "Tạo tính năng thanh toán cho tôi"

    TỐT:
    /feature-dev "Triển khai module xử lý thanh toán.
    - Hỗ trợ thanh toán thẻ và chuyển khoản
    - Tích hợp với API PG (Toss Payments)
    - Tự động retry tối đa 3 lần khi thanh toán thất bại
    - Tuân theo thiết kế docs/blueprints/003-payment/blueprint.md
    - Tham chiếu DB schema tại docs/database/database-design.md
    - Viết cả unit test và integration test"
