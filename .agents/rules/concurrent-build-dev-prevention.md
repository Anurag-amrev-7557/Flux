## 🚨 **Next.js Build & Dev Cache Conflict Prevention**

### **Problem**: Running `next build` while `next dev` is active corrupts `.next` and triggers 500 errors
```
TypeError: Cannot read properties of undefined (reading 'call')
    at Object.__webpack_require__ [as require] (.next/server/webpack-runtime.js)
Error: ENOENT: no such file or directory, open '.next/server/vendor-chunks/next.js'
Error: Cannot find module './873.js' / './611.js'
Error: ENOENT: no such file or directory, open '.next/fallback-build-manifest.json'
```

### **Root Cause**:
`next build` replaces `.next/server/webpack-runtime.js` and the React Client Manifest with production artifacts that omit dev-only modules (like `segment-explorer-node.js`) and modify chunk mappings. The active `next dev` process continues trying to load dev modules using the newly generated production manifest, resulting in runtime errors.

### **Prevention Rule**:
```bash
# ❌ WRONG - Running next build while next dev server is active in background
npm run dev # (running)
npm run build # (clobbers .next)

# ✅ CORRECT - Stop dev server before production builds, and clean .next before resuming next dev
manage_task kill <dev-task-id>
npm run build
rm -rf .next
npm run dev
```

### **Implementation**:
- Do not run `next build` concurrently with an active `next dev` instance sharing the same workspace directory.
- If `next build` is executed for bundle verification, purge `.next` (`rm -rf .next`) and restart `next dev`.
