'use client';

import * as React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  keyExtractor?: (row: T, index: number) => string;
}

type SortState = { key: string; direction: 'asc' | 'desc' } | null;

export function DataTable<T>({
  columns,
  data,
  className,
  onSort,
  keyExtractor,
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState<SortState>(null);

  const handleSort = (key: string) => {
    const newDirection = sort?.key === key && sort.direction === 'asc' ? 'desc' : 'asc';
    setSort({ key, direction: newDirection });
    onSort?.(key, newDirection);
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sort?.key !== columnKey) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sort.direction === 'asc' ? (
      <ChevronUp className="h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5" />
    );
  };

  return (
    <>
      {/* Desktop table */}
      <div
        className={cn(
          'hidden md:block overflow-auto rounded-[var(--radius-xl)] border border-[var(--color-border)]',
          className,
        )}
      >
        <table className="w-full border-collapse text-[var(--font-size-sm)]">
          <thead>
            <tr className="bg-[var(--color-bg-secondary)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'text-left px-4 py-3 font-[var(--font-weight-medium)] text-[var(--color-text-secondary)]',
                    'border-b border-[var(--color-border)]',
                    col.sortable &&
                      'cursor-pointer select-none hover:text-[var(--color-text-primary)]',
                    col.className,
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={
                    sort?.key === col.key
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && <SortIcon columnKey={col.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={keyExtractor ? keyExtractor(row, i) : i}
                className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('px-4 py-3 text-[var(--color-text-primary)]', col.className)}
                  >
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-[var(--color-text-tertiary)]"
                >
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className={cn('md:hidden flex flex-col gap-3', className)}>
        {data.map((row, i) => (
          <div
            key={keyExtractor ? keyExtractor(row, i) : i}
            className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4"
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className="flex justify-between py-1.5 border-b border-[var(--color-border)]/50 last:border-b-0"
              >
                <span className="text-[var(--font-size-xs)] font-[var(--font-weight-medium)] text-[var(--color-text-secondary)]">
                  {col.header}
                </span>
                <span className="text-[var(--font-size-sm)] text-[var(--color-text-primary)] text-right">
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </span>
              </div>
            ))}
          </div>
        ))}
        {data.length === 0 && (
          <div className="py-12 text-center text-[var(--color-text-tertiary)] text-[var(--font-size-sm)]">
            Không có dữ liệu
          </div>
        )}
      </div>
    </>
  );
}
