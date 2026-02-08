# Component Specifications

## Overview

This document provides detailed specifications for each component in the new responsive layout of the Boks Web BLE application.

## Main Components

### MainLayout.jsx

**Purpose**: Wrapper component that handles responsive layout switching based on screen size.

**Props**: None

**State**:

- Uses `useMediaQuery` to determine screen size

**Responsibilities**:

- Detect screen size using Material-UI's `useMediaQuery`
- Render MobileView when screen width ≤ 768px
- Render DesktopView when screen width > 768px
- Provide consistent layout structure for both views

**Dependencies**:

- `useMediaQuery` from '@mui/material'
- MobileView component
- DesktopView component

### Header.jsx

**Purpose**: AppBar component that contains the app title, connection manager, and language selector.

**Props**: None

**State**: None

**Responsibilities**:

- Display app title ("Boks Web BLE")
- Render ConnectionManager component
- Render LanguageSelector component
- Maintain consistent styling across views

**Dependencies**:

- AppBar, Toolbar, Typography from '@mui/material'
- ConnectionManager component
- LanguageSelector component

### MobileView.jsx

**Purpose**: Mobile-specific layout with bottom navigation and tab-based content switching.

**Props**: None

**State**:

- `activeTab`: integer representing the currently active tab (0: Codes, 1: Logs, 2: Configuration)

**Responsibilities**:

- Display bottom navigation with three tabs
- Switch main content based on active tab
- Handle tab change events
- Maintain tab state

**Components**:

- MainContent (conditionally renders CodeManager, LogViewer, or Configuration)
- BottomNavigation with BottomNavigationAction components

**Dependencies**:

- BottomNavigation, BottomNavigationAction from '@mui/material'
- CodeManager, LogViewer, Configuration components
- Icons: ListIcon (or KeyIcon), HistoryIcon (or ListAltIcon), SettingsIcon (or TuneIcon)

### DesktopView.jsx

**Purpose**: Desktop-specific layout with split view (main content + side panel).

**Props**: None

**State**:

- `configOpen`: boolean representing whether configuration modal is open

**Responsibilities**:

- Display CodeManager in main content area
- Display LogViewer in side panel
- Provide button to open ConfigurationModal
- Handle configuration modal open/close state

**Components**:

- MainContent (always renders CodeManager)
- SidePanel (always renders LogViewer)
- ConfigurationButton (opens ConfigurationModal)
- ConfigurationModal (dialog for settings)

**Dependencies**:

- Drawer from '@mui/material'
- CodeManager, LogViewer, ConfigurationModal components

### FloatingActionButton.jsx

**Purpose**: Floating action button for creating new codes.

**Props**:

- `onClick`: function to handle button click
- `isVisible`: boolean to control visibility

**State**: None

**Responsibilities**:

- Display FAB in bottom right corner
- Only visible when connected to a device
- Trigger code creation dialog on click

**Dependencies**:

- Fab, AddIcon from '@mui/material'

## Shared Components

### ConnectionManager.jsx

**Purpose**: Manage Bluetooth connection and display battery level.

**Props**: None

**State**:

- `isConnected`: boolean representing connection status
- `device`: object representing connected device
- `batteryLevel`: integer representing battery level
- `isConnecting`: boolean representing connection state

**Responsibilities**:

- Handle connect/disconnect actions
- Display connection status
- Display battery level when connected
- Show battery icon with appropriate styling

**Dependencies**:

- Button, CircularProgress, Typography, Box, Tooltip, IconButton from '@mui/material'
- BatteryFullIcon, BatteryAlertIcon, BluetoothConnectedIcon, BluetoothDisabledIcon from '@mui/icons-material'
- useBLE hook

### CodeManager.jsx

**Purpose**: Manage code creation, listing, and deletion.

**Props**:

- `deviceId`: string representing the connected device ID
- `showAddForm`: boolean to control add form visibility
- `setShowAddForm`: function to update add form visibility
- `showNotification`: function to display notifications

**State**:

- `codes`: array of code objects from localStorage
- `newCode`: string for new code input
- `codeType`: string representing code type ('master', 'single', 'multi')
- `index`: integer for master code index
- `description`: string for code description
- `codeError`: string for code validation errors

**Responsibilities**:

- Display list of saved codes
- Handle code creation with validation
- Handle code deletion
- Mark codes as used based on log data
- Provide add code form in dialog

**Dependencies**:

- useState, useEffect from 'react'
- useLocalStorage hook
- useTranslation hook
- Various Material-UI components for UI

### LogViewer.jsx

**Purpose**: Display device logs.

**Props**:

- `deviceId`: string representing the connected device ID
- `showNotification`: function to display notifications

**State**:

- `logs`: array of log objects from localStorage
- `parsedLogs`: array of parsed log objects
- `pendingLogsCount`: integer representing pending logs count

**Responsibilities**:

- Display logs in a table format
- Parse logs for code usage information
- Handle log refresh actions
- Show pending logs count

**Dependencies**:

- useState, useEffect from 'react'
- useLocalStorage hook
- useTranslation hook
- useBLE hook
- Paper, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow, Box from '@mui/material'

### Configuration.jsx

**Purpose**: Display and manage application settings.

**Props**:

- `open`: boolean to control modal visibility
- `onClose`: function to handle modal close

**State**:

- Configuration settings (TBD based on requirements)

**Responsibilities**:

- Display configuration options
- Handle setting changes
- Save settings to localStorage
- Provide save/cancel actions

**Dependencies**:

- Dialog, DialogTitle, DialogContent, DialogActions from '@mui/material'
- Various form components from '@mui/material'

## New Components to Create

### ConfigurationModal.jsx

**Purpose**: Modal dialog for configuration settings.

**Props**:

- `open`: boolean to control modal visibility
- `onClose`: function to handle modal close

**State**:

- Configuration settings (TBD)

**Responsibilities**:

- Display configuration options in a modal dialog
- Handle setting changes
- Save settings
- Provide save/cancel actions

**Dependencies**:

- Dialog, DialogTitle, DialogContent, DialogActions from '@mui/material'
- Various form components from '@mui/material'

## Responsive Design Implementation

### Screen Size Detection

Use Material-UI's `useMediaQuery` hook with theme breakpoints:

```javascript
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('md')); // <= 768px
```

### Layout Switching

MainLayout will conditionally render MobileView or DesktopView based on screen size:

```javascript
{
  isMobile ? <MobileView /> : <DesktopView />;
}
```

## Component Communication

### State Management

- Global state will be managed through existing hooks (useBLE, useLocalStorage)
- Component-specific state will be managed with useState
- No additional state management library is needed for this scope

### Event Handling

- Parent components will pass callback functions to child components
- Child components will call these callbacks to communicate changes
- No complex event system is needed for this scope

## Styling Considerations

### Consistent Spacing

- Use theme.spacing() for consistent margins and padding
- Maintain consistent typography hierarchy
- Use theme.palette for consistent colors

### Responsive Spacing

- Adjust padding and margins based on screen size
- Use different typography variants for mobile vs desktop
- Ensure touch targets are appropriately sized for mobile

### Dark Mode Support

- Use theme.palette for color values
- Ensure sufficient contrast for both light and dark modes
- Test components in both color schemes
