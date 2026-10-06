## 🚨 **WhatsApp URL Encoding and Emoji Corruption Prevention**

### **Problem**: Emojis in `wa.me/?text=...` links are replaced by diamond question mark characters (`` / `%EF%BF%BD`) when opened in WhatsApp Web or desktop.
```
 FLUX · BILL SPLIT
 Expense: Dinner
 Total Bill: ₹ 50.00
```

### **Root Cause**:
The `https://wa.me/?text=` URL shortener performs an HTTP 302 redirect on Meta edge servers to `https://api.whatsapp.com/send/?text=...`. During this redirect, the server parses the percent-encoded query parameter as Latin-1 instead of multi-byte UTF-8, destroying multi-byte emoji sequences (e.g. `%E2%9A%A1` or `%F0%9F%92%B0`) and replacing each byte with `%EF%BF%BD` (Unicode replacement character ``).

### **Prevention Rule**:
```tsx
// ❌ WRONG - wa.me 302 redirect corrupts UTF-8 emojis into 
const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
window.open(url, "_blank");

// ✅ CORRECT - Direct API endpoint preserves UTF-8 emoji encoding
const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
window.open(url, "_blank", "noopener,noreferrer");
```

### **Implementation**:
- Never use `https://wa.me/?text=` when the message contains emojis or non-ASCII characters.
- Always use `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}` or native app scheme `whatsapp://send?text=...`.
