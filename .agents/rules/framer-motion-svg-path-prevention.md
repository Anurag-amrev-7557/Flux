## 🚨 **Framer Motion SVG Path Attribute Prevention**

### **Problem**: `<motion.path>` animating `d` keyframes without an initial `d` attribute causes browser SVG parser error
```
render.mjs:15 Error: <path> attribute d: Expected moveto path command ('M' or 'm'), "undefined".
renderSVG @ render.mjs:15
renderInstance @ SVGVisualElement.mjs:51
VisualElement.render @ VisualElement.mjs:163
```

### **Root Cause**:
When using Framer Motion's `<motion.path>` to animate `d` with keyframes (e.g. `animate={{ d: [path1, path2, ...] }}`), omitting the static `d` attribute or `initial={{ d: path1 }}` causes Framer Motion during initial SSR or DOM mount to emit `d="undefined"` to the SVG `<path>` element before the animation frame starts. The browser's native SVG parser rejects `undefined` as a valid path command.

### **Prevention Rule**:
```tsx
// ❌ WRONG - No initial d attribute on motion.path
<motion.path
    animate={{ d: [path1, path2, path3] }}
    transition={{ duration: 3, repeat: Infinity }}
/>

// ✅ CORRECT - Always define explicit static d and initial={{ d: ... }}
<motion.path
    d={path1}
    initial={{ d: path1 }}
    animate={{ d: [path1, path2, path3] }}
    transition={{ duration: 3, repeat: Infinity }}
/>
```

### **Implementation**:
- Whenever using `<motion.path>` with animated `d` arrays or keyframes, always supply both `d={initialPath}` and `initial={{ d: initialPath }}` to ensure the SVG element has a valid path descriptor during initial render and SSR.
