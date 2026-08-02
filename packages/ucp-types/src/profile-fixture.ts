/**
 * The `/.well-known/ucp` profile this project advertises.
 *
 * Built from the capability constants in `versions.ts` so the spec version is
 * stated exactly once. Previously the profile existed as a JSON fixture read
 * from disk at runtime plus a hand-copied inline fallback in the MCP server —
 * the two had already drifted apart (the fallback listed two capabilities where
 * the fixture listed three) and both had to be edited on every spec bump.
 */

import {
  CHECKOUT_CAPABILITY,
  DISCOUNT_EXTENSION,
  FULFILLMENT_EXTENSION,
  UCP_SPEC_VERSION,
} from './versions.js';
import type { UCPProfile } from './profile.js';

export const GUARDRAIL_UCP_PROFILE = {
  name: 'guardrail-sim',
  description: 'Policy simulation engine for AI agent pricing governance in B2B commerce',
  profile_url: 'https://guardrail-sim.dev/.well-known/ucp',
  capabilities: [CHECKOUT_CAPABILITY, DISCOUNT_EXTENSION, FULFILLMENT_EXTENSION],
  services: [
    {
      transport: 'mcp',
      endpoint: 'stdio://guardrail-sim/mcp-server',
      version: UCP_SPEC_VERSION,
    },
  ],
  payment_handlers: [],
  signing_keys: [],
} as const satisfies UCPProfile;

/** The profile serialized exactly as it is served over the wire. */
export function serializeProfile(): string {
  return JSON.stringify(GUARDRAIL_UCP_PROFILE, null, 2);
}
