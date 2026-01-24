/**
 * UCP Identity Linking Capability Types
 *
 * Based on the Universal Commerce Protocol specification.
 * See: https://ucp.dev/specification/identity-linking
 *
 * The Identity Linking Capability enables platforms to obtain authorization
 * to perform actions on a user's behalf via OAuth 2.0.
 */

/**
 * OAuth 2.0 Authorization Server Metadata
 * Exposed via /.well-known/oauth-authorization-server (RFC 8414)
 */
export interface OAuthServerMetadata {
  /** Authorization server issuer identifier */
  issuer: string;
  /** Authorization endpoint URI */
  authorization_endpoint: string;
  /** Token endpoint URI */
  token_endpoint: string;
  /** Token revocation endpoint URI (RFC 7009) */
  revocation_endpoint: string;
  /** Supported OAuth scopes */
  scopes_supported: string[];
  /** Supported response types (UCP requires ['code']) */
  response_types_supported: ['code'];
  /** Supported grant types */
  grant_types_supported: ('authorization_code' | 'refresh_token')[];
  /** Supported token endpoint auth methods */
  token_endpoint_auth_methods_supported: ['client_secret_basic'];
  /** Service documentation URL */
  service_documentation?: string;
}

/**
 * UCP-defined OAuth scopes
 */
export type UCPScope =
  | 'ucp:scopes:checkout_session' // CheckoutSession operations
  | 'ucp:scopes:order' // Order operations
  | string; // Allow custom scopes

/**
 * OAuth 2.0 Authorization Request parameters
 * See: RFC 6749 Section 4.1.1
 */
export interface AuthorizationRequest {
  /** Must be 'code' for authorization code flow */
  response_type: 'code';
  /** Client identifier */
  client_id: string;
  /** Redirect URI for authorization response */
  redirect_uri: string;
  /** Requested scopes (space-separated) */
  scope: string;
  /** Opaque state value for CSRF protection */
  state: string;
  /** PKCE code challenge (recommended) */
  code_challenge?: string;
  /** PKCE code challenge method */
  code_challenge_method?: 'S256' | 'plain';
}

/**
 * OAuth 2.0 Authorization Response
 * Delivered via redirect to redirect_uri
 */
export interface AuthorizationResponse {
  /** Authorization code to exchange for tokens */
  code: string;
  /** State value from authorization request */
  state: string;
}

/**
 * OAuth 2.0 Authorization Error Response
 */
export interface AuthorizationErrorResponse {
  /** Error code */
  error:
    | 'invalid_request'
    | 'unauthorized_client'
    | 'access_denied'
    | 'unsupported_response_type'
    | 'invalid_scope'
    | 'server_error'
    | 'temporarily_unavailable';
  /** Human-readable error description */
  error_description?: string;
  /** URI for error documentation */
  error_uri?: string;
  /** State value from authorization request */
  state?: string;
}

/**
 * OAuth 2.0 Token Request (Authorization Code Grant)
 * See: RFC 6749 Section 4.1.3
 */
export interface TokenRequest {
  /** Must be 'authorization_code' */
  grant_type: 'authorization_code';
  /** Authorization code from authorization response */
  code: string;
  /** Redirect URI (must match authorization request) */
  redirect_uri: string;
  /** Client identifier (if not using Basic auth) */
  client_id?: string;
  /** PKCE code verifier */
  code_verifier?: string;
}

/**
 * OAuth 2.0 Refresh Token Request
 * See: RFC 6749 Section 6
 */
export interface RefreshTokenRequest {
  /** Must be 'refresh_token' */
  grant_type: 'refresh_token';
  /** Refresh token */
  refresh_token: string;
  /** Optionally reduce scope */
  scope?: string;
}

/**
 * OAuth 2.0 Token Response
 * See: RFC 6749 Section 5.1
 */
export interface TokenResponse {
  /** Access token for API calls */
  access_token: string;
  /** Token type (always 'Bearer' for UCP) */
  token_type: 'Bearer';
  /** Token lifetime in seconds */
  expires_in: number;
  /** Refresh token for obtaining new access tokens */
  refresh_token?: string;
  /** Granted scopes (if different from requested) */
  scope?: string;
}

/**
 * OAuth 2.0 Token Error Response
 * See: RFC 6749 Section 5.2
 */
export interface TokenErrorResponse {
  /** Error code */
  error:
    | 'invalid_request'
    | 'invalid_client'
    | 'invalid_grant'
    | 'unauthorized_client'
    | 'unsupported_grant_type'
    | 'invalid_scope';
  /** Human-readable error description */
  error_description?: string;
  /** URI for error documentation */
  error_uri?: string;
}

/**
 * OAuth 2.0 Token Revocation Request
 * See: RFC 7009
 */
export interface TokenRevocationRequest {
  /** Token to revoke */
  token: string;
  /** Token type hint */
  token_type_hint?: 'access_token' | 'refresh_token';
}

/**
 * Identity linking status for a user
 */
export interface IdentityLinkStatus {
  /** Whether the user has linked their identity */
  linked: boolean;
  /** Granted scopes (if linked) */
  scopes?: string[];
  /** When the link was established */
  linked_at?: string;
  /** When the current token expires */
  expires_at?: string;
}

/**
 * Client registration for OAuth 2.0
 * Used when a platform registers with a business
 */
export interface ClientRegistration {
  /** Client identifier */
  client_id: string;
  /** Client secret (confidential clients only) */
  client_secret?: string;
  /** Allowed redirect URIs */
  redirect_uris: string[];
  /** Allowed grant types */
  grant_types: ('authorization_code' | 'refresh_token')[];
  /** Allowed scopes */
  scope: string;
  /** Client name for display */
  client_name?: string;
  /** Client logo URI */
  logo_uri?: string;
  /** Client terms of service URI */
  tos_uri?: string;
  /** Client privacy policy URI */
  policy_uri?: string;
}
