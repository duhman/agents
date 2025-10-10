export function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}
export function equal(a: any, b: any, message: string) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(b)}\nReceived: ${JSON.stringify(a)}`);
  }
}
