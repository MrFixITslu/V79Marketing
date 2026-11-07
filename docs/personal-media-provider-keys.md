# V79 Marketing — Personal media API credentials (BYOK)

**Status:** Feature-branch implementation; no production credentials migrated, no live cloud image/video adapter active.

## Design choice and /REDTEAM

1. **Shared V79 provider key:** simple but violates per-user ownership and creates cross-tenant billing and breach impact. Rejected.
2. **Browser/local-storage key:** avoids a server database but leaks to client scripts, XSS and browser backups; cannot support approved scheduled server-side jobs safely. Rejected.
3. **Dedicated per-user server vault:** selected. Keys are encrypted, owned by exactly one user inside one Hub business, and used only by server-side authenticated code.

## Confidentiality and isolation

- Source-of-truth user and business IDs come exclusively from the existing Hub-managed Marketing session; never accept user/tenant IDs in key-management requests.
- Database unique key is `(business_id,user_id,provider)`. Encryption uses AES-256-GCM, a fresh 96-bit random IV and authenticated additional data (AAD) binding the exact business, user and provider.
- The separate 256-bit `V79_MEDIA_CREDENTIALS_MASTER_KEY` is mandatory for saving or decrypting. Generate on a trusted host using `openssl rand -base64 32 | tr '+/' '-_' | tr -d '='`. Store outside Git, source, telemetry and the database.
- The UI and API never provide GET-by-secret or plaintext retrieval. Responses show only provider, configured status, version and timestamps. Provider credentials are masked completely, including suffixes.
- Each provider key can be replaced or deleted by its owner. Deletion removes the encrypted row immediately. API-key revocation at the actual third-party provider remains the user's responsibility.
- No arbitrary user-configured URLs are accepted with credentials. MCP credentials stay stored but no MCP execution or remote tool connection is enabled until separate host allowlisting, TLS identity verification, capability scoping and prompt-injection tests pass.
- Local rendering needs no user credential. The existing Gemini text fallback only uses the signed-in user's saved Gemini credential, **and only when that user selects a per-request cloud opt-in**. V79's old shared `GEMINI_API_KEY` is not used for user generation.
- Keys belong to their providers, not V79. V79 does not guarantee the provider's price, service availability, or processing/data retention policies.

## Operational security and release gates

- Require HTTPS with protected sessions, same-origin writes, MFA at Hub, least-privilege server accounts, secure backups and sensitive-data log redaction. Cookie XSS/session compromise and server-root compromise remain residual risks; encryption at rest cannot protect from an attacker who obtains both encrypted data and the server master key.
- Keep the master key available to the service only at runtime. Losing it makes the saved keys unrecoverable. For rotation, implement an audited decrypt-and-reencrypt maintenance flow with a new key version before replacing the old key. **Do not rotate by blindly overwriting the environment variable.**
- On user deprovisioning, delete keys or enforce fail-closed current Hub entitlement checks before every invocation. No cross-user key delegation; if shared organisational credentials are requested later, design a separate explicit grant mechanism.
- Any future automated paid generation must lock to an approved `user_id`, `business_id`, provider, credential revision, content digest, cost estimate and monthly quota. Check current entitlement and consent again before dispatch; no automatic key fallback to a different member.
- Never return a provider's raw error message if it might echo a secret, nor log request bodies, Authorization headers or provider errors containing credentials.
- Secrets and real social media accounts are not needed for unit tests. Tests cover encryption, AAD tampering, cross-user isolation, key deletion, invalid/missing master key and API non-disclosure.
- Before release: independently verify the encryption master key is set on the *staging* environment, the database volume and master key can be recovered from separate encrypted backups, CI and browser tests pass, and the owner expressly approves deployment. Do not enable connected cloud image/video providers or remote MCP tools via this credential-only milestone.

## Supported key records

`gemini` (personal Google Gemini text fallback, explicit request opt-in);
`openai`, `fal`, `replicate`, `runway` and `mcp` (**credential storage only**, no network adapter yet).

This list identifies credential categories; it is **not** a claim of currently integrated image or video generation APIs.
