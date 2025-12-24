# Changelog

All notable changes to this project will be documented in this file.

## [1.2] - 2025-12-24

### 🔒 Security & Architecture
- **Multi-Tenant Isolation**: Implemented strict data separation at the database level. Events now store `user_id` to prevent data leakage between users, even if they share identical camera names (e.g., "Kitchen").

### ✨ Features
- **Advanced Alerts Filtering**: 
  - Added **Multi-Select** dropdowns for Cameras and Labels.
  - Implemented **Date/Time Range** filters with correct Timezone handling (Local -> UTC).
- **Internationalization**: 
  - Added Spanish translations for object detection labels (e.g., "person" -> "Persona", "dog" -> "Perro").

### 💄 UI/UX
- **Design Polish**: Updated dropdown hover states to a cleaner neutral gray palette.
- **Bug Fixes**: Resolved z-index issues where dropdown menus were occluded by adjacent cards.
