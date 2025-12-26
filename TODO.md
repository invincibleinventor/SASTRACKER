# SASTRACKER TODO - Comprehensive Bug & Feature List

## User-Requested Features (Priority)
- [x] Multiple resume uploads with flagship designation
- [x] User profile linking (click name/avatar → profile page)
- [x] Rename "Steal Template" → "Fork Resume" (all files)
- [x] Rename "Compare Resume" → "Diff Viewer" (all files)

---

## Critical Bugs

### Resume Submit Limitation
**File:** `app/resumes/submit/page.tsx:68-72`
**Status:** ✅ FIXED - Now supports multiple resumes with flagship selection

### Hardcoded Backend URLs
**Files:** `fork/page.tsx`, `diff/page.tsx`
**Status:** ✅ FIXED - Uses conditional server URLlevance

### Compare Page Fetches All Resumes
**File:** `app/resumes/compare/page.tsx:61-68`
**Bug:** `fetchTemplates()` gets ALL approved resumes unrestricted
**Fix:** Add pagination or limit, filter by relevance

### Steal Page Shows Only Approved (Not User-Owned)
**File:** `app/resumes/steal/page.tsx`
**Bug:** User can't select their own pending resumes
**Fix:** Merge user resumes query with approved templates

### Hardcoded Backend URLs
**Files:**
- `app/resumes/steal/page.tsx:160` - `localhost:8000`
- `app/upload/page.tsx:349` - conditional but still hardcoded
**Fix:** Use `process.env.NEXT_PUBLIC_BACKEND_URL` everywhere

---

## UI/UX Bugs

### User Names Not Linked
**Affected Files:**
- `app/resumes/page.tsx` - resume cards show `user_name` unlinked
- `app/resumes/[id]/page.tsx` - detail page author unlinked
- `app/projects/page.tsx:379` - project cards show `user_name` unlinked
- `app/admin/comments/page.tsx:198` - comment authors unlinked
**Fix:** Wrap `user_name` in `<Link href={/profile/${user_id}}>`

### Missing Pagination
- [x] `app/resumes/page.tsx` - DONE
- [x] `app/admin/resumes/page.tsx` - DONE
- [x] `app/admin/projects/page.tsx` - DONE
- [x] `app/admin/pyqs/page.tsx` - DONE
- [x] `app/profile/page.tsx` - DONE
- [ ] `app/admin/comments/page.tsx` - needs Load More
- [ ] `app/projects/page.tsx` - needs Load More

### Non-Sastra Profile Missing PyQ Tab
**File:** `app/profile/[userId]/page.tsx`
**Issue:** Should hide PyQ stats/tab for non-SASTRA users (currently shows error)

---

## Logic Bugs

### Race Conditions
**Files:** `app/resumes/[id]/page.tsx:72`
**Bug:** View count increment using client-side `(count || 0) + 1`
**Risk:** Multiple users can cause missed increments
**Fix:** Use Supabase RPC or trigger (already exists)

### Dashboard Uses Wrong Field
**File:** `app/dashboard/page.tsx:34`
**Bug:** Queries `user_id` but papers table uses `author_id`
**Fix:** Change `.eq('user_id', userId)` to `.eq('author_id', userId)`

---

## Naming Changes Required

### Route Renames
- `/resumes/steal` → `/resumes/fork`
- `/resumes/compare` → `/resumes/diff`

### Text Renames (21+ locations)
| Current | New |
|---------|-----|
| "Steal Template" | "Fork Resume" |
| "Steal This Template" | "Fork This Resume" |
| "Compare Resumes" | "Diff Viewer" |
| `steals_count` | `fork_count` (already exists) |

### Files to Update
- `middleware.ts:13`
- `app/resumes/page.tsx:161,188,236,239,292`
- `app/resumes/[id]/page.tsx:296,299`
- `app/resumes/steal/page.tsx` (entire file + rename)
- `app/resumes/compare/page.tsx` (entire file + rename)
- `backend/main.py:323,350,351`

---

## Admin Panel Improvements
- [ ] Date range filters in analytics
- [ ] Bulk operations in PyQ admin
- [ ] Search in moderation dashboard
- [ ] Export functionality for analytics

---

## Database
- [ ] Add index on `resumes(user_id, status)`
- [ ] Use `is_flagship` column (currently unused)
- [ ] Use `flagship_resume_id` in profiles (currently unused)
