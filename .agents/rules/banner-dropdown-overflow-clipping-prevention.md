## 🚨 **Banner Dropdown Overflow Clipping Prevention**

### **Problem**: Dropdown menus, selects, or tooltips inside scenic header banners are clipped or cut off by the banner's container boundaries.
```
- Dropdown menu options partially obscured or cut in half by banner bottom boundary
- Flyout action sheets or datepicker popups truncated by parent overflow: hidden
```

### **Root Cause**:
Placing `overflow-hidden` directly on the outer banner container that also houses `<header>` or interactive dropdown triggers clips any absolute/fixed popup children whose height exceeds the banner container height (e.g., `h-44` / 176px).

### **Prevention Rule**:
```tsx
// ❌ WRONG - overflow-hidden on outer container that holds dropdown triggers
<div className="relative overflow-hidden h-44 w-full">
    <HeroScenery />
    <header className="relative z-20">
        <DropdownMenu className="absolute top-12 left-0 w-44" /> {/* CLIPPED at 176px! */}
    </header>
</div>

// ✅ CORRECT - Isolate overflow-hidden to background artwork only; keep header unclipped
<div className="relative w-full min-h-[176px] z-30">
    {/* Artwork wrapper: strictly clips SVGs without clipping header popups */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <HeroScenery />
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-[#141414] pointer-events-none" />
    </div>

    {/* Header with dropdown: unclipped and renders with elevated z-index */}
    <header className="relative z-30 pt-4 px-5">
        <DropdownMenu className="absolute top-12 left-0 w-44 z-50" /> {/* UNCLIPPED & FLOATS NATURALLY */}
    </header>
</div>
```

### **Implementation**:
- Never combine `overflow-hidden` and interactive dropdown/flyout containers on the same parent element.
- Enclose background scenic SVGs, canvas animations, and ambient gradients inside an `absolute inset-0 overflow-hidden pointer-events-none` container.
- Ensure dropdown backdrop is assigned elevated z-index (e.g. `z-40`) and the dropdown menu surface is assigned `z-50`.
