/** One bullet per line in admin textareas ↔ text[] in DB. */
export function linesToList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function listToLines(items: string[] | null | undefined): string {
  return (items ?? []).join('\n');
}
