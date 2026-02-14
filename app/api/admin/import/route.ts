/**
 * CSV Import API
 * POST /api/admin/import - Import editorial CSV into raw_records
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { normalizeName } from '@/lib/normalize';
import slugify from 'slugify';
import { requireAdmin } from '@/lib/admin-auth';

const prisma = new PrismaClient();

interface CSVRow {
  Name: string;
  Neighborhood: string;
  Category?: string;
  Source?: string;
  SourceURL?: string;
  Address?: string;
  Phone?: string;
  Instagram?: string;
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sourceName =
      (formData.get('source_name') as string) || 'editorial_import';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows found in CSV' },
        { status: 400 }
      );
    }

    const firstRow = rows[0];
    if (!firstRow.Name || !firstRow.Neighborhood) {
      return NextResponse.json(
        { error: 'CSV must have Name and Neighborhood columns' },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const row of rows) {
      try {
        const externalId = `${sourceName}:${slugify(row.Name, {
          lower: true,
          strict: true,
        })}:${slugify(row.Neighborhood, { lower: true, strict: true })}`;

        const existing = await prisma.raw_records.findUnique({
          where: {
            source_name_external_id: {
              source_name: sourceName,
              external_id: externalId,
            },
          },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        await prisma.raw_records.create({
          data: {
            source_name: sourceName,
            external_id: externalId,
            source_url: row.SourceURL || null,
            name_normalized: normalizeName(row.Name),
            lat: null,
            lng: null,
            h3_index_r9: null,
            h3_neighbors_r9: [],
            raw_json: {
              name: row.Name,
              neighborhood: row.Neighborhood,
              category: row.Category ?? null,
              source_publication: row.Source ?? null,
              source_url: row.SourceURL ?? null,
              address: row.Address ?? null,
              phone: row.Phone ?? null,
              instagram_handle: row.Instagram ?? null,
            } as Prisma.InputJsonValue,
            is_processed: false,
          },
        });

        results.imported++;
      } catch (error: any) {
        results.errors.push(`Row "${row.Name}": ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      total_rows: rows.length,
      imported: results.imported,
      skipped: results.skipped,
      errors: results.errors.slice(0, 10),
      message: `Imported ${results.imported} records, skipped ${results.skipped} duplicates`,
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    return NextResponse.json(
      { error: 'Failed to import CSV' },
      { status: 500 }
    );
  }
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const header = parseCSVLine(lines[0]);
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: any = {};
    header.forEach((col, idx) => {
      row[col.trim()] = values[idx]?.trim() || '';
    });

    if (!row.Name) continue;
    rows.push(row as CSVRow);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}