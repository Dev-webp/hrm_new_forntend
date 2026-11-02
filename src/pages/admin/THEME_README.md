# Executive Dashboard Themes

Four different visual style themes are available for the Executive Dashboard:

## 1. Minimalist Theme (`AdminOverview.theme-minimal.css`)
**Style:** Ultra clean, black and white, typography-focused
- **Colors:** Black and white only
- **Borders:** Simple black borders
- **Shadows:** Minimal or none
- **Cards:** Square corners, no gradients
- **Best for:** Professional, serious environments

## 2. Neon Theme (`AdminOverview.theme-neon.css`)
**Style:** Dark mode with vibrant glowing neon colors
- **Colors:** Dark background (#0a0a0f) with neon accents (cyan, magenta, green, yellow)
- **Effects:** Glowing text and borders
- **Cards:** Rounded with neon glow effects
- **Best for:** Modern, tech-focused environments

## 3. Glassmorphism Theme (`AdminOverview.theme-glass.css`)
**Style:** Frosted glass effect with gradient backgrounds
- **Colors:** Purple to pink gradient background
- **Effects:** Semi-transparent cards with blur (backdrop-filter)
- **Cards:** Rounded with glass effect
- **Best for:** Modern, trendy interfaces

## 4. Pastel Theme (`AdminOverview.theme-pastel.css`)
**Style:** Soft, gentle pastel colors
- **Colors:** Light pastel gradients (blue, orange, green, purple)
- **Effects:** Soft shadows, rounded corners
- **Cards:** Very rounded (24px) with pastel backgrounds
- **Best for:** Friendly, approachable interfaces

## How to Apply a Theme

### Option 1: Replace the CSS File
1. Rename `AdminOverview.css` to `AdminOverview.theme-default.css` (backup)
2. Copy the desired theme file to `AdminOverview.css`
3. Rebuild: `npm run build`

### Option 2: Import in Component (Recommended)
In `AdminOverview.jsx`, add the theme import after the main CSS:

```jsx
import './AdminOverview.css';
import './AdminOverview.theme-neon.css'; // Add your theme here
```

### Option 3: Dynamic Theme Switcher
Add a theme selector to the dashboard header to switch themes dynamically:

```jsx
const [theme, setTheme] = useState('default');

const themeStyles = {
  default: './AdminOverview.css',
  minimal: './AdminOverview.theme-minimal.css',
  neon: './AdminOverview.theme-neon.css',
  glass: './AdminOverview.theme-glass.css',
  pastel: './AdminOverview.theme-pastel.css',
};

// In JSX:
<select value={theme} onChange={(e) => setTheme(e.target.value)}>
  <option value="default">Default</option>
  <option value="minimal">Minimalist</option>
  <option value="neon">Neon</option>
  <option value="glass">Glassmorphism</option>
  <option value="pastel">Pastel</option>
</select>
```

## Current Active Theme
The current `AdminOverview.css` uses the **Clean Professional** design (not one of these themes).

To use any of these themes, either:
1. Replace `AdminOverview.css` with the theme file
2. Import the theme file in your component
3. Implement a dynamic theme switcher
