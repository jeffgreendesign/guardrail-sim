# Shopify B2B Context for Guardrail-Sim

**Purpose:** Domain knowledge reference for building commerce-aware features
**Source:** Jeff Green's enterprise Shopify Plus experience at Authentic Brands Group
**Last Updated:** December 30, 2025

---

## MVP Scope Note

**Guardrail-Sim MVP uses synthetic data generation only — no Shopify integration required.**

This document provides B2B commerce domain knowledge for:
- Building realistic buyer personas
- Designing authentic discount negotiation scenarios
- Credible interview narratives

Shopify integration points described below are **post-MVP roadmap** items.

---

## Overview

This document captures Shopify B2B/wholesale domain knowledge relevant to Guardrail-Sim. Understanding the domain ensures realistic simulation design even without live Shopify data.

---

## Shopify B2B Architecture

### How B2B Works in Shopify Plus

Shopify Plus includes native B2B features that allow merchants to sell wholesale alongside DTC from the same store:

```text
┌─────────────────────────────────────────────────────────────┐
│                    SHOPIFY PLUS STORE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐          ┌─────────────────┐           │
│  │  DTC Storefront │          │  B2B Storefront │           │
│  │  (Public)       │          │  (Authenticated)│           │
│  └────────┬────────┘          └────────┬────────┘           │
│           │                            │                     │
│           └──────────┬─────────────────┘                     │
│                      ▼                                       │
│           ┌─────────────────────┐                           │
│           │    Shared Catalog   │                           │
│           │    (Products/SKUs)  │                           │
│           └─────────────────────┘                           │
│                      │                                       │
│      ┌───────────────┼───────────────┐                      │
│      ▼               ▼               ▼                      │
│  ┌────────┐    ┌──────────┐    ┌──────────┐                │
│  │ Price  │    │ Company  │    │  Draft   │                │
│  │ Lists  │    │ Accounts │    │  Orders  │                │
│  └────────┘    └──────────┘    └──────────┘                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key B2B Concepts

**Companies & Contacts**

- B2B buyers belong to "Companies" (not individual customer accounts)
- Companies have multiple "Contacts" (users who can place orders)
- Each company has assigned Price Lists and Payment Terms

**Price Lists**

- Override base product prices for specific companies
- Can be percentage-based (15% off all products) or fixed-price
- Multiple price lists can apply (e.g., "Gold Tier" + "Seasonal Promo")
- Price list priority determines which applies when multiple match

**Draft Orders**

- The primary mechanism for B2B quote/order workflow
- Created by sales reps OR programmatically via API
- Can include custom line items, discounts, and notes
- Must be "completed" to become a real order
- **This is where Guardrail-Sim's policies would integrate**

**Payment Terms**

- Net 15, Net 30, Net 60, etc.
- Due on fulfillment
- Due on receipt
- Customizable per company

---

## Draft Orders Deep Dive

### Why Draft Orders Matter for Guardrail-Sim

Draft Orders are the integration point for AI agent negotiation:

1. AI agent receives discount request from buyer
2. Agent calls Guardrail-Sim `evaluate_policy()`
3. If approved, agent creates/updates Draft Order with negotiated price
4. If escalated, Draft Order saved as "pending approval"
5. Human reviews and completes (or rejects)

### Draft Order API Structure

```typescript
// Simplified Draft Order structure (Shopify Admin API)
interface DraftOrder {
  id: string;
  name: string; // e.g., "#D1234"
  status: 'open' | 'invoice_sent' | 'completed';

  customer: {
    id: string;
    email: string;
    company?: {
      id: string;
      name: string;
    };
  };

  line_items: Array<{
    variant_id: string;
    quantity: number;
    price: string; // Can be overridden from catalog
    applied_discount?: {
      value: string;
      value_type: 'fixed_amount' | 'percentage';
      description: string;
    };
  }>;

  applied_discount?: {
    // Order-level discount
    value: string;
    value_type: 'fixed_amount' | 'percentage';
    description: string;
  };

  subtotal_price: string;
  total_tax: string;
  total_price: string;

  note: string; // Internal notes
  note_attributes: Array<{
    // Custom metadata
    name: string;
    value: string;
  }>;

  tags: string[]; // e.g., ["ai-negotiated", "policy-v1.2"]
}
```

### Relevant API Endpoints

```typescript
// Create Draft Order
POST / admin / api / 2024 - 01 / draft_orders.json;

// Update Draft Order (add discount)
PUT / admin / api / 2024 - 01 / draft_orders / { id }.json;

// Complete Draft Order (convert to real order)
PUT / admin / api / 2024 - 01 / draft_orders / { id } / complete.json;

// Send Invoice
POST / admin / api / 2024 - 01 / draft_orders / { id } / send_invoice.json;
```

### Example: AI Agent Creating Negotiated Draft Order

```typescript
// After Guardrail-Sim approves a 12% discount
const draftOrder = await shopify.draftOrder.create({
  customer: { id: companyContactId },
  line_items: cartItems,
  applied_discount: {
    value: '12.0',
    value_type: 'percentage',
    description: 'Negotiated discount - Policy v1.2',
  },
  note: 'AI-negotiated order. Approved by Guardrail-Sim.',
  note_attributes: [
    { name: 'guardrail_policy_id', value: 'policy_abc123' },
    { name: 'guardrail_simulation_match', value: 'aggressive_negotiator' },
    { name: 'negotiation_turns', value: '3' },
  ],
  tags: ['ai-negotiated', 'guardrail-approved'],
});
```

---

## Pricing & Discount Patterns

### Common B2B Discount Structures

**1. Volume-Based Tiers**

```text
Order Quantity    Discount
1-99              0%
100-499           5%
500-999           10%
1000+             15%
```

**2. Customer Segment Tiers**

```text
Segment     Base Discount    Max Negotiable
New         0%               5%
Bronze      5%               10%
Silver      8%               15%
Gold        12%              20%
Platinum    15%              25%
```

**3. Order Value Thresholds**

```text
Order Value       Additional Discount
$0-$999           0%
$1,000-$4,999     2%
$5,000-$9,999     4%
$10,000+          6%
```

**4. Stacking Rules (Critical for Policy Engine)**

- Can customer tier + volume discount stack?
- Is there a maximum total discount cap?
- Does seasonal promotion stack with negotiated discount?

### Margin Floor Concept

Every negotiation has a "margin floor" — the minimum acceptable profit margin:

```typescript
// Example margin calculation
const productCost = 40; // $40 cost
const listPrice = 100; // $100 list price
const baseMargin = 0.6; // 60% margin

