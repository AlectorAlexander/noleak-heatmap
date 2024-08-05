import crypto from 'crypto';

export function generateFilename(jsonData: any, relevanceString: string): string {
  const dataString = JSON.stringify(jsonData) + relevanceString;
  return crypto.createHash('md5').update(dataString).digest('hex') + '.png';
}
