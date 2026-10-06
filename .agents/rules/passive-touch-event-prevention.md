# 🚨 Passive Touch Event Listener Prevention

## Problem
Attempting to call `e.preventDefault()` inside an `onTouchStart`, `onTouchMove`, or touch handler in modern React / Web environments throws:
```
Unable to preventDefault inside passive event listener invocation.
```

## Root Cause
Modern browsers (Chrome, Safari, iOS WebKit) and React 18/19 register touch events (`touchstart`, `touchmove`) as passive listeners by default to improve scrolling performance. Calling `preventDefault()` inside a passive listener is disallowed and triggers a runtime warning/error.

## Prevention Rule

```tsx
// ❌ WRONG - Calling preventDefault in touch event handlers
<div
    onTouchStart={(e) => {
        e.preventDefault(); // Throws "Unable to preventDefault inside passive event listener"
        e.stopPropagation();
        closeModal();
    }}
/>

// ✅ CORRECT - Use stopPropagation and state actions, or handle via pointer/mouse events
<div
    onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
    }}
    onTouchStart={(e) => {
        e.stopPropagation();
        closeModal();
    }}
/>
```

## Implementation Checklist
1. Never invoke `e.preventDefault()` inside `onTouchStart` or `onTouchMove` unless non-passive listeners are explicitly configured with native `{ passive: false }`.
2. For backdrop scrims or dismiss overlays, rely on `e.stopPropagation()` and state transitions.
