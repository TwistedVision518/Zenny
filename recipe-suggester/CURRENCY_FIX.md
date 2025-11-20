# Currency Conversion Fix - Technical Documentation

## Problem
The budget filter was showing correct currency symbols (₹, €, $) but displaying USD amounts for all regions. For example, showing "Under ₹2/serv" when it should show "Under ₹0.80/serv" for India.

## Root Cause
Two separate issues:
1. **Display Issue**: Budget dropdown options had hardcoded USD values (2, 5, 8, 12)
2. **Filter Logic Issue**: Budget comparison was comparing region-adjusted costs against raw USD thresholds

## Solution Implemented

### 1. Added `convertBudgetDisplay()` Function
```typescript
// Convert USD budget values to region-appropriate display amounts (matching regionFactor logic)
const convertBudgetDisplay = (usdAmount: number, r: 'US'|'EU'|'IN'): string => {
  const adjusted = usdAmount * regionFactor(r);
  return adjusted.toFixed(2);
};
```

This function:
- Takes a USD amount (2, 5, 8, or 12)
- Multiplies by the region factor (US: 1, EU: 1.1, IN: 0.4)
- Returns a formatted string with 2 decimal places

### 2. Updated Budget Dropdown Display
```tsx
<option value={2}>Under {currencySymbol(region)}{convertBudgetDisplay(2, region)}/serv</option>
```

Now displays:
- **US**: Under $2.00/serv
- **EU**: Under €2.20/serv
- **IN**: Under ₹0.80/serv

### 3. Fixed Filter Comparison Logic
```typescript
// Budget filter (per serving)
if (budgetFilter !== "any") {
  const cps = estimateCost(recipe).perServing;
  // Adjust budget threshold by region factor to match region-adjusted costs
  const adjustedBudget = (budgetFilter as number) * regionFactor(region);
  if (cps > adjustedBudget) return false;
}
```

This ensures:
- Recipe costs are calculated using `estimateCost()` which applies region factor
- Budget threshold is also adjusted by the same region factor
- Comparison is now consistent and accurate

## How Regional Pricing Works

### Region Factors
```typescript
regionFactor = {
  US: 1.0,    // Base pricing
  EU: 1.1,    // 10% higher (cost of living adjustment)
  IN: 0.4     // 60% lower (purchasing power parity)
}
```

### Example: $2 USD Budget

| Region | Factor | Display Value | Actual Threshold |
|--------|--------|---------------|------------------|
| US     | 1.0    | $2.00/serv    | $2.00            |
| EU     | 1.1    | €2.20/serv    | €2.20            |
| IN     | 0.4    | ₹0.80/serv    | ₹0.80            |

### Example: Recipe Cost Calculation

If a recipe has ingredients costing $5 in base prices:
- **US**: $5 × 1.0 = $5.00
- **EU**: $5 × 1.1 = €5.50
- **IN**: $5 × 0.4 = ₹2.00

## Files Modified

1. **src/app/page.tsx** (Lines 125-132)
   - Added `convertBudgetDisplay()` function
   - Updated budget dropdown to use converted values
   - Fixed filter comparison logic (Lines 657-662)

## Testing

To verify the fix:
1. Refresh the application (Ctrl+Shift+R to clear cache)
2. Select different regions from the region dropdown
3. Check budget filter options:
   - US should show: $2.00, $5.00, $8.00, $12.00
   - EU should show: €2.20, €5.50, €8.80, €13.20
   - IN should show: ₹0.80, ₹2.00, ₹3.20, ₹4.80
4. Generate recipes and verify filtering works correctly for each region

## Future Improvements

Potential enhancements:
- Add more regions (UK, AU, CA, etc.)
- Use real-time exchange rates instead of fixed factors
- Allow users to customize their own regional pricing
- Show original USD price with converted price for transparency

## Technical Notes

- Region factor represents purchasing power parity, not direct exchange rates
- IN factor of 0.4 means things cost 60% less in India (better purchasing power)
- EU factor of 1.1 means things cost 10% more in Europe (higher cost of living)
- The comparison logic must always multiply both sides by the same factor for consistency
- Display values are for user-friendliness, but internal logic uses the factor-adjusted amounts

---

**Last Updated**: November 20, 2025
**Status**: ✅ Fixed and Deployed
