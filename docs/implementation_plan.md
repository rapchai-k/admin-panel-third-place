# Admin Gallery Migration Plan

Migrate admin Event/Community media management from single `image_url` uploads to `gallery_media` + `galleries` bucket.

## Current State (Verified)

### Admin codebase (`place-command-center`)
- Event and Community forms still use single-image `FileUpload` bound to `image_url`.
- Event uploads go to `event-images/events/...`.
- Community uploads go to `community-images/communities/...`.
- Admin list/detail surfaces still render `image_url`.
- Generated Supabase types do not include `gallery_media`.
- Admin migrations currently define bucket policies for `event-images` and `community-images` only.

### Consumer codebase (`the-third-place`)
- Has migration `20260302083111_create_gallery_media.sql` creating:
  - `public.gallery_media`
  - `storage.buckets` entry for `galleries`
  - public read policies for `gallery_media` and `storage.objects` (`galleries` bucket)
- Consumer pages already read `gallery_media` for home/event/community gallery displays.

## Decisions
- `galleries` bucket already exists in remote and is the target bucket.
- Admin will move fully to gallery-based media management.
- No backward compatibility work in admin flows (`image_url` is not the source of truth after this migration work).

## Target State

### Data model
- Use `public.gallery_media` as source of truth for event/community media.
- Keep ownership constraint: exactly one of `event_id` or `community_id` is non-null.
- Maintain stable media ordering via `sort_order`.

### Storage
- Store assets in `galleries` bucket at:
  - `events/{eventId}/{timestamp}-{filename}`
  - `communities/{communityId}/{timestamp}-{filename}`

### Admin UX
- Replace single-image field with multi-media manager in:
  - `src/components/admin/EventModal.tsx`
  - `src/components/admin/CommunityModal.tsx`
- Support:
  - add multiple files
  - preview existing + newly selected files
  - remove media
  - reorder media (persist `sort_order`)

## Implementation Plan

### 1. Database and policy alignment
1. Add an admin migration aligned with consumer `gallery_media` schema (idempotent `IF NOT EXISTS` where applicable).
2. Add/verify admin write policies for:
   - `public.gallery_media` (`INSERT`, `UPDATE`, `DELETE` for admins)
   - `storage.objects` in `galleries` (`INSERT`, `UPDATE`, `DELETE` for admins)
3. Ensure file type restrictions are enforced for image uploads in `galleries` policies.
4. Register the migration in migration registry workflow for cross-repo coordination.

### 2. Types and domain model
1. Regenerate or update `src/integrations/supabase/types.ts` to include `gallery_media`.
2. Add local UI types for editor state (existing media vs pending uploads).

### 3. New reusable UI component
1. Create `src/components/ui/multi-file-upload.tsx`.
2. Component behavior:
   - accepts existing media list
   - accepts newly picked `File[]`
   - emits: `addedFiles`, `removedMediaIds`, `orderedMedia`
   - supports drag/drop + reorder interactions

### 4. Event modal refactor
1. Remove `image_url` form field usage from `EventModal`.
2. On submit:
   - create/update event first
   - upload new files to `galleries/events/{eventId}/...`
   - insert `gallery_media` rows with `event_id`, `media_url`, `mimetype`, `sort_order`
   - delete removed media rows + storage objects
   - persist updated sort order for retained rows
3. Keep operations resilient: if one step fails, surface clear error and avoid silent partial success.

### 5. Community modal refactor
1. Remove `image_url` form field usage from `CommunityModal`.
2. On submit:
   - create/update community first
   - upload new files to `galleries/communities/{communityId}/...`
   - insert `gallery_media` rows with `community_id`, `media_url`, `mimetype`, `sort_order`
   - delete removed media rows + storage objects
   - persist updated sort order for retained rows
3. Keep same error-handling guarantees as event flow.

### 6. Admin surface updates
1. Update admin list/detail views that currently rely on `image_url` to use first gallery media item where media previews are needed.
2. Remove single-image assumptions from interfaces/types used by admin pages.

## Verification Plan

### Automated checks
- Run lint/typecheck after refactor.
- Run existing test suite if available for touched areas.

### Manual validation
1. Create Community with 3 images.
2. Verify storage paths in `galleries/communities/{id}/...` and `gallery_media` rows with ordered `sort_order`.
3. Edit Community: reorder, delete one, add one; verify DB + storage consistency.
4. Create Event with 3 images and repeat same edit flow.
5. Confirm admin list/detail pages render media from gallery data.
6. Confirm no admin flow depends on writing `image_url`.

## Risks and Mitigations
- Partial failures across storage + DB operations:
  - Mitigate with explicit sequencing and rollback/cleanup where feasible.
- Cross-repo drift (admin vs consumer migrations):
  - Mitigate by registering migration and checking registry status before/after deploy.
- Policy mismatches in remote environments:
  - Mitigate with a pre-flight checklist: bucket exists, admin write policies active, file-type restrictions active.
