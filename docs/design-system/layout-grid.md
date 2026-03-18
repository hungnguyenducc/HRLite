# Hệ thống Layout Grid — HRLite

## Hệ thống Grid

### Hệ thống cột
- **Desktop** (≥1024px): Grid 12 cột, gutter 24px, margin 32px
- **Tablet** (768px~1023px): Grid 8 cột, gutter 16px, margin 24px
- **Mobile** (≤767px): Grid 4 cột, gutter 16px, margin 16px

### Container
| Breakpoint | Max-width | Padding |
|-----------|-----------|---------|
| Mobile | 100% | 16px |
| Tablet | 100% | 24px |
| Desktop | 1280px | 32px |

## Responsive Breakpoint

```css
/* Mobile First Approach */
/* Mặc định: Mobile (≤767px) */

/* Tablet */
@media (min-width: 768px) { /* ... */ }

/* Desktop */
@media (min-width: 1024px) { /* ... */ }

/* Large Desktop */
@media (min-width: 1280px) { /* ... */ }
```

## Layout chính

### Sidebar Layout (Desktop)
```
┌──────────────────────────────────────────────┐
│ Header (h: 64px, fixed top)                  │
├────────────┬─────────────────────────────────┤
│ Sidebar    │ Main Content                     │
│ (w: 256px) │ (flex: 1)                       │
│ Thu gọn:   │                                  │
│ (w: 64px)  │                                  │
│            │                                  │
│            │                                  │
└────────────┴─────────────────────────────────┘
```

### Sidebar Layout (Mobile)
```
┌──────────────────────┐
│ Header (h: 56px)     │
│ [☰] HRLite          │
├──────────────────────┤
│ Main Content          │
│ (full width)          │
│                       │
│                       │
│                       │
└──────────────────────┘
Sidebar → Drawer (overlay)
```

## Hệ thống Spacing

Tuân thủ grid 8px. Tất cả spacing sử dụng design token:

| Token | Giá trị | Sử dụng |
|-------|---------|---------|
| --spacing-1 | 4px | Khoảng cách inline nhỏ |
| --spacing-2 | 8px | Khoảng cách giữa các phần tử liên quan |
| --spacing-3 | 12px | Padding trong component nhỏ |
| --spacing-4 | 16px | Padding component, gap chuẩn |
| --spacing-6 | 24px | Khoảng cách giữa các section nhỏ |
| --spacing-8 | 32px | Khoảng cách giữa các section lớn |
| --spacing-12 | 48px | Margin giữa các block lớn |
| --spacing-16 | 64px | Padding page |
