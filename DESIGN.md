# Orianna Design System

> Reference for all UI decisions. Follow these rules so every new component looks like it belongs.

## Colors

### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| Page bg | `#0a0a0f` | Full-page backgrounds (coach, auth) |
| Card bg | `#1a1a2e` | Cards, dropdowns, inputs, chat bubbles |
| Card bg hover | `#1e1e38` | Hovered cards |
| Elevated bg | `#16161e` | Popovers, dialogs, dropdown menus |
| Surface | `#12121a` | Stat boxes, notes, inner panels |
| Border | `rgba(255,255,255,0.06)` or `rgba(255,255,255,0.07)` | Default borders |
| Border hover | `rgba(255,255,255,0.12)` | Hovered borders |

### Brand Purple
| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#7c3aed` | Buttons, links, active states |
| Primary light | `#a855f7` | Gradient end, lighter accents |
| Primary soft | `#c084fc` | Gradient start, subtle glow |
| Gradient | `linear-gradient(135deg, #7c3aed, #a855f7)` | Avatars, primary buttons, brand elements |
| Purple bg | `bg-purple-500/10` or `rgba(124,58,237,0.1)` | Button backgrounds, selected states |
| Purple border | `rgba(124,58,237,0.25)` → `rgba(124,58,237,0.4)` on hover | Active/accent borders |
| Purple glow | `0 0 20px rgba(124,58,237,0.1)` | Hover card glow |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| Primary text | `white` or `#e4e4e7` or `#e2e8f0` | Headings, card text |
| Secondary | `#a1a1aa` or `#9ca3af` | Subtitles, meta text |
| Muted | `#71717a` | Labels, inactive icons |
| Dim | `#52525b` | Separators, timestamps |
| Disabled | `#3f3f46` | Disabled controls, past dates |

### Stat Colors (expanded view)
| Stat | Color |
|------|-------|
| Views | `text-blue-400` |
| Likes | `text-pink-400` |
| Comments | `text-amber-400` |
| Saves | `text-emerald-400` |
| Sends | `text-cyan-400` |
| Engagement (good) | `text-green-400` |
| Engagement (low) | `text-muted-foreground` |

### Status Colors (production pipeline)
| Status | Pill style |
|--------|------------|
| New | Blue bg + border |
| Recording | Amber bg + border |
| Editing | Purple bg + border |
| Posted | Green bg + border |

## Typography

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Page title | 26px | 700 | White |
| Page subtitle | 15px | 400 | `#9ca3af` |
| Card title | 14px | 600 | White / foreground |
| Card body text | 13-14px | 500 | `#e2e8f0` |
| Meta / label | 11px | 500-600 | Muted |
| Tag pill | 10-11px | 600 | Varies by type |
| Tiny label | 9-10px | 500 | Uppercase tracking-wide |
| Section header | 11px | 700 | Uppercase tracking-wider, purple |

## Spacing & Layout

- Page padding: `p-6` to `p-8`
- Card padding: `12px 16px` (compact) to `18px 20px` (spacious)
- Card gap: `10-12px`
- Content max-width: `max-w-4xl` (lists), `520-640px` (centered content)
- Border radius: `12px` (cards, inputs), `rounded-full` (pills, avatars)

## Components

### Buttons
- **Primary**: `bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-sm shadow-purple-500/20 hover:brightness-110`
- **Secondary/outline**: `border border-white/[0.08] bg-[#1a1a2e] text-muted hover:text-white hover:border-purple-500/40`
- **Ghost icon**: `p-1.5 text-[#71717a] hover:text-white hover:bg-white/[0.05] rounded-md`
- **Destructive icon**: `text-[#71717a] hover:text-red-400 hover:bg-white/[0.05]`
- **"View original" link**: `bg-purple-500/10 border border-purple-500/25 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/40`

### Cards
```
background: #1a1a2e
border: 1px solid rgba(255,255,255,0.07)
border-radius: 12px
hover:
  border-color: rgba(124,58,237,0.4)
  background: #1e1e38
  box-shadow: 0 0 20px rgba(124,58,237,0.1)
  transform: translateY(-2px)  (suggestion cards only)
transition: all 0.2s ease
```

### Dropdowns / Popovers
```
background: #16161e
border: 1px solid rgba(255,255,255,0.10)
border-radius: 12px
shadow: shadow-2xl shadow-black/40
padding: 16px
```
- Menu items: `px-3 py-1.5 text-xs hover:bg-purple-500/15 hover:text-white rounded`

### Inputs
```
background: #1a1a2e
border: 1px solid rgba(255,255,255,0.08)
border-radius: 12px
padding: 14px 16px
color: white
font-size: 14px
focus: border-color #7c3aed, box-shadow 0 0 0 3px rgba(124,58,237,0.15)
placeholder: #6b7280
```

### Mini Calendar (date pickers)
- Header: month/year centered, chevron nav left/right
- Day headers: 9px, `#52525b`, uppercase
- Days: 11px font, `#a1a1aa`, hover `bg-white/10 text-white`
- Today: `bg-purple-500/15 text-purple-400`
- Selected: `bg-purple-600 text-white shadow-sm shadow-purple-500/30`
- Past/disabled: `#3f3f46`, no pointer

### Stat Boxes (expanded inspo cards)
```
text-center p-2.5 rounded-lg
background: #12121a
border: 1px solid rgba(255,255,255,0.06)
icon: 12px, colored per stat type
value: 14px bold, same color as icon
label: 9px uppercase tracking-wide, muted
```

## Glows & Ambient Effects

### Page glow (coach, hero sections)
```css
background:
  radial-gradient(ellipse 60% 50% at 50% 40%, rgba(124,58,237,0.18), transparent 70%),
  radial-gradient(ellipse 30% 25% at 50% 60%, rgba(168,85,247,0.06), transparent);
```

### Avatar pulse animation
```css
@keyframes coach-pulse {
  0%, 100% { box-shadow: 0 0 0 6px rgba(124,58,237,0.15), 0 0 40px rgba(124,58,237,0.3); }
  50% { box-shadow: 0 0 0 8px rgba(124,58,237,0.2), 0 0 60px rgba(124,58,237,0.45); }
}
animation: coach-pulse 3s ease-in-out infinite;
```

## Patterns

### Empty States
- Centered vertically in available space
- Brand avatar (circle, purple gradient, sparkle ✦)
- Title with gradient text on brand name
- Muted subtitle, max-width 400px
- Suggestion cards in 2-col grid below

### Card Action Buttons
- Right-aligned, horizontal flex with gap-1
- Status dropdown → Edit (pencil) → Schedule (calendar) → Delete (trash)
- All use ghost icon style: `p-1.5 text-[#71717a] hover:text-white`
- Delete uses `hover:text-red-400` instead

### Hover Transitions
- Always `transition: all 0.2s ease` (or `transition-all`)
- Cards lift with `translateY(-2px)` only on suggestion/clickable cards
- Borders shift from neutral to purple on hover
- Icons go from muted to white/colored on hover

## Don'ts
- No native browser date pickers — use MiniCalendar
- No Radix Select for action dropdowns that need `value=""` — use custom dropdown
- No pure black backgrounds — use `#0a0a0f` minimum
- No unstyled scrollbars in dark theme
- No emoji in UI unless specifically requested by user
