# Agent Hub Portal - URL Routing Standard

This document defines the URL path structure for Agent Hub Portal according to Enterprise Architecture Guidelines Section 5.1 (APIs).

## EA Standard: URL Path Structure

All routes MUST follow this pattern:
```
/{resource}/{identifier}/{sub-resource}
```

## Routing Table

| Pattern | Example | Description |
|---------|---------|-------------|
| `/cma` | `/cma` | CMA collection |
| `/cma/:id` | `/cma/38a430e1-b749-4dc1-b7bc-fb8b161c2ffa` | Single CMA record |
| `/cma/:id/cma-presentation` | `/cma/38a430e1-.../cma-presentation` | CMA Presentation view |
| `/cma/:id/edit` | `/cma/38a430e1-.../edit` | CMA Builder/Editor |
| `/api/cma/:id` | `/api/cma/38a430e1-...` | API endpoint |
| `/api/cma/:id/comparables` | `/api/cma/38a430e1-.../comparables` | API sub-resource |

## Rules

### Path Structure
- **Hyphens over underscores**: Use `cma-presentation` not `cma_presentation`
- **Lowercase paths always**: No uppercase letters in URLs
- **UUIDs for identifiers**: Use UUID format for resource identifiers
- **No file extensions**: URLs should not include `.html`, `.json`, etc.

### Consistency
- **Client routes mirror API routes**: Where possible, client-side routes should follow the same pattern as API endpoints
- **File structure mirrors URL paths**: Codebase organization should reflect the URL structure

### Examples of Correct vs Incorrect

✅ **Correct:**
- `/cma/38a430e1-b749-4dc1-b7bc-fb8b161c2ffa/cma-presentation`
- `/api/cma/38a430e1-b749-4dc1-b7bc-fb8b161c2ffa/comparables`
- `/dashboard`

❌ **Incorrect:**
- `/cma_presentation/38a430e1-b749-4dc1-b7bc-fb8b161c2ffa` (underscores, wrong order)
- `/CMA/38a430e1-b749-4dc1-b7bc-fb8b161c2ffa` (uppercase)
- `/cma/38a430e1-b749-4dc1-b7bc-fb8b161c2ffa/presentation.html` (file extension)

## File Structure Alignment

The codebase file structure should mirror URL paths:

```
components/
├── cma-presentation/
│   ├── pages/
│   │   └── CMAPresentation.tsx    # /cma/:id/cma-presentation
│   └── widgets/
│       └── PropertyDetailModal.tsx
├── cma/
│   ├── pages/
│   │   ├── CMAList.tsx            # /cma
│   │   └── CMAEdit.tsx            # /cma/:id/edit
│   └── components/
```

This prevents confusion about which files handle which routes and ensures maintainability.

## Current Route Audit

### ✅ EA Standard Compliant
- `/cma` → CMA collection
- `/cma/:id` → Single CMA record  
- `/cma/:id/cma-presentation` → CMA Presentation view
- `/admin/pages/:id/edit` → Admin page editor
- `/admin/communities/:slug` → Community editor
- `/admin/blog/posts/:slug` → Blog post editor

### ✅ Acceptable Patterns
- `/cma/:id/presentation-builder` → CMA presentation builder (sub-resource pattern)
- `/share/:token` → Public sharing (different resource pattern)
- `/app/:id` → App view (different resource pattern)

### ✅ Properly Deprecated
- `/cma/:id/presentation` → Redirects to `/cma/:id/cma-presentation` ✅

### 📁 File Structure Alignment
**Good:**
- `components/cma-presentation/pages/CMAPresentation.tsx` → handles `/cma/:id/cma-presentation`
- `pages/cma.tsx` → handles `/cma`
- `pages/cma-builder.tsx` → handles `/cma/:id`

**File structure properly mirrors URL structure** ✅

## Implementation Notes

This standard was implemented to address routing confusion where developers edited incorrect files due to misaligned URL patterns and file structures. 

**Audit Result:** Current routing structure is **EA Standard compliant**. No changes required.

**Version:** 1.0  
**Last Updated:** 2026-02-17  
**Next Review:** 2026-03-17