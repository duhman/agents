export function assertMasked(payload: unknown): void {
  const text = JSON.stringify(payload ?? "");
  const patterns = [
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3}[-.\s]?\d{3,4}\b/,
    /\b\d{1,4}\s+[A-Za-zæøåÆØÅ.\- ]+\s+\d{4,5}\b/
  ];
  for (const re of patterns) {
    if (re.test(text)) {
      throw new Error("Unmasked PII detected");
    }
  }
}
