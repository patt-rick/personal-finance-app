# Quick Guide: Changing the Primary Color

## Step-by-Step Instructions

### 1. Open the Theme File
Navigate to and open: `src/theme/theme.ts`

### 2. Locate the Primary Color
Find the `colors` object in the theme configuration:

```typescript
export const theme = {
  colors: {
    primary: '#000000',  // ← This is the primary color
    // ... other colors
  },
  // ...
};
```

### 3. Change the Color
Replace `'#000000'` with your desired color. You can use:
- **Hex colors**: `'#FF5733'`
- **RGB**: Not directly supported, convert to hex first
- **Named colors**: Not recommended, use hex instead

### 4. Save the File
Save `theme.ts` and the changes will automatically apply throughout the app.

## What Uses the Primary Color?

The primary color is used in:
- ✅ Active tab bar icons
- ✅ Active business chips
- ✅ Active business items
- ✅ Active type selector buttons
- ✅ Primary action buttons
- ✅ Floating Action Button (FAB)
- ✅ Income card border
- ✅ Positive balance text

## Example Color Changes

### Blue Theme
```typescript
primary: '#2563eb', // Blue
```

### Green Theme
```typescript
primary: '#16a34a', // Green
```

### Purple Theme
```typescript
primary: '#9333ea', // Purple
```

### Red Theme
```typescript
primary: '#dc2626', // Red
```

### Orange Theme
```typescript
primary: '#ea580c', // Orange
```

## Advanced: Changing Other Colors

You can also customize other colors in the theme:

```typescript
export const theme = {
  colors: {
    primary: '#000000',           // Main brand color
    background: '#ffffff',        // App background
    card: '#fafafa',             // Card backgrounds
    surface: '#f5f5f5',          // Secondary surfaces
    text: '#000000',             // Primary text
    textSecondary: '#666666',    // Secondary text
    textInverse: '#ffffff',      // Text on primary color
    border: '#e0e0e0',           // Borders
    borderLight: '#f0f0f0',      // Light borders
    error: '#dc2626',            // Error states
    placeholder: '#999999',      // Placeholder text
    success: '#000000',          // Success states (currently same as primary)
  },
  // ...
};
```

## Tips

1. **Use a color picker** to find the perfect hex code
2. **Test on both light and dark backgrounds** to ensure readability
3. **Consider accessibility** - ensure sufficient contrast
4. **Keep it consistent** - the theme system ensures your color is used everywhere

## Need Help?

If you want to implement a complete color scheme (not just the primary color), consider:
- Creating color variants (light, dark, etc.)
- Adjusting `success` color to match your brand
- Updating `error` color if needed
- Modifying text colors for better contrast

## Reverting Changes

To go back to the default black theme:
```typescript
primary: '#000000',
```
