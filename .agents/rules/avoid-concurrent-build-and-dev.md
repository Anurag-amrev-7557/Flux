# Avoid Concurrent `npm run build` and `npm run dev`

## 🚨 **Problem**
Running `npm run build` while `npm run dev` (or `next dev`) is concurrently active in the background or another terminal session corrupts webpack chunk resolution:
```
⨯ Error: Cannot find module './<chunk-number>.js'
Require stack:
- .../.next/server/webpack-runtime.js
- .../.next/server/app/.../page.js
```
Followed by HTTP 500 internal server errors across dynamic routes.

## **Root Cause**
Next.js dev server writes incremental hot-module memory/disk chunks into `.next/server/...`. When `next build` is executed, it wipes and completely rewrites `.next/server/...` with production hashed chunks (e.g., `121.js` or `chunks/255-...`). The ongoing `next dev` server continues to request dev chunk manifests that were just deleted or renamed by the production build compiler.

## **Prevention Rule**
```bash
# ❌ WRONG - Running next build while dev server is alive
npm run build # (with npm run dev still active in background)

# ✅ CORRECT - Use tsc for zero-impact typechecking while dev server runs
npx tsc --noEmit

# ✅ CORRECT - Only run npm run build when dev server is stopped, or cleanly clean .next before resuming dev
```

## **Implementation**
- Always rely on `npx tsc --noEmit` to verify type safety during active local development.
- If `npm run build` must be run to test static production exports, stop the dev server first, or delete `.next` and restart `npm run dev` afterwards.
