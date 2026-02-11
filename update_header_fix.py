import re

file_path = 'src/components/layout/Header.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# I noticed the previous regex replacement produced invalid TSX:
#
#         {displayBatteryLevel !== undefined && (
#           <Box
#             data-testid="connection-status-indicator"
#             sx={{ display: 'flex', alignItems: 'center', mr: 1 }}
#           >
#             <Tooltip title={t('battery_level', { level: displayBatteryLevel }
#           </Box>
#         )}
#             </Tooltip>
#           )}
#         </Box>
#
# It seems the previous regex replacement messed up the closing tags.
# Let's fix it by completely replacing the broken block with the correct one.

# The broken block likely looks like this in the file now:
broken_pattern = r'\{displayBatteryLevel !== undefined && \(\s*<Box[\s\S]*?data-testid="connection-status-indicator"[\s\S]*?<\/Box>[\s\S]*?<\/Tooltip>[\s\S]*?\}\)[\s\S]*?<\/Box>'

# Or we can just look for the comment "Connection Status & Battery" and replace the block that follows until "Open Door Button"

start_marker = '{/* Connection Status & Battery */}'
end_marker = '{/* Open Door Button'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    # We found the block

    # The correct implementation we want:
    # Check if battery is defined. If so, show the Box with the battery info.
    # No Bluetooth icons here.

    new_block = '''{/* Connection Status & Battery */}
        {displayBatteryLevel !== undefined && (
          <Box
            data-testid="connection-status-indicator"
            sx={{ display: 'flex', alignItems: 'center', mr: 1 }}
          >
            <Tooltip title={t('battery_level', { level: displayBatteryLevel })}>
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 'medium' }}
                  data-testid="battery-level-text"
                >
                  {displayBatteryLevel}%
                </Typography>
                {displayBatteryLevel < 20 ? (
                  <BatteryAlert color="error" fontSize="small" sx={{ ml: 0.25 }} />
                ) : displayBatteryLevel > 90 ? (
                  <BatteryFull color="inherit" fontSize="small" sx={{ ml: 0.25 }} />
                ) : (
                  <BatteryStd color="inherit" fontSize="small" sx={{ ml: 0.25 }} />
                )}
              </Box>
            </Tooltip>
          </Box>
        )}

        '''

    new_content = content[:start_idx] + new_block + content[end_idx:]

    with open(file_path, 'w') as f:
        f.write(new_content)
    print("Fixed Header.tsx")
else:
    print("Could not find the markers to replace.")
