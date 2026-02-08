# Boks Web BLE - Responsive Layout Plan

## Current Structure Analysis

The current application has a simple layout with:
- Fixed header containing app title, connection manager, and language selector
- Two-column grid layout for code management and logs when connected
- Floating action button for adding codes
- Notification system

## Proposed New Structure

### Component Hierarchy

```
App
├── MainLayout
│   ├── Header (AppBar)
│   │   ├── App Title
│   │   ├── ConnectionManager (with battery indicator)
│   │   └── LanguageSelector
│   ├── MobileView (when isMobile)
│   │   ├── MainContent
│   │   │   └── Routes (CodeManager, LogViewer, Configuration)
│   │   └── BottomNavigation
│   ├── DesktopView (when not isMobile)
│   │   ├── MainContent
│   │   │   ├── CodeManager (main view)
│   │   │   └── ConfigurationModal (pop-in)
│   │   └── SidePanel (LogViewer)
│   └── FloatingActionButton
└── Notifications
```

### Responsive Behavior

1. **Mobile Layout (≤768px)**
   - Bottom navigation with 3 tabs: Codes, Logs, Configuration
   - Single main content area that switches based on selected tab
   - FAB in bottom right for code creation
   - Battery icon in header

2. **Desktop Layout (>768px)**
   - Main content area showing code management
   - Right sidebar showing logs
   - Settings button in header that opens configuration in a modal
   - FAB in bottom right for code creation
   - Battery icon in header

### Material-UI Components to Use

1. **Responsive Detection**
   - `useMediaQuery` hook for screen size detection
   - Theme breakpoints for consistent behavior

2. **Layout Components**
   - `Box` and `Container` for main layout structure
   - `AppBar` and `Toolbar` for header
   - `BottomNavigation` and `BottomNavigationAction` for mobile navigation
   - `Drawer` for desktop side panel
   - `Fab` for floating action button
   - `Dialog` or `Modal` for configuration settings

3. **Navigation Icons**
   - Codes: ListIcon or KeyIcon
   - Logs: HistoryIcon or ListAltIcon
   - Configuration: SettingsIcon or TuneIcon

### Implementation Steps

1. Create MainLayout component to wrap the entire application
2. Implement responsive detection with useMediaQuery
3. Create MobileView with BottomNavigation
4. Create DesktopView with side panel
5. Refactor ConnectionManager to move battery indicator to header
6. Update routing to support tab-based navigation on mobile
7. Implement configuration modal for settings
8. Ensure consistent styling across views
9. Test responsive behavior across different screen sizes

### Color Scheme Updates

1. Change "Se connecter à l'appareil" button text to "Se connecter"
2. Update button color to differentiate from header (use secondary color or outlined variant)

## Detailed Component Specifications

### MainLayout.jsx
- Wrapper component that handles responsive layout switching
- Implements useMediaQuery for screen size detection
- Renders either MobileView or DesktopView based on screen size

### Header.jsx
- AppBar with app title
- ConnectionManager with battery indicator moved to header
- LanguageSelector

### MobileView.jsx
- Main content area that renders different components based on active tab
- BottomNavigation with 3 tabs (Codes, Logs, Configuration)
- State management for active tab

### DesktopView.jsx
- Main content area showing CodeManager
- SidePanel (Drawer) showing LogViewer
- Configuration button in header that opens modal

### FloatingActionButton.jsx
- Positioned in bottom right corner
- Only visible when connected
- Triggers code creation dialog

### ConfigurationModal.jsx
- Modal dialog for settings
- Accessible from both mobile (tab) and desktop (header button)