# Radial Layout and Expansion Fix

## Changes Made

### 1. Reverted to Radial Layout ✅
- Changed `elkLayoutOptions` in `elkAdapter.ts` back to radial algorithm
- Kept all radial-specific settings for proper circular layout

### 2. Fixed Node Expansion ✅
- Modified `useElkLayout.ts` to auto-expand level 3 nodes on initialization
- This includes nodes like `home-property` and `family-docs`
- Their children (insurance, cleaner, passports, etc.) will now be visible by default

## How It Works

1. **Initial State**: 
   - Virtual root is expanded (always)
   - Level 3 nodes (home-property, family-docs) are now auto-expanded
   - This shows their children immediately

2. **Expansion Logic**:
   - Children only show if their immediate parent is in the expandedNodes set
   - By auto-expanding level 3, we ensure level 4 nodes are visible
   - Users can now collapse/expand these branches

## Testing

**Please refresh your browser** and you should see:
1. A radial (circular) layout with virtual root at center
2. More nodes visible immediately (insurance, cleaner, passports, etc.)
3. Clicking on home-property or family-docs should collapse/expand their children

## Console Output Expected

You should see:
```
[useElkLayout] Auto-expanding level 3 nodes: ['home-property', 'family-docs']
[elkLayoutService] Parent expanded check: true for parents: ['home-property']
[elkLayoutService] Parent expanded check: true for parents: ['family-docs']
```

And more nodes should pass the visibility filter.