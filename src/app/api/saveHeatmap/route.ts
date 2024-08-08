/* eslint-disable no-undef */
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const { imageData, ImageName } = await req.json();

  if (!imageData) {
    return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
  }

  const buffer = Buffer.from(imageData.split(',')[1], 'base64');
  const filePath = path.join(process.cwd(), 'public', `${ImageName}.png`);

  try {
    fs.writeFileSync(filePath, buffer);
    return NextResponse.json({ message: 'Image saved successfully' });
  } catch (err) {
    console.error('Error saving image:', err);
    return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ImageName = searchParams.get('ImageName');

  if (!ImageName) {
    return NextResponse.json({ error: 'No image name provided' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'public', `${ImageName}.png`);

  try {
    if (fs.existsSync(filePath)) {
      return NextResponse.json({ exists: true });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (err) {
    console.error('Error checking image existence:', err);
    return NextResponse.json({ error: 'Failed to check image' }, { status: 500 });
  }
}
