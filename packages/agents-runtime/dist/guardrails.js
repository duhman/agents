// Guardrails are not yet fully implemented in the current version
// For now, we'll export placeholder functions that can be implemented later
export async function inputGuardrailRequireMaskedPII(input) {
    // naive check: look for '@' and obvious phone patterns
    const hasEmail = /\S+@\S+/.test(input);
    const hasPhone = /\+?\d[\d\s().-]{7,}\d/.test(input);
    if (hasEmail || hasPhone) {
        throw new Error("PII detected in input; must be masked before agent run");
    }
    return input;
}
export async function outputGuardrailRequirePolicy(output) {
    if (!/(end of the month|utgangen av måneden)/i.test(output)) {
        throw new Error("Draft missing required end-of-month policy statement");
    }
    return output;
}
