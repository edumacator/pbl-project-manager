# Contracts and Compatibility Rules

## Purpose
Prevent regressions by treating shared surfaces as stable "contracts."

## Rules

### Define Contracts
The following are considered contracts and must be handled with care:
- **API Response Shapes**: The structure of data returned by server endpoints.
- **Shared Function Signatures**: Method names, parameters, and return types of utilities in `server/src` or `client/src`.
- **Database Schema**: Table structures, column names, and migration scripts.
- **React Component Props**: Defined props for shared UI components.

### Compatibility Strategy
- **Default: Additive Changes Only**:
    - Add new fields to objects; do not rename or remove existing ones.
    - Add new endpoints for new behaviors instead of modifying existing ones in a breaking way.
- **Breaking Changes**:
    - If a breaking change is unavoidable, you **must**:
        1. **Introduce a compatibility layer**: Support both the old and new shapes/behaviors temporarily.
        2. **Document a migration plan**: Clearly outline how consumers should update in the PR.

### Validation
- If you are unsure whether a change affects a contract, **assume YES** and consult with the team.
