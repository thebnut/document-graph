# Expansion Visibility Fix

## The Problem
Nodes were expanding but children weren't showing unless you clicked on other nodes first. The issue was that level 3 nodes (like "22 Banya St" and "Family Documents") were ALWAYS visible, even when their parent nodes weren't expanded.

This caused confusing behavior:
- Click "Family Documents" → Nothing happens (because Gemma isn't expanded)
- Click "Gemma" → Now you see her children
- Click "Family Documents" again → NOW it expands

## The Root Cause
In `elkLayoutService.ts`, the visibility logic was:
```typescript
// Always show level 1, 2, and 3 (people and assets)
if (nodeData.level <= 3) {
  return true;
}
```

This meant level 3 nodes were always visible regardless of parent expansion state.

## The Fix
Changed to only always show levels 1 and 2:
```typescript
// Always show level 1 and 2 (virtual root and people)
if (nodeData.level <= 2) {
  return true;
}
```

## How It Works Now
1. **Level 1** (virtual root) - Always visible
2. **Level 2** (Brett, Gemma) - Always visible  
3. **Level 3** (22 Banya St, Family Documents) - Only visible when parent is expanded
4. **Level 4+** (Insurance, Passports, etc.) - Only visible when parent AND grandparent are expanded

## Expected Behavior
- Start: See only Brett and Gemma
- Click Brett → See "22 Banya St" and "Family Documents"
- Click "22 Banya St" → See "Insurance", "Cleaner", "Gardener"
- Click "Family Documents" → See "Passports", "Medicare", "Health Insurance"

No more needing to click back and forth between nodes!