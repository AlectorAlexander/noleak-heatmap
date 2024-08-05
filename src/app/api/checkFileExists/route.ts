/* eslint-disable no-undef */
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    console.log('Filename is required but not provided');
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'public', 'images', filename);
  const fileExists = fs.existsSync(filePath);

  if (fileExists) {
    console.log(`File exists: ${filePath}`);
  } else {
    console.log(`File does not exist: ${filePath}`);
  }

  return NextResponse.json({ exists: fileExists });
}
