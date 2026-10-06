## 🚨 **Framer Motion layoutId Jitter on Dynamic Content Prevention**

### **Problem**: An indicator pill or tab highlighter using `layoutId` visibly jumps or animates vertically up and down when elements elsewhere in the form/modal are added, removed, or resized.
```
Segmented toggle indicator pill glides/jumps vertically on the screen when items in a list below are removed.
```

### **Root Cause**:
Framer Motion's `layoutId` tracks global bounding box coordinates in document viewport space across renders. When a sibling or child element changes the container's height (such as removing a person row from a list below), the container's viewport Y position shifts. Framer Motion detects this as a layout change for the `layoutId` element and interpolates its position from the old screen Y coordinate to the new one, resulting in unwanted vertical jumps/bounces.

### **Prevention Rule**:
```tsx
// ❌ WRONG - Using layoutId in controls that can shift vertically when content expands/contracts
<button onClick={() => setTab("a")}>
  Tab A
  {tab === "a" && <motion.div layoutId="tab-pill" className="absolute inset-0 bg-white" />}
</button>
<button onClick={() => setTab("b")}>
  Tab B
  {tab === "b" && <motion.div layoutId="tab-pill" className="absolute inset-0 bg-white" />}
</button>

// ✅ CORRECT - Use a localized CSS transform indicator locked strictly to the container
<div className="relative p-1 bg-slate-100 rounded-full flex">
  <div
    className={clsx(
      "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full transition-transform duration-200 pointer-events-none z-0",
      tab === "a" ? "left-1 translate-x-0" : "left-1 translate-x-full"
    )}
  />
  <button className="flex-1 relative z-10">Tab A</button>
  <button className="flex-1 relative z-10">Tab B</button>
</div>
```

### **Implementation**:
- For 2-tab or N-tab segmented toggles in dynamic modal/dialog layouts that can resize, avoid Framer Motion `layoutId` unless `layoutDependency` or `layout="position"` is explicitly constrained to avoid Y-axis distortion.
- Prefer localized CSS translate transforms (`translate-x-0` / `translate-x-full` with `top-1 bottom-1 left-1`), ensuring the indicator is physically locked vertically inside the toggle bar.
