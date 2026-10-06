## 🚨 **Supabase Auth Environment Configuration Prevention**

### **Problem**: Google OAuth or Supabase Auth fails with "Supabase credentials not configured in .env.local" or requests route to placeholder dummy client
```
Supabase credentials not configured in .env.local
POST https://placeholder.supabase.co/auth/v1/... net::ERR_NAME_NOT_RESOLVED
```

### **Root Cause**:
When sanitizing committed secrets or setting up fresh environments, `.env.local` was created without the public Supabase client variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). As a result, `isSupabaseConfigured` evaluated to `false`, causing OAuth calls to fail immediately or route to a dummy client. Additionally, OAuth handlers lacked centralized error detection and redirect fallbacks.

### **Prevention Rule**:
```bash
# ❌ WRONG - Omitting Supabase keys in .env.local, leaving client unconfigured
GROQ_API_KEY=...
NEXT_PUBLIC_GROQ_API_KEY=...

# ✅ CORRECT - Always ensure public Supabase credentials exist in .env.local matching .env.example
GROQ_API_KEY=...
NEXT_PUBLIC_GROQ_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

### **Implementation**:
- Verify that `.env.local` contains valid `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Always import and call the centralized `signInWithGoogle()` helper from `@/lib/supabase` rather than calling `supabase.auth.signInWithOAuth()` ad-hoc.
- Check and handle URL query/hash error parameters (`error_description`, `error`) in `/auth/callback` to prevent indefinite loading states when OAuth consent is cancelled.
