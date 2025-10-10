import { assertMasked } from "../pages/api/operator/_sanitizer.js";
import { assert } from "./assert.js";

const samples = [
  "Contact me at john.doe@example.com",
  "Call me at +47 912 34 567",
  "My address is 123 Main St, Oslo",
];

let threw = 0;
for (const s of samples) {
  try {
    assertMasked(s);
  } catch {
    threw++;
  }
}
assert(threw === samples.length, `assertMasked should throw on unmasked PII. Threw=${threw}, expected=${samples.length}`);

console.log("sanitizer.test.ts passed");

assertMasked({ text: "contact me at user [at] example [dot] com" });
assertMasked([{ msg: "Masked email: u***@e***.com" }]);
console.log("sanitizer additional denylist cases passed");
