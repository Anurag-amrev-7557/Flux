## 🚨 **Dark Mode Overlay & Contrast Prevention**

### **Problem**: Full-screen overlays and modals retain hardcoded light background hexes (`#FAFAFA`, `#ffffff`), active segmented pills have zero contrast against dark tracks, and primary buttons become stark white blocks.
```
- Inverted text (white) rendered on hardcoded light background (#FAFAFA), creating invisible text.
- Active segmented toggle pill indistinguishable from the background track in dark mode.
- Single bright white primary action button clashing with adjacent dark sibling buttons.
```

### **Root Cause**:
Components using hardcoded hex values (e.g., `bg-[#FAFAFA]`) bypass Tailwind semantic color tokens and dark mode variant classes (`dark:bg-[#0c0e14]`). Additionally, toggles that rely solely on `bg-white` over `bg-slate-100` fail in dark mode where both values collapse into similar dark tones without explicit dark contrast layers.

### **Prevention Rule**:
```tsx
// ❌ WRONG - Hardcoded light backgrounds in modals and full-screen overlays
<div className="fixed inset-0 bg-[#FAFAFA]">
    <h2 className="text-slate-900">Notifications</h2>
</div>

// ✅ CORRECT - Explicit dark mode tokens on full-screen drawers and modals
<div className="fixed inset-0 bg-[#FAFAFA] dark:bg-[#0c0e14]">
    <h2 className="text-slate-900 dark:text-white">Notifications</h2>
</div>

// ❌ WRONG - Inverted button creating stark white glare in dark mode
<button className="bg-slate-900 text-white dark:bg-white dark:text-black">
    Add Expense
</button>

// ✅ CORRECT - Harmonious elevated dark surface button
<button className="bg-slate-900 text-white dark:bg-[#252d42] dark:border dark:border-white/15 dark:text-white">
    Add Expense
</button>
```

### **Implementation**:
- Always supply `dark:bg-*` alongside any hardcoded hex color values on full-screen drawers, modals, and sheets.
- For segmented controls, specify `dark:bg-black/40` on the track and `dark:bg-[#252d42] dark:border dark:border-white/10` on the active pill to preserve crisp active indicator contrast.
- Ensure primary buttons integrate harmoniously with dark navy/slate themes rather than rendering stark white rectangles.
