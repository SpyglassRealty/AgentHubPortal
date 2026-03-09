# Standard QA Checklist for Deployments

## Pre-Flight Checks
- [ ] Deployment completed successfully (no build errors)
- [ ] Correct environment (production/staging)
- [ ] Previous version backed up/documented

## 1. Visual Regression Testing
- [ ] Homepage loads correctly
- [ ] Navigation menu displays properly
- [ ] Hero images/banners render
- [ ] Footer links work
- [ ] Compare screenshots with baseline

## 2. Core Functionality
- [ ] Search works (try: "3 bedroom Austin")
- [ ] Filters apply correctly
- [ ] Forms submit (contact, lead capture)
- [ ] Authentication flows (login/logout)
- [ ] API responses < 500ms

## 3. Console & Network
- [ ] No JavaScript errors in console
- [ ] No 404s or failed requests
- [ ] No mixed content warnings
- [ ] Performance metrics acceptable

## 4. Mobile Responsiveness
- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Touch targets adequate size
- [ ] No horizontal scroll
- [ ] Images optimize for mobile

## 5. Critical User Paths
- [ ] New user can register
- [ ] Search → View listing → Contact agent
- [ ] Community pages load
- [ ] Blog posts accessible
- [ ] Admin functions work (if applicable)

## 6. Deployment Verification
- [ ] New features visible (if any)
- [ ] Version number updated
- [ ] Environment variables loaded
- [ ] Database migrations complete

## Reporting Format
```
QA REPORT: [PROJECT_NAME]
Status: ✅ PASS / ❌ FAIL
Deployment: [COMMIT_HASH]
Tested: [TIMESTAMP]

✅ Visual regression - No issues
✅ Core functionality - All working  
⚠️  Console - 1 warning (non-critical)
✅ Mobile - Responsive on all devices
✅ User paths - Tested successfully

Issues Found:
- Minor: Console warning about deprecated API
- Fixed: Already patched in latest commit

Recommendation: Safe to keep in production
```