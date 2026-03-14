/**
 * UCP Discovery and Profile Types
 *
 * Based on the Universal Commerce Protocol specification.
 * See: https://ucp.dev/specification/overview
 *
 * Businesses publish profiles at /.well-known/ucp declaring their
 * supported capabilities, transport endpoints, and payment handlers.
 * Platforms advertise their profile via _meta.ucp.profile in MCP requests.
 */

import type { UCPCapabilityDescriptor } from './versions.js';

/**
 * Transport type for UCP service endpoints
 */
export type UCPTransportType = 'rest' | 'mcp' | 'a2a' | 'ep';

/**
 * A service endpoint declaration in a UCP profile
 */
export interface UCPServiceDeclaration {
  /** Transport type */
  transport: UCPTransportType;
  /** Endpoint URL */
  endpoint: string;
  /** Protocol version supported */
  version?: string;
}

/**
 * A capability declaration in a UCP profile
 */
export interface UCPCapabilityDeclaration {
  /** Reverse-domain capability name (e.g., 'dev.ucp.shopping.checkout') */
  name: string;
  /** Capability version (YYYY-MM-DD format) */
  version: string;
  /** JSON Schema URL for this capability */
  schema?: string;
  /** Parent capability this extends */
  extends?: string;
}

/**
 * Payment handler configuration in a UCP profile
 */
export interface UCPPaymentHandlerConfig {
  /** Handler identifier */
  id: string;
  /** Handler name (reverse-DNS format) */
  name: string;
  /** Handler version (YYYY-MM-DD format) */
  version: string;
  /** Specification URL */
  spec: string;
  /** Supported instrument schema URLs */
  instrument_schemas: string[];
}

/**
 * JWK-format signing key for webhook verification
 * See: https://ucp.dev/specification/order
 */
export interface UCPSigningKey {
  /** Key type (e.g., 'RSA', 'EC') */
  kty: string;
  /** Key ID */
  kid: string;
  /** Algorithm (e.g., 'RS256', 'ES256') */
  alg: string;
  /** Public key use ('sig' for signing) */
  use: 'sig';
  /** RSA modulus (for RSA keys) */
  n?: string;
  /** RSA exponent (for RSA keys) */
  e?: string;
  /** EC curve name (for EC keys) */
  crv?: string;
  /** EC x coordinate (for EC keys) */
  x?: string;
  /** EC y coordinate (for EC keys) */
  y?: string;
}

/**
 * UCP Business Profile (published at /.well-known/ucp)
 * See: https://ucp.dev/specification/overview
 */
export interface UCPProfile {
  /** Business/platform name */
  name: string;
  /** Description */
  description?: string;
  /** Profile URL (self-referencing) */
  profile_url?: string;
  /** Supported capabilities */
  capabilities: UCPCapabilityDeclaration[];
  /** Service endpoints */
  services: UCPServiceDeclaration[];
  /** Accepted payment handlers */
  payment_handlers?: UCPPaymentHandlerConfig[];
  /** Public signing keys for webhook verification */
  signing_keys?: UCPSigningKey[];
}

/**
 * Compute the intersection of capabilities supported by both business and platform.
 *
 * For each capability name present in both profiles, the lower version is selected
 * (per UCP spec: businesses must support platform versions <= their own).
 */
export function negotiateCapabilities(
  businessProfile: UCPProfile,
  platformProfile: UCPProfile
): UCPCapabilityDeclaration[] {
  const businessCaps = new Map(businessProfile.capabilities.map((c) => [c.name, c]));

  const negotiated: UCPCapabilityDeclaration[] = [];

  for (const platformCap of platformProfile.capabilities) {
    const businessCap = businessCaps.get(platformCap.name);
    if (!businessCap) continue;

    // Select the lower version (earlier date) for compatibility
    const selectedVersion =
      platformCap.version <= businessCap.version ? platformCap.version : businessCap.version;

    negotiated.push({
      name: platformCap.name,
      version: selectedVersion,
      schema: businessCap.schema,
      extends: businessCap.extends,
    });
  }

  return negotiated;
}

/**
 * Check whether a profile supports a specific capability
 */
export function profileSupportsCapability(
  profile: UCPProfile,
  capability: UCPCapabilityDescriptor
): boolean {
  return profile.capabilities.some(
    (c) => c.name === capability.name && c.version >= capability.version
  );
}
