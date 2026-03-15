/**
 * In-memory checkout session store for UCP MCP checkout tools.
 *
 * MVP implementation: sessions live for the server process lifetime.
 * No persistence, no auth — fits single-user demo constraints.
 */

import { randomUUID } from 'node:crypto';
import type {
  CheckoutStatus,
  CheckoutWithDiscounts,
  LineItemRequest,
  Buyer,
  PostalAddress,
  LineItem,
  Total,
  Item,
  OrderReference,
} from '@guardrail-sim/ucp-types';

/** Stored checkout session */
export interface CheckoutSession extends CheckoutWithDiscounts {
  /** Internal creation timestamp */
  created_at: string;
}

/** Sessions indexed by ID */
const sessions = new Map<string, CheckoutSession>();

/** Idempotency key → session ID mapping */
const idempotencyKeys = new Map<string, string>();

/**
 * Build line items from request format to response format
 */
function buildLineItems(requestItems: LineItemRequest[]): LineItem[] {
  return requestItems.map((ri) => {
    if (!('title' in ri.item) || !('price' in ri.item)) {
      const itemId = (ri.item as { id: string }).id;
      throw new Error(
        `Line item "${itemId}" must include inline title and price. Item references without pricing are not supported.`
      );
    }
    const item = ri.item as Item;
    const subtotal = item.price * ri.quantity;
    return {
      id: `li-${randomUUID().slice(0, 8)}`,
      item,
      quantity: ri.quantity,
      totals: [{ type: 'subtotal' as const, amount: subtotal }],
    };
  });
}

/**
 * Compute totals from line items
 */
function computeTotals(lineItems: LineItem[]): Total[] {
  const subtotal = lineItems.reduce((sum, li) => {
    const sub = li.totals.find((t) => t.type === 'subtotal');
    return sum + (sub?.amount ?? 0);
  }, 0);
  return [
    { type: 'subtotal' as const, amount: subtotal },
    { type: 'total' as const, amount: subtotal },
  ];
}

/**
 * Determine checkout status based on session state
 */
function determineStatus(session: Partial<CheckoutSession>): CheckoutStatus {
  if (!session.line_items || session.line_items.length === 0) return 'incomplete';
  if (!session.buyer?.email) return 'incomplete';
  return 'ready_for_complete';
}

/** Result of creating a checkout session */
export interface CreateCheckoutResult {
  session: CheckoutSession;
  isNew: boolean;
}

/**
 * Create a new checkout session.
 * Returns existing session (isNew: false) if idempotency key was previously used.
 */
export function createCheckoutSession(params: {
  currency: string;
  line_items: LineItemRequest[];
  buyer?: Buyer;
  shipping_address?: PostalAddress;
  idempotency_key?: string;
}): CreateCheckoutResult {
  // Check idempotency
  if (params.idempotency_key) {
    const existingId = idempotencyKeys.get(params.idempotency_key);
    if (existingId) {
      const existing = sessions.get(existingId);
      if (existing) return { session: existing, isNew: false };
    }
  }

  const id = randomUUID();
  const lineItems = buildLineItems(params.line_items);
  const totals = computeTotals(lineItems);

  const session: CheckoutSession = {
    id,
    status: 'incomplete',
    currency: params.currency,
    line_items: lineItems,
    totals,
    links: [],
    payment: { handlers: [] },
    buyer: params.buyer,
    shipping_address: params.shipping_address,
    created_at: new Date().toISOString(),
  };

  session.status = determineStatus(session);
  sessions.set(id, session);

  if (params.idempotency_key) {
    idempotencyKeys.set(params.idempotency_key, id);
  }

  return { session, isNew: true };
}

/**
 * Get a checkout session by ID
 */
export function getCheckoutSession(id: string): CheckoutSession | undefined {
  return sessions.get(id);
}

/**
 * Update an existing checkout session
 */
export function updateCheckoutSession(
  id: string,
  updates: {
    line_items?: LineItemRequest[];
    buyer?: Buyer;
    shipping_address?: PostalAddress;
  }
): CheckoutSession {
  const session = sessions.get(id);
  if (!session) throw new Error(`Checkout session not found: ${id}`);
  if (session.status === 'completed' || session.status === 'canceled') {
    throw new Error(`Cannot update session in terminal status: ${session.status}`);
  }

  if (updates.line_items) {
    session.line_items = buildLineItems(updates.line_items);
    session.totals = computeTotals(session.line_items);
  }
  if (updates.buyer) {
    session.buyer = { ...session.buyer, ...updates.buyer };
  }
  if (updates.shipping_address) {
    session.shipping_address = { ...session.shipping_address, ...updates.shipping_address };
  }

  session.status = determineStatus(session);
  return session;
}

/**
 * Complete a checkout session (place order)
 */
export function completeCheckoutSession(id: string, idempotencyKey?: string): CheckoutSession {
  // Check idempotency
  if (idempotencyKey) {
    const existingId = idempotencyKeys.get(idempotencyKey);
    if (existingId === id) {
      const existing = sessions.get(id);
      if (existing?.status === 'completed') return existing;
    }
  }

  const session = sessions.get(id);
  if (!session) throw new Error(`Checkout session not found: ${id}`);
  if (session.status !== 'ready_for_complete') {
    throw new Error(
      `Cannot complete session with status "${session.status}". Must be "ready_for_complete".`
    );
  }

  session.status = 'completed';
  const orderRef: OrderReference = {
    id: `order-${randomUUID().slice(0, 8)}`,
    confirmation_number: `GS-${Date.now().toString(36).toUpperCase()}`,
  };
  session.order = orderRef;

  if (idempotencyKey) {
    idempotencyKeys.set(idempotencyKey, id);
  }

  return session;
}

/**
 * Cancel a checkout session
 */
export function cancelCheckoutSession(id: string, idempotencyKey?: string): CheckoutSession {
  if (idempotencyKey) {
    const existingId = idempotencyKeys.get(idempotencyKey);
    if (existingId === id) {
      const existing = sessions.get(id);
      if (existing?.status === 'canceled') return existing;
    }
  }

  const session = sessions.get(id);
  if (!session) throw new Error(`Checkout session not found: ${id}`);
  if (session.status === 'completed') {
    throw new Error('Cannot cancel a completed session');
  }

  session.status = 'canceled';

  if (idempotencyKey) {
    idempotencyKeys.set(idempotencyKey, id);
  }

  return session;
}

/**
 * Clear all sessions (for testing)
 */
export function clearSessions(): void {
  sessions.clear();
  idempotencyKeys.clear();
}
