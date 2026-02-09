// app/lib/cleanText.ts
export function cleanResumeText(raw: string) {
  if (!raw) return '';
  let t = raw.replace(/\r\n/g, '\n');
  t = t.replace(/Page \d+ of \d+/gi, '');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.split('\n').map(l => l.trim()).filter(Boolean).join('\n');
  return t;
}
