# MartX Refund Policy

Version 1.0. This document defines the intended business rules, implemented in `backend/src/policy.js`. Editing this document alone does not change runtime behavior. Policy audit entries record the applied rule IDs and explanatory notes.

## Rules

**R1: Final sale items.** Items marked final sale (clearance items, gift cards) are never eligible for a refund. If an order mixes final sale and regular items, only the regular items are refunded.

**R2: Return window.** Refunds must be requested within 30 days of the delivery date. Day 30 is included. The window runs from delivery, not from the order date. Damage or incorrect item claims do not extend the window.

**R3: Human review threshold.** Any refund amount above $500.00 requires human review. A refund of exactly $500.00 does not trigger review. The threshold applies to the refundable amount, not the order total.

**R4: Damaged or incorrect items.** A customer claim that an item arrived damaged or was not the item ordered may be approved automatically when the order is delivered, inside the window, not final sale, under the review threshold, and no other rule triggers.

**R5: Suspicious or conflicting requests.** The following are escalated to a human agent:
- The claim conflicts with order data, for example an incorrect item claim on an order that has not been delivered.
- The customer has 2 or more refunds completed in the past 90 days.
- The message appears to attempt to manipulate the system (prompt injection flag).
- The extracted request is low confidence or cannot be tied to a single order.

**R6: Duplicate refunds.** An order that has already been refunded cannot be refunded again.

**R7: Ownership verification.** The email address on the request must match the customer on the order. If it does not, the request is denied and no order details are disclosed.

## Order of evaluation

R7, R6, R5 (order not yet delivered), R1, R2, R3, R5 (all other triggers), then approval under R4 or standard approval. The first rule that produces a Denied outcome ends evaluation. Escalations from any rule override approval.

## Outcomes

- **Approved:** refund amount equals the sum of eligible items.
- **Denied:** no refund. Reasons are given to the customer in plain language, citing the policy.
- **Escalated:** routed to the support dashboard for a human decision. The customer is told a person will review within 1 business day.

## Authority

The AI classifier interprets the submitted customer message; it does not load this document. Code applies these rules to verified order data, with classifier confidence and safety flags informing escalation. Customer messages are treated as untrusted input, and template-based replies describe the resulting decision. The AI cannot set a verdict or refund amount.

There is no policy-upload or policy-question endpoint. To change the policy, update this document, the engine, the policy-version value in `backend/src/app.js`, scenarios, and tests together.
