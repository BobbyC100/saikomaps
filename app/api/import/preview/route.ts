import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import Papa from 'papaparse';

// Allow up to 60s for parsing large CSVs (Vercel default is 10s)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Read the uploaded file
    const filePath = path.join(process.cwd(), 'uploads', `${fileId}.csv`);
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Uploaded file not found. The file may have expired. Please upload again.' },
        { status: 404 }
      );
    }
    const fileContent = await readFile(filePath, 'utf-8');

    // Parse CSV
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'Failed to parse CSV', details: parseResult.errors },
        { status: 400 }
      );
    }

    const locations = parseResult.data;
    
    // Basic validation
    const validLocations = locations.filter((loc: any) => {
      return loc.Title && loc.Title.trim() !== '';
    });

    const invalidCount = locations.length - validLocations.length;

    // Return parse result
    return NextResponse.json({
      totalRows: locations.length,
      validRows: validLocations.length,
      invalidRows: invalidCount,
      locations: validLocations.slice(0, 100), // Return first 100 for preview
      message: `Parsed ${validLocations.length} valid locations`,
    });

  } catch (error) {
    console.error('Parse error:', error);
    const isNodeError = error instanceof Error && 'code' in error;
    const isEnv = isNodeError && (error as NodeJS.ErrnoException).code === 'ENOENT';
    const message = isEnv
      ? 'Uploaded file not found. Please upload again.'
      : (error instanceof Error ? error.message : 'Failed to parse CSV file');
    return NextResponse.json(
      { error: message },
      { status: isEnv ? 404 : 500 }
    );
  }
}
