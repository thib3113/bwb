import React, { useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  MeetingRoom as MeetingRoomIcon,
  Build as BuildIcon,
  BugReport as BugReportIcon,
  Handyman as MaintenanceIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  DeveloperMode as DeveloperIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDevice } from '../../../hooks/useDevice';
import { useDeveloperContext } from '../../../context/DeveloperContextTypes';
import { DeveloperVersion } from './DeveloperVersion';

interface NavigationDrawerProps {
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const NavigationDrawer = ({ showNotification }: NavigationDrawerProps) => {
  const { t } = useTranslation(['header', 'common', 'settings', 'wizard']);
  const navigate = useNavigate();
  const { knownDevices } = useDevice();
  const { isDeveloperMode } = useDeveloperContext();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer =
    (open: boolean) =>
    (event: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => {
      if (event.type === 'keydown') {
        const kbEvent = event as React.KeyboardEvent<HTMLElement>;
        if (kbEvent.key === 'Tab' || kbEvent.key === 'Shift') {
          return;
        }
      }
      setDrawerOpen(open);
    };

  const handleNavigation = (path: string) => (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).blur();
    navigate(path);
    setDrawerOpen(false);
  };

  return (
    <>
      <IconButton
        edge="start"
        color="inherit"
        aria-label="menu"
        onClick={toggleDrawer(true)}
        sx={{ mr: 2 }}
      >
        <MenuIcon />
      </IconButton>

      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box
          sx={{ width: 250, display: 'flex', flexDirection: 'column', height: '100%' }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <List sx={{ flexGrow: 1 }}>
            <ListItem disablePadding>
              <ListItemButton onClick={handleNavigation('/')} data-testid="nav-home">
                <ListItemIcon>
                  <HomeIcon />
                </ListItemIcon>
                <ListItemText primary="Home" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={handleNavigation('/my-boks')} data-testid="nav-my-boks">
                <ListItemIcon>
                  <MeetingRoomIcon />
                </ListItemIcon>
                <ListItemText primary={t('common:my_boks', { count: knownDevices.length })} />
              </ListItemButton>
            </ListItem>
            <Divider />
            <ListItem disablePadding>
              <ListItemButton onClick={handleNavigation('/debug-wizard')}>
                <ListItemIcon>
                  <BuildIcon />
                </ListItemIcon>
                <ListItemText primary={t('wizard:title')} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={handleNavigation('/debug-view')}>
                <ListItemIcon>
                  <BugReportIcon />
                </ListItemIcon>
                <ListItemText primary="Packet Logger" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={handleNavigation('/maintenance')}>
                <ListItemIcon>
                  <MaintenanceIcon />
                </ListItemIcon>
                <ListItemText primary={t('header:maintenance')} />
              </ListItemButton>
            </ListItem>
            <Divider />
            <ListItem disablePadding>
              <ListItemButton onClick={handleNavigation('/settings')}>
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary={t('settings:title')} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={handleNavigation('/about')}>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText primary={t('settings:about.title')} />
              </ListItemButton>
            </ListItem>
            {isDeveloperMode && (
              <>
                <Divider />
                <ListItem disablePadding>
                  <ListItemButton onClick={handleNavigation('/developer')}>
                    <ListItemIcon>
                      <DeveloperIcon />
                    </ListItemIcon>
                    <ListItemText primary={t('settings:developer.menu_title')} />
                  </ListItemButton>
                </ListItem>
              </>
            )}
          </List>
          <Divider />
          <DeveloperVersion showNotification={showNotification} />
        </Box>
      </Drawer>
    </>
  );
};
