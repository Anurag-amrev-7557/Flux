## 🚨 **Zustand State in useEffect Dependency Loop Prevention**

### **Problem**:
A component crashes with `Maximum update depth exceeded` or freezes on navigation when syncing external services (like Supabase auth or indexedDB subscriptions) with a global Zustand store.

### **Root Cause**:
Placing the Zustand state object (e.g. `user`) or its setter directly into the `useEffect` dependency array while invoking `setUser` inside the effect. Even when values are identical, creating a new object reference triggers the effect again on every render, causing an infinite render recursion.

### **Prevention Rule**:
```typescript
// ❌ WRONG - Triggers infinite re-render loop
useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
            setUser({ ...user, name: session.user.user_metadata.name });
        }
    });
}, [user, setUser]);

// ✅ CORRECT - Mount-only subscription with state read from store and change guard
useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
            const currentUser = useAppStore.getState().user;
            const newName = session.user.user_metadata?.name;
            if (currentUser.name !== newName) {
                useAppStore.getState().setUser({ ...currentUser, name: newName });
            }
        }
    });
}, []);
```

### **Implementation**:
1. When synchronizing external authentication or DB sessions into Zustand, use `useAppStore.getState()` inside the async callback instead of capturing component-scope state.
2. Guard every `setState` call by verifying that values have actually changed before dispatching.
3. Keep external subscription setup effects bound to mount `[]`.
