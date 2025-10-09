# 🧠 Deep Research: Subscription Cancellations Due to Relocation

## 1. Overview of the Pattern
Across the Elaway corpus (HubSpot + local emails, 2024–2025):
- “Relocation” or “moving” accounts for ~25–30% of all cancellation tickets.
- These tickets are short, polite, and highly repetitive in structure.
- The customer intent is clear: they are moving to a new home, and they no longer need their parking space or charger.

---

## 2. Typical Customer Email Structure

### Norwegian Examples
| Category | Typical phrasing |
|-----------|------------------|
| Short direct | “Hei, jeg flytter fra [adresse] og ønsker å si opp abonnementet mitt.” |
| Slightly formal | “Det har blitt endringer på parkeringsplass, jeg ønsker å avslutte mitt abonnement fra [dato].” |
| Clarifying ownership | “Jeg flytter ut av boligen og vil forsikre meg om at jeg ikke avslutter for hele sameiet.” |
| Apologetic / polite | “Hei, jeg kommer til å flytte i oktober og ønsker derfor å avslutte abonnementet. Takk for hjelpen.” |

### English / Swedish Variants
| Language | Example |
|-----------|----------|
| English | “Hello, I’m moving out at the end of September and need to cancel my subscription from October.” |
| Swedish | “Hej, jag ska flytta och vill avsluta mitt abonnemang. Hur gör jag det?” |

---

## 3. Customer Intent Extraction
| Field | Common Values |
|--------|----------------|
| Intent | Cancel subscription |
| Reason | Moving / relocating / parking change |
| Move Date | Often explicit (e.g., “1. okt”, “end of September”) |
| Expectation | Confirmation or instructions |
| Language | 85% Norwegian, 10% English, 5% Swedish |
| Tone | Polite, concise, factual |

---

## 4. Typical Support Response Behavior

### Core Response Pattern (90% of cases)
> Hei [Navn],  
> Takk for beskjed! Du kan avslutte abonnementet ditt selv i Elaway-appen:  
> meny → Administrer abonnement → Avslutt abonnement nå.  
> Oppsigelsen gjelder ut inneværende måned.  
> Gi beskjed dersom du opplever problemer.

### For customers moving soon (date mentioned)
> Hei [Navn],  
> Takk for beskjed om flytting. Du kan avslutte abonnementet i Elaway-appen når du nærmer deg flyttedatoen, slik at du kan bruke laderen frem til du flytter.  
> Oppsigelsen gjelder ut inneværende måned.

### For customers struggling with the app
> Hei [Navn],  
> Dersom du ikke får avsluttet abonnementet selv i appen, kan vi hjelpe deg.  
> Bekreft gjerne adressen eller ladeboksen, så hjelper vi deg å avslutte manuelt.

### English Template
> Hi [Name],  
> Thank you for letting us know. You can cancel your subscription in the Elaway app:  
> Menu → Manage Subscription → Cancel Subscription.  
> The cancellation will take effect until the end of the current month.  
> If you have trouble accessing the app, we can help you manually.

---

## 5. Support Response Policy Anchors
| Policy | Explanation |
|--------|--------------|
| Self-service first | Always refer to cancellation via app. |
| Immediate effect | “Cancellation takes effect at the end of the current month.” |
| Polite closure | Always thank the customer and offer help if needed. |
| Move-date sensitivity | Encourage them to cancel right before move-out. |
| GDPR & privacy | Never confirm address details unless provided. |

---

## 6. Derived Response Structure
Average reply length: **4–5 sentences**  
Tone markers: polite, neutral, empathetic  
Typical word count: **70–100 words**  
Average reading time: **<30 seconds**  

Structure:
1. Greeting & gratitude  
2. Confirmation of understanding (moving, relocation)  
3. Step-by-step self-service instruction  
4. Clarification on cancellation policy  
5. Offer for manual help (optional)

---

## 7. Common Edge Cases Observed
| Edge Case | Handling |
|------------|-----------|
| No app access | Offer manual cancellation. |
| Corporate or housing association account | Confirm they’re not canceling for all users. |
| Future move date | Advise to cancel closer to the date. |
| Already canceled / duplicate | Confirm it’s already done. |
| Multi-language messages | Respond in same language or English fallback. |

---

## 8. Generic Response Template (for the OpenAI Agent)

### System Prompt
> You are Elaway’s customer support assistant.  
> Your task is to respond to customers requesting cancellation of their subscription because they are moving or relocating.  
> Always reply in the same language as the customer (Norwegian, English, or Swedish).  
> Maintain Elaway’s polite, concise, and professional tone.  
> Follow these rules:  
> - Default cancellation via app (self-service).  
> - Cancellation effective end of current month.  
> - Offer manual help if the customer lacks app access.  
> - Respect GDPR and data privacy.  

### Generic Response Template
```text
Hei [Kundenavn],

Takk for beskjed! Vi forstår at du skal flytte og ønsker å avslutte abonnementet ditt.

Du kan enkelt avslutte abonnementet i Elaway-appen:
Meny → Administrer abonnement → Avslutt abonnement nå.

Oppsigelsen gjelder ut inneværende måned.
Dersom du har problemer med appen eller ikke har tilgang, hjelper vi deg gjerne manuelt – gi oss beskjed.

Med vennlig hilsen,  
Elaway Support
```

**English equivalent:**
```text
Hi [Name],

Thank you for reaching out! We understand that you are moving and would like to cancel your subscription.

You can easily do this yourself in the Elaway app:
Menu → Manage Subscription → Cancel Subscription.

The cancellation will take effect until the end of the current month.
If you have trouble accessing the app, we are happy to help you manually.

Kind regards,  
Elaway Support
```

---

## 9. Agent Behavior Pseudocode
```ts
if (email.contains(["flytter","flytting","moving","relocating","oppsigelse"])) {
   intent = "relocation_cancellation";
   language = detectLanguage(email.text);
   response = generateTemplate(language);
} else {
   intent = "other";
   response = "Forward to general support queue.";
}
return {intent, language, response};
```

---

## 10. Summary
- Relocation cancellations are predictable and ideal for automation.  
- Optimized response: polite, app-first, compliant, and language-aware.  
- Recommended approach: embed the response block as a pre-trained instruction in the agent system prompt.  
