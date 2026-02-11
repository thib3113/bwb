import re

file_path = 'src/components/layout/Header.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Pattern to find the connection-status-indicator Box and its children
# We want to keep the Box but remove the Bluetooth icons inside it, and make the Box conditional on battery level.

# 1. Locate the Box start
box_start = '<Box\n          data-testid="connection-status-indicator"\n          sx={{ display: \'flex\', alignItems: \'center\', mr: 1 }}\n        >'

# 2. Locate the content we want to REMOVE (the Bluetooth icons)
# It looks like:
#           {isConnected ? (
#             <Bluetooth data-testid="status-icon-connected" />
#           ) : (
#             <BluetoothDisabled data-testid="status-icon-disconnected" />
#           )}

# 3. Locate the content we want to KEEP (The battery part)
# It starts with: {displayBatteryLevel !== undefined && (

# Let's construct the new content.
# We want to replace the whole Box block with a version that:
# a) Checks if displayBatteryLevel !== undefined BEFORE rendering the Box
# b) Does NOT contain the Bluetooth icons

# The original block:
#         <Box
#           data-testid="connection-status-indicator"
#           sx={{ display: 'flex', alignItems: 'center', mr: 1 }}
#         >
#           {isConnected ? (
#             <Bluetooth data-testid="status-icon-connected" />
#           ) : (
#             <BluetoothDisabled data-testid="status-icon-disconnected" />
#           )}
#
#           {displayBatteryLevel !== undefined && (
#             <Tooltip title={t('battery_level', { level: displayBatteryLevel })}>
#               <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
#                 <Typography
#                   variant="body2"
#                   sx={{ fontWeight: 'medium' }}
#                   data-testid="battery-level-text"
#                 >
#                   {displayBatteryLevel}%
#                 </Typography>
#                 {displayBatteryLevel < 20 ? (
#                   <BatteryAlert color="error" fontSize="small" sx={{ ml: 0.25 }} />
#                 ) : displayBatteryLevel > 90 ? (
#                   <BatteryFull color="inherit" fontSize="small" sx={{ ml: 0.25 }} />
#                 ) : (
#                   <BatteryStd color="inherit" fontSize="small" sx={{ ml: 0.25 }} />
#                 )}
#               </Box>
#             </Tooltip>
#           )}
#         </Box>

# The new block:
#         {displayBatteryLevel !== undefined && (
#           <Box
#             data-testid="connection-status-indicator"
#             sx={{ display: 'flex', alignItems: 'center', mr: 1 }}
#           >
#             <Tooltip title={t('battery_level', { level: displayBatteryLevel })}>
#               <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
#                 <Typography
#                   variant="body2"
#                   sx={{ fontWeight: 'medium' }}
#                   data-testid="battery-level-text"
#                 >
#                   {displayBatteryLevel}%
#                 </Typography>
#                 {displayBatteryLevel < 20 ? (
#                   <BatteryAlert color="error" fontSize="small" sx={{ ml: 0.25 }} />
#                 ) : displayBatteryLevel > 90 ? (
#                   <BatteryFull color="inherit" fontSize="small" sx={{ ml: 0.25 }} />
#                 ) : (
#                   <BatteryStd color="inherit" fontSize="small" sx={{ ml: 0.25 }} />
#                 )}
#               </Box>
#             </Tooltip>
#           </Box>
#         )}

# Let's perform the replacement using regex to be safe about whitespace.

pattern = r'(<Box\s+data-testid="connection-status-indicator"[\s\S]*?>)([\s\S]*?)({displayBatteryLevel !== undefined && \([\s\S]*?\)\})([\s\S]*?)(</Box>)'

def replace_fn(match):
    # match.group(1) is the <Box ...> opening tag
    # match.group(2) is the Bluetooth icons part (to be removed)
    # match.group(3) is the Battery part (to be kept and unwrapped)
    # match.group(4) is whitespace/closing brace of the battery part (which was inside the box)
    # match.group(5) is the </Box> closing tag

    # We want to wrap everything in {displayBatteryLevel !== undefined && (...)}
    # And inside, we have the Box containing ONLY the inner content of the battery part.
    # Wait, the original code had:
    # {displayBatteryLevel !== undefined && ( <Tooltip> ... </Tooltip> )}

    # So we should construct:
    # {displayBatteryLevel !== undefined && (
    #   <Box data-testid="connection-status-indicator" ...>
    #      <Tooltip> ... </Tooltip>
    #   </Box>
    # )}

    # Extract the Tooltip part from group 3.
    # Group 3 is: {displayBatteryLevel !== undefined && (\n            <Tooltip ... > ... </Tooltip>\n          )}

    battery_block = match.group(3)

    # Regex to extract the content inside the conditional block
    inner_content_match = re.search(r'\{displayBatteryLevel !== undefined && \(([\s\S]*?)\)\}', battery_block)
    if inner_content_match:
        tooltip_content = inner_content_match.group(1).strip()

        # Indent it properly
        lines = tooltip_content.split('\n')
        indented_tooltip = '\n'.join(['            ' + line.strip() for line in lines])

        return (
            '        {displayBatteryLevel !== undefined && (\n'
            '          <Box\n'
            '            data-testid="connection-status-indicator"\n'
            '            sx={{ display: \'flex\', alignItems: \'center\', mr: 1 }}\n'
            '          >\n'
            + indented_tooltip + '\n'
            '          </Box>\n'
            '        )}'
        )
    else:
        return match.group(0) # Fallback

new_content = re.sub(pattern, replace_fn, content)

with open(file_path, 'w') as f:
    f.write(new_content)

print("File updated.")
