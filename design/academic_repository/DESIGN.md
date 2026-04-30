---
name: Academic Repository
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#424754'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#727785'
  outline-variant: '#c2c6d6'
  surface-tint: '#005ac2'
  primary: '#0058be'
  on-primary: '#ffffff'
  primary-container: '#2170e4'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#924700'
  on-tertiary: '#ffffff'
  tertiary-container: '#b75b00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  h1:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1280px
  gutter: 24px
  margin-page: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is rooted in the principles of **Institutional Minimalism**. It prioritizes information density and utility without the typical clutter of legacy academic portals. The brand personality is intellectual, organized, and reliable, aiming to evoke a sense of calm and focus for students and researchers.

Drawing inspiration from developer-centric interfaces like Hugging Face, the style utilizes a "Functional Flat" aesthetic. It relies on a rigorous grid, subtle hair-line borders instead of heavy shadows, and a systematic use of whitespace to separate complex metadata. The visual language is intentionally understated to ensure that the academic content remains the primary focus.

## Colors
This design system uses a high-clarity light mode palette. The background is a pure white to maximize readability. 

- **Primary:** A muted Indigo-Blue used for interactive elements, links, and primary actions. It provides enough contrast for accessibility while maintaining a professional tone.
- **Secondary:** A soft Slate-Blue used for secondary highlights and data visualization accents.
- **Neutral/Surface:** A series of cool grays define the structure. `#F9FAFB` is used for off-white section backgrounds, while `#E5E7EB` serves as the standard border color for cards and input fields.
- **Typography Colors:** Pure black is avoided to reduce eye strain; instead, `Gray 900` is used for headings and `Gray 600` for body copy and metadata.

## Typography
The design system exclusively utilizes **Inter** for its exceptional readability in data-heavy environments. The typographic hierarchy is strictly functional:

- **Headlines:** Use semi-bold weights with slight negative letter-spacing to create a compact, modern look.
- **Body:** Standardized at 16px for primary reading and 14px for descriptions to ensure a comfortable scanning experience.
- **Metadata/Labels:** A "label-caps" style is used for table headers and small category descriptors to provide visual variance without introducing new typefaces.
- **Link Style:** Underlined only on hover, using the Primary Indigo color to maintain a clean interface.

## Layout & Spacing
The layout follows a **Fixed Grid** model centered on the page for desktop views, transitioning to a fluid model for tablet and mobile. 

- **Grid:** A 12-column system is used for content organization. 
- **Whitespace:** Generous vertical padding (32px to 48px) separates major sections. 
- **Rhythm:** An 8px linear scale governs all spacing. Elements within a card use 16px (stack-md) spacing, while the distance between cards in a feed is 24px (gutter).
- **Search Placement:** The search input is treated as a primary architectural element, often spanning the full width of the content container or positioned prominently at the top-left of the resource feed.

## Elevation & Depth
In keeping with the minimalist academic aesthetic, this design system avoids traditional shadows. Depth is communicated through **Tonal Layering and Low-Contrast Outlines**:

- **Level 0 (Background):** White (#FFFFFF).
- **Level 1 (Cards/Inputs):** Defined by a 1px solid border (#E5E7EB). No shadow.
- **Level 2 (Hover State):** When a user interacts with a card, the border color shifts to a darker gray or the primary accent color, and a subtle, high-diffusion shadow (0px 4px 12px rgba(0,0,0,0.05)) may be applied to indicate lift.
- **Separation:** Horizontal rules (HR) are used sparingly; whitespace is the preferred method for separating content blocks.

## Shapes
The shape language is "Soft-Square." This choice reinforces the professional and systematic nature of the platform while remaining modern.

- **Components:** Buttons, input fields, and tags use a 0.25rem (4px) corner radius.
- **Cards:** Larger containers like resource cards use a 0.5rem (8px) radius to distinguish them from smaller UI elements.
- **Iconography:** Use "Linear" or "Outline" icons with a 2px stroke weight to match the weight of the typography and borders.

## Components
- **Cards:** The core of the interface. They feature a white background, a 1px gray border, and 24px internal padding. Metadata (Year, Department) should be positioned at the bottom or top-right in a smaller font size.
- **Tags/Badges:** Simple rectangular shapes with a light gray background (#F3F4F6) and dark gray text. The "Primary" tag for the main category (e.g., "Math") may use a light blue tint.
- **Search Inputs:** Large, clear fields with a subtle magnifying glass icon. Background is white with a faint gray border that turns primary blue on focus.
- **Buttons:** 
  - *Primary:* Solid Indigo background with white text.
  - *Secondary:* White background with a 1px border and Indigo text.
- **Data Tables:** Clean rows with 1px bottom borders, no vertical lines, and headers using the "label-caps" typography style.
- **Progress Indicators:** Simple 4px tall bars for indicating completion or resource "freshness."