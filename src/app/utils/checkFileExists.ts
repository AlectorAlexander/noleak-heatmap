/* eslint-disable no-undef */
import fs from 'fs';
import path from 'path';

export function checkFileExists(filename: string): boolean {
  return fs.existsSync(path.join(process.cwd(), 'public', 'images', filename));
}
