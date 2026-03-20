import prisma from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { successResponse } from '@/lib/api-response';

interface TreeNode {
  id: string;
  deptCd: string;
  deptNm: string;
  deptHeadNm: string | null;
  employeeCount: number;
  sortOrd: number | null;
  useYn: string;
  children: TreeNode[];
}

// Build tree recursively from flat list
function buildTree(
  departments: Array<{
    id: string;
    deptCd: string;
    deptNm: string;
    upperDeptId: string | null;
    deptHead: { emplNm: string } | null;
    sortOrd: number | null;
    useYn: string;
    _count: { employees: number };
  }>,
  parentId: string | null = null,
): TreeNode[] {
  return departments
    .filter((d) => d.upperDeptId === parentId)
    .sort((a, b) => (a.sortOrd ?? 999) - (b.sortOrd ?? 999))
    .map((d) => ({
      id: d.id,
      deptCd: d.deptCd,
      deptNm: d.deptNm,
      deptHeadNm: d.deptHead?.emplNm ?? null,
      employeeCount: d._count.employees,
      sortOrd: d.sortOrd,
      useYn: d.useYn,
      children: buildTree(departments, d.id),
    }));
}

// GET /api/departments/tree - Full organization tree
async function handler(_req: AuthenticatedRequest) {
  try {
    const departments = await prisma.department.findMany({
      where: { delYn: 'N' },
      select: {
        id: true,
        deptCd: true,
        deptNm: true,
        upperDeptId: true,
        deptHead: { select: { emplNm: true } },
        sortOrd: true,
        useYn: true,
        _count: { select: { employees: { where: { delYn: 'N' } } } },
      },
    });

    const tree = buildTree(departments);
    return successResponse(tree);
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withAuth(handler);
