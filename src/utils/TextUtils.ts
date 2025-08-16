export function normalizeText(t: string) {
  return t.toLowerCase().replace(/\s+/g, ' ').replace(/[.,!?;]/g, '').trim();
}
export function similarity(a: string, b: string) {
  const s1 = new Set(a.split('')); const s2 = new Set(b.split(''));
  const inter = new Set([...s1].filter(x => s2.has(x)));
  const uni = new Set([...s1, ...s2]);
  return inter.size / uni.size;
}
export function flexibleMatch(text: string, keywords: string[]) {
  const n = normalizeText(text);
  return keywords.some(k => {
    const nk = normalizeText(k);
    return n.includes(nk) || nk.includes(n) ||
      (Math.abs(n.length - nk.length) <= 2 && similarity(n, nk) > 0.7);
  });
}
