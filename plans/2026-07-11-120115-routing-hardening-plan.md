# Routing Hardening Plan

## Goal
Reduce client-side freeze risk and prevent malformed graph payloads from entering runtime routing.

## Inputs
- Security review findings from previous delivery
- Existing app routing implementation in alwayspcn

## Steps
1. Add runtime graph schema validation for network JSON.
2. Move route computation to Web Worker with request-id based response handling.
3. Add lightweight debounce for route requests.
4. Update UI status for worker lifecycle and failures.
5. Run lint/build validation.
6. Update docs, changelog, and TODO.

## Risks
- Worker module loading differences across environments.
- Validation overhead on large graph payloads.

## Mitigation
- Add fallback path when worker creation fails.
- Keep validation linear and explicit.
