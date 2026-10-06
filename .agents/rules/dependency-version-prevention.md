# Dependency Version & Installation Error Prevention

## Problem
Running `npm install` failed with:
```
npm error code ETARGET
npm error notarget No matching version found for babel-plugin-react-compiler@^19.0.0.
```

## Root Cause
Speculative semver ranges (such as `^19.0.0` for `babel-plugin-react-compiler`) were specified in `package.json` for experimental packages whose npm releases follow non-standard tags (`1.0.0`, `19.0.0-beta-...`, or `0.0.0-experimental-...`).

## Prevention Rule
Always verify exact package version availability against npm registry or check existing pins in `package-lock.json` before modifying dependency version strings.

```json
// ❌ WRONG - Speculative standard semver for experimental packages
"babel-plugin-react-compiler": "^19.0.0"

// ✅ CORRECT - Use locked or verified release tags
"babel-plugin-react-compiler": "1.0.0"
```

## Implementation
1. If an `ETARGET` error occurs, query `npm view <package> versions --json` or inspect `package-lock.json`.
2. Consolidate overlapping Next.js configurations (`next.config.js` vs `next.config.ts`) to avoid duplicate config collisions.
