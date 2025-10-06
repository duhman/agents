# 📄 Product Requirements Document (PRD)

**Project:** Subscription Cancellation Email Automation

## 1. Background & Context

Elaway receives a high volume of customer emails requesting to **cancel subscriptions**, often due to **moving/relocating**.

- Current process:
  - Customers send short emails (“I am moving, please cancel”).
  - Support agents manually reply with standard instructions (“cancel via app” or confirm cancellation).
  - Average **first response time** is ~51 hours, with technical/billing cancellations often taking longer.
- Problem: This creates **slow resolution times, inconsistent replies, and high agent workload**, despite most requests being repetitive and templated.

---

## 2. Goals & Objectives

**Primary Goal:** Automate handling of subscription cancellation requests (starting with relocation-related cancellations).

**Objectives:**

1. Build an **LLM-based agent** that classifies incoming emails as cancellation requests (esp. moving-related).
2. Generate draft responses in Norwegian/English that are:
   - Accurate (policy-aligned: cancellation effective end-of-month, via app, etc.)
   - Polite, consistent, and branded in tone.
3. Deploy a **Human-in-the-Middle workflow**:
   - Drafts go to Slack for support agent review.
   - Agents approve, reject, or edit responses.
4. Establish a **feedback loop**:
   - Store pairs of (customer email → agent draft → final human reply).
   - Use this dataset for **fine-tuning** to improve model accuracy over time.
5. Scale to **full automation** for high-confidence cases, while retaining human review for edge cases.

---

## 3. Success Metrics (KPIs)

- **Efficiency:** Reduce average first response time for cancellations from ~51h → **<15 minutes** (auto-draft).
- **Deflection:** ≥70% of cancellation tickets handled by the agent without human edits after fine-tuning.
- **Accuracy:** ≥95% correctness on policy compliance (date handling, notice period).
- **CSAT:** Maintain or improve customer satisfaction ratings for cancellation-related tickets.
- **Adoption:** ≥90% of support team trust/approve the Slack review workflow.

---

## 4. Scope

### In-Scope (Phase 1–2)

- Email ingestion from HubSpot / shared inbox.
- LLM agent classification: cancellation vs. other inquiries.
- Drafting responses for cancellation due to moving/relocation.
- Slack integration:
  - Post draft with approve/reject/edit buttons.
  - Route human-approved reply back to customer.
- Feedback loop database.
- Iterative fine-tuning on curated dataset.

### Out-of-Scope (Future Phases)

- Non-cancellation issues (technical troubleshooting, billing disputes).
- Multilingual handling beyond NO/EN.
- Full automation of all support workflows.

---

## 5. User Stories

### Customer Support Agent

- _As a support agent_, I want to see AI-generated draft replies in Slack, so I can quickly approve or edit them.
- _As a support agent_, I want to flag incorrect drafts, so the system can improve over time.

### Team Lead

- _As a team lead_, I want to measure accuracy and adoption of the agent, so I can decide when to expand automation scope.

### Customer

- _As a customer_, I want fast, consistent replies to my cancellation requests, so I feel confident my subscription is correctly handled.

---

## 6. Functional Requirements

### Email Classification

- Detect cancellation intent.
- Detect reason = “moving/relocating.”
- Extract key fields: move date, subscription details (if mentioned).

### Response Drafting

- Generate polite, branded email in Norwegian (or English fallback).
- Insert self-service instructions (cancel via app).
- Include end-of-month cancellation policy.

### Slack Workflow

- Slack message includes:
  - Original email text.
  - Draft reply.
  - Confidence score.
  - Buttons: **Approve**, **Reject**, **Edit**.
- Approve → auto-send via email API.
- Reject/Edit → send human version to customer + log both versions.

### Feedback Loop

- Store each case with fields:
  - Ticket ID, Customer Email, Draft Reply, Human Final Reply, Decision.
- Mark as positive (approve) or negative (reject/edit).
- Export dataset regularly for fine-tuning.

### Fine-Tuning

- Prepare JSONL dataset:
  - `{"messages":[{"role":"user","content":"[customer email]"},{"role":"assistant","content":"[final approved reply]"}]}`
- Train model using OpenAI fine-tuning API.
- Periodically retrain with new data (monthly).

---

## 7. Technical Architecture

**Flow:**

1. **Email Inbound** →
2. **LLM Agent (classification + vector store retrieval for relocation cases + draft)** →
3. **Slack HITM review** →
   - Approve → Customer (via HubSpot/Email API).
   - Reject/Edit → Human sends; feedback stored.
4. **Feedback Store** →
5. **Fine-Tuning Loop (OpenAI API)** →
6. **Updated LLM Agent**

---

## 8. Non-Functional Requirements

- **Performance:** Draft generated <5s.
- **Security:** No leakage of PII in prompts.
- **Compliance:** GDPR-compliant handling of personal data.
- **Scalability:** Support >1,000 cancellation emails/month.
- **Reliability:** ≥99% uptime for Slack integration.

---

## 9. Risks & Mitigations

- **Risk:** Agent drafts incorrect cancellation dates.
  - _Mitigation:_ Require human approval until accuracy >95%.
- **Risk:** Low agent adoption by support team.
  - _Mitigation:_ Training, transparency, ability to edit drafts easily.
- **Risk:** Customer frustration if automation sends wrong email.
  - _Mitigation:_ Gradual rollout → HITM → automation only for high-confidence.
- **Risk:** Data privacy.
  - _Mitigation:_ Mask sensitive fields before sending to LLM.

---

## 10. Roadmap & Phases

**Phase 1 (MVP):**

- Agent classification + draft generation.
- Slack review integration (HITM).
- Manual dataset export for feedback.

**Phase 2:**

- Feedback loop database.
- Initial fine-tuning runs.
- Accuracy metrics dashboard.

**Phase 3:**

- Automate dataset curation & fine-tuning schedule.
- Auto-send for high-confidence drafts.
- Expand to billing cancellations.

**Phase 4:**

- Multi-language expansion.
- Broader automation beyond cancellations.
