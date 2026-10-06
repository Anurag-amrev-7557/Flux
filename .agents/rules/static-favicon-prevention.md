## 🚨 **Next.js Favicon Dynamic Route Chunk Error Prevention**

### **Problem**: Next.js throws 500 error `Cannot find module './<chunk>.js'` when requesting `/favicon.ico`
```
Error: Cannot find module './873.js'
Require stack:
- /Users/anurag/Downloads/Flux-main/.next/server/webpack-runtime.js
- /Users/anurag/Downloads/Flux-main/.next/server/app/favicon.ico/route.js
...
GET /favicon.ico 500
```

### **Root Cause**:
Placing `favicon.ico` directly inside `src/app/` instructs Next.js App Router to generate a dynamic Route Handler (`app/favicon.ico/route.js`) requiring Webpack chunk runtime resolution. Any cache purge, build run, or chunk ID change causes this dynamic route to fail with `MODULE_NOT_FOUND`.

### **Prevention Rule**:
```bash
# ❌ WRONG - Placing favicon in src/app/ generates a dynamic server route handler
src/app/favicon.ico

# ✅ CORRECT - Place favicon.ico in public/ and reference via metadata
public/favicon.ico
```

In `src/app/layout.tsx`:
```ts
export const metadata: Metadata = {
  // ...
  icons: {
    icon: "/favicon.ico",
  },
};
```

### **Implementation**:
1. Keep `favicon.ico` in the `public/` directory so it is served by the static asset pipeline without server route compilation.
2. If `src/app/favicon.ico` is present, delete or relocate it to `public/favicon.ico`.
