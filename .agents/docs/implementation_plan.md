# Bottom Sheet Update for Quests

We need to update the bottom sheet (popup) that appears when clicking a Quest pin on the map. Currently, it only shows basic information (title, category, start time, description). You want it to display rich information similar to the full quest details page.

## Proposed Changes

### `BottomSheet.tsx`
We will replace the static HTML for `mode === 'quest'` with a new internal component: `<QuestBottomSheetContent />`.

### `<QuestBottomSheetContent />` Component
This component will use the `useQuestDetail` hook to fetch the full details of the quest in the background while displaying the basic information immediately.
It will display:
- **Hero Image**: A small hero image fetched from Google Places API using the location's `osm_id`.
- **Quest Title**: Displayed prominently.
- **Location Name**: Shown with a MapPin icon.
- **Start Time & Category**: Formatted nicely.
- **Attendees (Who Joined)**: A row of small circular avatars showing who has joined the quest.
- **Action Buttons**:
  - `View Quest`: Navigates to the full quest page.
  - `Get Directions`: Opens Google Maps with directions to the quest's location.
  - `Invite Others`: Copies the link to the quest to the user's clipboard and shows a brief "Copied!" notification.

## Open Questions
- For the "Invite Others" button, does a simple "Copy Link to Clipboard" functionality work for your needs? This is usually the easiest way to let users text/message the link to their friends.
- Is there any specific height limit you want for the small hero image? I plan to make it a sleek 150px-180px tall header image to save screen space while still looking great.

Please review this plan and let me know if it sounds good or if you'd like any adjustments!
