/**
 * POST /api/settings/departments/sync
 * Reads TMIMATA_apasx from ERP and upserts into local Department table.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isValidDepartmentCode } from '@/lib/departments';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Μη εξουσιοδοτημένος' }, { status: 403 });
  }

  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TMHMA AS code, DESCR AS descr
      FROM [PYLON].[dbo].[TMIMATA_apasx]
      WHERE TMHMA IS NOT NULL AND DESCR IS NOT NULL
      ORDER BY DESCR
    `);

    const erpDepts = (result.recordset as { code: string; descr: string }[]).filter((dept) =>
      isValidDepartmentCode(dept.code)
    );

    const validCodes = new Set(erpDepts.map((dept) => dept.code));

    const existingDepartments = await prisma.department.findMany({ select: { code: true } });
    const staleCodes = existingDepartments
      .map((dept) => dept.code)
      .filter((code) => !validCodes.has(code));

    if (staleCodes.length > 0) {
      await prisma.department.deleteMany({
        where: { code: { in: staleCodes } },
      });
    }

    let added = 0;
    let updated = 0;

    for (const dept of erpDepts) {
      const existing = await prisma.department.findUnique({ where: { code: dept.code } });
      if (!existing) {
        await prisma.department.create({ data: { code: dept.code, descr: dept.descr } });
        added++;
      } else if (existing.descr !== dept.descr) {
        await prisma.department.update({
          where: { code: dept.code },
          data: { descr: dept.descr },
        });
        updated++;
      }
    }

    return NextResponse.json({
      ok: true,
      added,
      updated,
      message: `Προστέθηκαν ${added}, Ενημερώθηκαν ${updated} τμήματα`,
    });
  } catch (err) {
    console.error('[POST /api/settings/departments/sync]', err);
    return NextResponse.json(
      { error: 'Σφάλμα συγχρονισμού από ERP' },
      { status: 500 }
    );
  }
}
