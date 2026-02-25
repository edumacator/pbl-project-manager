# API Contract Discipline

This project uses a strict API boundary.

Frontend must depend ONLY on the contract defined in:

docs/api-contract.md

If backend behavior changes:
- Update api-contract.md first
- Then update backend
- Then update frontend

## Response Envelope

All responses must follow:

{
  "ok": boolean,
  "data": any|null,
  "error": {
    "code": string,
    "message": string,
    "details": any|null
  } | null
}

## Error Codes

Use structured error codes:

VALIDATION_ERROR
NOT_FOUND
UNAUTHORIZED
FORBIDDEN
CONFLICT
INTERNAL_ERROR

## Endpoint Stability

Never change payload shape without version bump.
Never remove fields silently.
Additive changes are allowed in same version.
