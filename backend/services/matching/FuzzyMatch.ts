// /backend/services/matching/FuzzyMatch.ts
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Simple Jaro-Winkler similarity (0..1)
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const s1 = normalizeText(a);
  const s2 = normalizeText(b);
  if (!s1 || !s2) return 0;

  const matchWindow = Math.max(s1.length, s2.length) / 2 - 1;
  const s1Matches: boolean[] = new Array(s1.length).fill(false);
  const s2Matches: boolean[] = new Array(s2.length).fill(false);

  let matches = 0;
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, Math.floor(i - matchWindow));
    const end = Math.min(i + matchWindow + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let t = 0;
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) t++;
    k++;
  }

  const transpositions = t / 2;
  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions) / matches) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  const p = 0.1;
  return jaro + prefix * p * (1 - jaro);
}

export function isFuzzyMatch(companyA: string, roleA: string, companyB: string, roleB: string, threshold = 0.85): boolean {
  const c = jaroWinkler(companyA, companyB);
  const r = jaroWinkler(roleA, roleB);
  const score = (c + r) / 2;
  return score >= threshold;
}
