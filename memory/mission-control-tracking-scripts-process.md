# Mission Control Tracking Scripts Verification Process

When Trisha adds new scripts to Mission Control's global tracking scripts, follow this verification process:

## 1. Check Mission Control API
```bash
# Check head scripts
curl -s "https://missioncontrol-tjfm.onrender.com/api/global-scripts?position=head" | python3 -m json.tool

# Check body scripts  
curl -s "https://missioncontrol-tjfm.onrender.com/api/global-scripts?position=body" | python3 -m json.tool
```

## 2. Verify on Live Sites

### Main Spyglass Website (spyglassrealty.com)
- Open in browser
- Check for script presence using browser console
- Verify global objects (window.gtag, window.clarity, etc.)
- Check network tab for script loading

### Vercel Deployment (spyglass-idx.vercel.app)
- Note: Uses 5-minute cache via Next.js ISR
- May need to wait for cache refresh or trigger new deployment
- Check same verification steps as main site

## 3. Verification Code Snippets

For Google Analytics:
```javascript
(() => { 
  return {
    hasGtag: typeof window.gtag !== 'undefined',
    hasDataLayer: typeof window.dataLayer !== 'undefined',
    ga4ScriptLoaded: Array.from(document.scripts).some(s => s.src && s.src.includes('googletagmanager.com/gtag/js'))
  };
})()
```

For Microsoft Clarity:
```javascript
(() => {
  return {
    clarityGlobal: typeof window.clarity !== 'undefined',
    clarityScript: Array.from(document.scripts).find(s => s.src && s.src.includes('clarity.ms/tag/'))?.src
  };
})()
```

## 4. Important Notes
- GlobalScripts component fetches from Mission Control
- Vercel site has 5-minute ISR cache
- Scripts should appear in `[data-global-script]` attributes
- Both GA4 and Clarity are currently active with IDs:
  - GA4: G-H1JCMLR01K (from Mission Control)
  - Clarity: vqmddwl2dv (from Mission Control)

Last verified: March 4, 2026