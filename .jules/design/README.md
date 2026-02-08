# Boks Web BLE - UI/UX Refactoring Plan

## Overview

This document outlines the complete plan for refactoring the Boks Web BLE application to implement significant UI/UX improvements with responsive layouts for both mobile and desktop views.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Proposed Improvements](#proposed-improvements)
3. [Architecture](#architecture)
4. [Implementation Plan](#implementation-plan)
5. [Component Specifications](#component-specifications)
6. [Testing Strategy](#testing-strategy)

## Current State Analysis

The current application has a simple, non-responsive layout:
- Fixed header with app title, connection manager, and language selector
- Two-column grid layout for code management and logs when connected
- Floating action button for adding codes
- Notification system

### Limitations

1. **Non-responsive Design**
   - Same layout for all screen sizes
   - Poor mobile experience

2. **UI/UX Issues**
   - Connect button color matches header (confusing)
   - No clear navigation structure
   - No battery indicator in header

3. **Missing Features**
   - No bottom navigation for mobile
   - No side panel for desktop
   - No configuration modal

## Proposed Improvements

### 1. Connect Button Enhancement
- Rename "Se connecter à l'appareil" to "Se connecter"
- Change color to differentiate from header

### 2. Mobile Layout
- Bottom navigation with 3 tabs:
  - **Codes**: List of codes with 2 accordions (Permanent, Single Use)
  - **Logs**: Log viewer
  - **Configuration**: Settings (content TBD)
  
### 3. Desktop Layout
- Main view: List of codes
- Side panel (small list): Logs
- Settings button: Opens a pop-in (modal) for configuration

### 4. Code Management
- Floating Action Button (FAB) (+) in the bottom right of the code panel to open a pop-in for creating a code

### 5. Header Enhancement
- Add a battery level icon (use known level or crossed-out battery if unknown)

## Architecture

### Component Hierarchy

```
App
├── MainLayout
│   ├── Header
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

### Responsive Design

- **Breakpoint**: 768px
- **Mobile**: ≤ 768px
- **Desktop**: > 768px
- **Implementation**: Material-UI's `useMediaQuery` with theme breakpoints

## Implementation Plan

### Phase 1: Foundation Components

1. **Create MainLayout Component**
   - Implement responsive detection with `useMediaQuery`
   - Set up conditional rendering for MobileView/DesktopView

2. **Refactor ConnectionManager**
   - Move battery indicator to header
   - Update connection button text and styling

3. **Create Header Component**
   - Extract header from current App component
   - Include app title, ConnectionManager, and LanguageSelector

### Phase 2: Mobile Implementation

4. **Create MobileView Component**
   - Implement bottom navigation with 3 tabs
   - Set up routing between CodeManager, LogViewer, and Configuration
   - Add tab icons (List/Key, Log/ListAlt, Settings/Tune)

5. **Update CodeManager for Mobile**
   - Implement accordion-based organization for codes
   - Separate Permanent and Single Use codes into accordions

### Phase 3: Desktop Implementation

6. **Create DesktopView Component**
   - Implement side panel for LogViewer
   - Add configuration button in header that opens modal
   - Maintain main content area for CodeManager

7. **Create ConfigurationModal Component**
   - Implement modal dialog for settings
   - Add open/close functionality from header button

### Phase 4: UI Enhancements

8. **Implement FloatingActionButton**
   - Position in bottom right corner
   - Only show when connected
   - Trigger code creation dialog

9. **Update Styling**
   - Adjust connection button color to differentiate from header
   - Ensure consistent styling across views
   - Implement proper spacing for mobile/desktop

### Phase 5: Testing and Refinement

10. **Test Responsive Behavior**
    - Verify layout switching at 768px breakpoint
    - Test on various screen sizes
    - Ensure touch targets are appropriate for mobile

11. **Accessibility Review**
    - Ensure proper ARIA attributes
    - Verify keyboard navigation
    - Check color contrast for both light/dark modes

## Component Specifications

### Main Components

#### MainLayout.jsx
- Wrapper component that handles responsive layout switching
- Uses `useMediaQuery` to determine screen size
- Renders either MobileView or DesktopView based on screen size

#### Header.jsx
- AppBar with app title, connection manager, and language selector
- Consistent across both mobile and desktop views
- Battery indicator integrated into ConnectionManager

#### MobileView.jsx
- Mobile-specific layout with bottom navigation
- Tab-based content switching
- Components:
  - MainContent (renders CodeManager, LogViewer, or Configuration based on active tab)
  - BottomNavigation (with Codes, Logs, Configuration tabs)

#### DesktopView.jsx
- Desktop-specific layout with side panel
- Configuration accessible via button in header
- Components:
  - MainContent (always shows CodeManager)
  - SidePanel (always shows LogViewer)
  - ConfigurationButton (opens ConfigurationModal)

#### FloatingActionButton.jsx
- Positioned in bottom right corner
- Only visible when connected to a device
- Triggers code creation dialog

### Shared Components

#### ConnectionManager.jsx
- Shows connection status and controls
- Displays battery level when connected
- Updated button text and styling

#### CodeManager.jsx
- Manages code creation, listing, and deletion
- Updated with accordions for mobile view
- FAB integration for quick code creation

#### LogViewer.jsx
- Displays device logs
- In side panel on desktop, tab on mobile

#### Configuration.jsx
- Settings and configuration options
- Modal dialog accessible from both views

## Testing Strategy

### Responsive Testing

1. **Breakpoint Verification**
   - Test layout switching at 768px breakpoint
   - Verify components render correctly on both sides of breakpoint

2. **Screen Size Testing**
   - Test on various screen sizes (mobile, tablet, desktop)
   - Verify touch targets are appropriate for mobile
   - Check content readability and layout integrity

### Functional Testing

1. **Connection Flow**
   - Test connection button functionality
   - Verify battery indicator displays correctly
   - Test disconnection flow

2. **Code Management**
   - Test code creation via FAB
   - Verify accordion organization on mobile
   - Test code deletion and editing

3. **Navigation**
   - Test bottom navigation on mobile
   - Verify tab switching works correctly
   - Test configuration modal on desktop

### Accessibility Testing

1. **Keyboard Navigation**
   - Verify all interactive elements are keyboard accessible
   - Test tab order and focus management

2. **Screen Reader Compatibility**
   - Ensure proper ARIA attributes
   - Test with popular screen readers

3. **Color Contrast**
   - Verify sufficient contrast for both light and dark modes
   - Test with color blindness simulators

### Browser Compatibility

1. **Target Browsers**
   - Chrome (latest)
   - Edge (latest)
   - Safari (latest)
   - Firefox (latest)

2. **Web BLE Functionality**
   - Verify Bluetooth connection works in all browsers
   - Test on both desktop and mobile versions

## Files to be Created

1. `src/components/layout/MainLayout.jsx` - Main layout wrapper
2. `src/components/layout/Header.jsx` - Header component
3. `src/components/layout/MobileView.jsx` - Mobile-specific layout
4. `src/components/layout/DesktopView.jsx` - Desktop-specific layout
5. `src/components/ConfigurationModal.jsx` - Settings modal
6. `src/components/FloatingActionButton.jsx` - FAB component

## Files to be Modified

1. `src/app.jsx` - Simplify to use new layout components
2. `src/components/ConnectionManager.jsx` - Update button text/styling, move battery indicator
3. `src/components/CodeManager.jsx` - Add accordion organization for mobile
4. `src/theme.js` - Potentially adjust theme if needed

## Expected Outcomes

### Mobile View
- Bottom navigation with Codes, Logs, and Configuration tabs
- Single main content area that switches based on active tab
- Accordion organization for codes
- FAB in bottom right for code creation
- Battery icon in header

### Desktop View
- Main content area showing code management
- Right sidebar showing logs
- Settings button in header that opens configuration in a modal
- FAB in bottom right for code creation
- Battery icon in header

### Both Views
- Consistent header with app title, connection controls, and language selector
- Proper responsive behavior at 768px breakpoint
- Accessible and usable interface
- Consistent styling and branding

## Conclusion

This refactoring plan provides a comprehensive approach to improving the UI/UX of the Boks Web BLE application while maintaining its core functionality. The implementation is structured in phases to ensure a smooth transition and minimize risks. The new architecture will provide a better user experience across all device types while maintaining the application's core Bluetooth functionality.