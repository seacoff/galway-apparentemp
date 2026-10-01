# Galway Apparent Temperature Worker v3
The parser targets the exact span IDs supplied from the University weather page source:
- txtTemp
- txtSpeed
- txtRH
It extracts only the numeric value following `Current:` inside each element and retains sanity validation.
