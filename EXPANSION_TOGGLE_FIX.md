# Expansion Toggle Fix

## Changes Made

### 1. Removed Auto-Expansion ✅
- Level 3 nodes (home-property, family-docs) no longer auto-expand on load
- App starts with only virtual root expanded
- This means first click will expand (show children), not collapse

### 2. Fixed Timing Issue ✅
- Changed from checking `expandedNodes.has(node.id)` AFTER toggle
- Now checking `!expandedNodes.has(node.id)` BEFORE toggle
- This correctly predicts what the state will be after React updates

### 3. Added ELK Debug Logging ✅
- Added detailed logging of graph structure passed to ELK
- This will help debug why radial layout is failing

## Expected Behavior

1. **On page load**: Only see Brett, Gemma, 22 Banya St, and Family Documents
2. **Click on 22 Banya St**: Should expand to show Insurance, Cleaner, Gardener
3. **Click again**: Should collapse and hide those children
4. **Click on Family Documents**: Should expand to show Passports, Medicare, Health Insurance

## Testing

**Please refresh your browser** and:
1. Click on "22 Banya St" - it should expand to show children
2. Click on "Family Documents" - it should expand to show children
3. Click again on either - they should collapse

The console will show:
- "Node will be expanded after toggle? true" on first click
- "Node will be expanded after toggle? false" on second click
- Detailed ELK graph structure to help debug the radial layout error