const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/;
const ADDRESS_RE = /\b\d{1,4}\s+\w+\s+(Street|St|Road|Rd|Ave|Avenue|Gate|Gata)\b/i;

export function assertMasked(obj: unknown) {
  const s = JSON.stringify(obj);
  if (EMAIL_RE.test(s) || PHONE_RE.test(s) || ADDRESS_RE.test(s)) {
    throw new Error("Unmasked PII detected in response payload");
  }
}
