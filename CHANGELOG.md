# Changelog

All notable changes to this project will be documented in this file.

## [1.2.1] - 2025-12-27
### ⚡ Performance
- **Critical Fix**: Disabled automatic snapshot loading in the camera list. This prevents timeouts (Error 504) for users with large event databases.

### 🛡️ Security & Anti-Spam
- **WhatsApp Deduplication**: Implemented intelligent duplicate detection.
  - **Time Filter**: Events within 60s are checked for duplication.
  - **Spatial Filter**: Compares the bounding box of the new object vs the old one. If the object hasn't moved significanty (>50px), the alert is suppressed.

## [1.2] - 2025-12-24

### 🔒 Security & Architecture
- **Multi-Tenant Isolation**: Implemented strict data separation at the database level. Events now store `user_id` to prevent data leakage between users, even if they share identical camera names (e.g., "Kitchen").

### ✨ Features
- **Advanced Alerts Filtering**: 
  - Added **Multi-Select** dropdowns for Cameras and Labels.
  - Implemented **Date/Time Range** filters with correct Timezone handling (Local -> UTC).
- **Internationalization**: 
  - Added Spanish translations for object detection labels (e.g., "person" -> "Persona", "dog" -> "Perro").
  - **Refined Labels**: "Car,bus,truck" rules now appear as separate selectable options.

### 💄 UI/UX
- **Collapsible Filters**: Cleaned up the dashboard by hiding filter options behind a toggle button.
- **Infinite Event Modal**: 
  - New pop-up viewer for events with large snapshots.
  - Seamless navigation between events, automatically loading previous/next pages.
- **Design Polish**: Updated dropdown hover states to a cleaner neutral gray palette.
- **Bug Fixes**: 
  - Resolved timezone issues preventing Date From/To filters from working.
  - Fixed syntax errors in Hits dashboard.