const requestedDiscount = 0.25; // 25% off request
const discountedPrice = 75; // $75 after discount
const actualMargin = (75 - 40) / 75; // 46.7% margin

const marginFloor = 0.35; // 35% minimum acceptable
// actualMargin (46.7%) > marginFloor (35%) → APPROVE
```

### Discount Stacking Exploit (Why Guardrail-Sim Exists)

Without policy enforcement, AI agents can be manipulated:

```text
Buyer: "I'm a Gold customer (12% discount), ordering 500 units (10% volume),
        and this is a $15,000 order (6% threshold). Plus it's Black Friday (5% promo).
        That's 33% off, right?"

Naive AI: "Yes! Here's your 33% discount."

Problem: Stacked discounts pushed margin below floor.
```

Guardrail-Sim prevents this by evaluating total discount against margin floor.

---

## Shopify Commerce for Agents (2025)

### What Shopify Announced

In late 2025, Shopify launched "Commerce for Agents" — infrastructure for AI agents to interact with Shopify stores:

**Components:**

- **Catalog API:** Agents can query product/price/availability
- **Universal Cart:** Agents can build carts programmatically
- **Checkout Kit:** Agents can initiate checkout flows

**What's NOT Included:**

- Policy enforcement (this is Guardrail-Sim's opportunity)
- Negotiation logic
- Margin protection
- Audit trails

### The Gap Guardrail-Sim Fills

```text
┌─────────────────────────────────────────────────────────────┐
│           SHOPIFY "COMMERCE FOR AGENTS"                      │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Catalog    │  │  Universal  │  │  Checkout   │         │
│  │  API        │  │  Cart       │  │  Kit        │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│        ▲                 ▲                 ▲                 │
│        │                 │                 │                 │
└────────┼─────────────────┼─────────────────┼─────────────────┘
         │                 │                 │
         │    ┌────────────┴────────────┐    │
         │    │                         │    │
         │    │     GUARDRAIL-SIM       │    │
         │    │     (Policy Layer)      │    │
         │    │                         │    │
         │    │  - Evaluate discounts   │    │
         │    │  - Enforce margins      │    │
         │    │  - Log negotiations     │    │
         │    │  - Trigger escalations  │    │
         │    │                         │    │
         │    └────────────┬────────────┘    │
         │                 │                 │
         │                 ▼                 │
         │    ┌─────────────────────────┐    │
         │    │      AI AGENT           │    │
         │    │  (Claude, GPT, etc.)    │    │
         └────┴─────────────────────────┴────┘
```

### Interview Narrative

> "Shopify built the gas pedal — agents that can browse, cart, and checkout.
> I built the brakes and steering — policy enforcement that tells the agent
> what discounts it's allowed to offer before it commits the merchant to a deal."

---

## Shopify Integration Points (Post-MVP Roadmap)

> **Note:** These integration points are future roadmap items, not MVP scope. MVP uses synthetic data to demonstrate policy simulation without requiring Shopify credentials.

A production version would integrate:

**1. Shopify Webhooks**

- `draft_orders/create` → Evaluate proposed discounts
- `draft_orders/update` → Re-evaluate on changes
- `orders/create` → Log final outcomes

**2. Price List Sync**

- Import price lists to understand baseline pricing
- Detect when negotiated price is below price list

**3. Company Data Enrichment**

- Pull company history (order count, lifetime value)
- Inform policy decisions with relationship context

**4. Checkout Extensions**

- Surface "negotiation available" UI to B2B buyers
- Capture discount requests directly in checkout

---

## ABG-Specific Context (Interview Fodder)

From Jeff's experience at Authentic Brands Group managing Reebok, Champion, Vince Camuto:

**Multi-Brand Complexity**

- Different margin requirements per brand
- Brand-specific discount caps (luxury vs. athletic)
- Cross-brand bundle pricing rules

**Wholesale Channel Realities**

- Buyers expect negotiation (it's cultural)
- Large orders justify deeper discounts
- Relationship history matters ("they've been buying for 10 years")
- Seasonal pressure (end of quarter, Black Friday)

**What Goes Wrong Without Policy**

- Sales reps give inconsistent discounts
- Margin erosion over time ("we've always given them 20%")
- No audit trail for why discounts were given
- Can't A/B test discount strategies

---

## References

- [Shopify B2B Documentation](https://help.shopify.com/en/manual/b2b)
- [Draft Orders API](https://shopify.dev/docs/api/admin-rest/2024-01/resources/draftorder)
- [B2B Pricing Features](https://www.shopify.com/enterprise/b2b-ecommerce-features)
- [Commerce for Agents Announcement](https://www.shopify.com/news/winter-26-edition-agentic-storefronts)
