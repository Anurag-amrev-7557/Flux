## 🚨 **Next.js 15 React Compiler Prerender Chunk Failure Prevention**

### **Problem**: Next.js production build crashes with `TypeError: Cannot read properties of undefined (reading 'call') at Object.c [as require] (.next/server/webpack-runtime.js:1:128)` during `Generating static pages`.
```
TypeError: Cannot read properties of undefined (reading 'call')
    at Object.c [as require] (.next/server/webpack-runtime.js:1:128)
Error occurred prerendering page "/profiles".
Export encountered an error on /profiles/page: /profiles, exiting the build.
```

### **Root Cause**:
In Next.js 15 with React 19 and Webpack (or Serwist service worker plugin), enabling `experimental: { reactCompiler: true }` generates incomplete SSR module manifests and corrupt chunk tables during static prerendering, resulting in missing SSR module IDs `(ssr)/...` in the Webpack runtime table.

### **Prevention Rule**:
```javascript
// ❌ WRONG - Enables unstable compiler in Next 15 webpack build
const nextConfig = {
    experimental: {
        reactCompiler: true,
    },
};

// ✅ CORRECT - Disable experimental reactCompiler until stable upstream
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        reactCompiler: false,
    },
};
```

### **Implementation**:
Keep `reactCompiler: false` in `next.config.js` when building Next.js 15 App Router applications targeting production static generation.
