## 🚨 **RxDB ignoreDuplicate Prevention (DB9 Error)**

### **Problem**: Passing `ignoreDuplicate: true` to `createRxDatabase` throws `RxError (DB9)` at runtime
```
[RxDB] Critical initialization failure: RxError (DB9): 
        RxDB Error-Code: DB9.
        Hint: Error messages are not included in RxDB core to reduce build size.
        DB9: 'ignoreDuplicate is only allowed in dev-mode and must never be used in production'
Parameters:
database: "expense_tracker_db"
```

### **Root Cause**:
In RxDB, `ignoreDuplicate: true` is strictly restricted to development/unit tests when the `RxDBDevModePlugin` is explicitly loaded, and will throw fatal error `DB9` if dev-mode is disabled or not registered. In modern frameworks with Fast Refresh/HMR (like Next.js React 19 Strict Mode), attempting to reuse or remount the database instance with `ignoreDuplicate: true` triggers this crash.

### **Prevention Rule**:
```typescript
// ❌ WRONG - Throws RxError DB9 unless RxDBDevModePlugin is loaded and crashes in production
const db = await createRxDatabase({
    name: 'expense_tracker_db',
    storage: getRxStorageDexie(),
    ignoreDuplicate: true,
});

// ✅ CORRECT - Use closeDuplicates: true to safely recycle unclosed instances on HMR/remounts
const db = await createRxDatabase({
    name: 'expense_tracker_db',
    storage: getRxStorageDexie(),
    closeDuplicates: true,
    multiInstance: true,
    eventReduce: true,
});
```

### **Implementation**:
- Never use `ignoreDuplicate: true` for HMR or React Strict Mode database handling.
- Use `closeDuplicates: true`, which gracefully closes lingering unclosed instances across hot-reloads and mounts in both development and production.
