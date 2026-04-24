# Emotional Cartography - Setup Guide

## Prerequisites

- Node.js 18+ 
- Python 3.9+ (for pre-computation script)
- Mapbox account (free tier is sufficient)

## Quick Start

### 1. Install Dependencies

```bash
cd emotional-cartography
npm install
```

### 2. Configure Mapbox

1. Create an account at [mapbox.com](https://www.mapbox.com/)
2. Get your public access token from [Account → Access tokens](https://account.mapbox.com/access-tokens/)
3. Create `.env.local` in the project root:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the placeholder experience.

---

## Adding Your Data

### Step 1: Pre-compute Audio Assets

Install Python dependencies:

```bash
pip install librosa numpy matplotlib scikit-learn joblib
```

Run the pre-computation script on your audio files:

```bash
python scripts/precompute.py --audio-dir /path/to/your/audio --output-dir public
```

This generates:
- `public/data/clips/*.json` - Feature data for each clip
- `public/spectrograms/*.png` - Spectrogram images

### Step 2: Update Journey Data

Edit `public/data/journey.json`:

1. **Update chapter metadata** - Countries, cities, coordinates, date ranges
2. **Map clips to chapters** - Add clip IDs to `audioClips` arrays
3. **Write your narratives** - Personal reflections for each location
4. **Assign emotion labels** - Name your clusters (e.g., "Reflective", "Energetic")

Example chapter structure:

```json
{
  "id": "ch-singapore",
  "country": "Singapore",
  "city": "Singapore",
  "coordinates": [103.8198, 1.3521],
  "dateRange": "Jan 2020 - Mar 2020",
  "scrollStart": 0.1,
  "scrollEnd": 0.25,
  "color": "#4ECDC4",
  "emotionCluster": {
    "id": 1,
    "label": "Grounded",
    "confidence": 0.78
  },
  "narrative": {
    "headline": "Singapore",
    "subtitle": "Where it began",
    "body": "Your personal narrative here...",
    "technicalNote": "Technical insight about the ML analysis..."
  },
  "audioClips": ["clip-sg-001", "clip-sg-002"]
}
```

### Step 3: Add Audio Files (Optional)

For audio playback, add compressed MP3 files to `public/audio/`:

```
public/audio/
├── clip-sg-001.mp3
├── clip-sg-002.mp3
├── clip-ar-001.mp3
└── ...
```

---

## Project Structure

```
emotional-cartography/
├── src/
│   ├── app/
│   │   ├── globals.css      # Global styles + design tokens
│   │   ├── layout.tsx       # Root layout with metadata
│   │   └── page.tsx         # Main scrollytelling page
│   ├── components/
│   │   ├── ScrollManager.tsx    # GSAP scroll orchestration
│   │   ├── MapCanvas.tsx        # Mapbox visualization
│   │   ├── AudioEngine.tsx      # Howler.js audio player
│   │   ├── NarrativePanel.tsx   # Animated text panels
│   │   └── MLVisualizer/        # ML pipeline visualization
│   ├── stores/
│   │   └── journeyStore.ts      # Zustand state management
│   └── types/
│       └── index.ts             # TypeScript interfaces
├── public/
│   ├── data/
│   │   ├── journey.json         # Main journey configuration
│   │   └── clips/               # Per-clip feature data
│   ├── audio/                   # MP3 audio files
│   └── spectrograms/            # Pre-rendered spectrograms
├── scripts/
│   └── precompute.py            # Audio processing script
└── SETUP.md                     # This file
```

---

## Customization

### Colors

Edit CSS variables in `src/app/globals.css`:

```css
:root {
  --cluster-a: #FF6B6B;  /* Your emotion color 1 */
  --cluster-b: #4ECDC4;  /* Your emotion color 2 */
  --cluster-c: #FFE66D;  /* Your emotion color 3 */
  --cluster-d: #95E1D3;  /* Your emotion color 4 */
}
```

### Typography

The project uses:
- **Newsreader** - Display headings (serif)
- **JetBrains Mono** - Technical/data text (monospace)
- **Source Serif 4** - Body text (serif)

### Map Style

Change the Mapbox style in `src/components/MapCanvas.tsx`:

```tsx
style: 'mapbox://styles/mapbox/dark-v11',  // Current
// Other options:
// 'mapbox://styles/mapbox/light-v11'
// 'mapbox://styles/mapbox/satellite-v9'
// Or your custom style URL
```

---

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_MAPBOX_TOKEN`

### Other Platforms

Build the static site:

```bash
npm run build
```

The output in `.next/` can be deployed to any static hosting service.

---

## Troubleshooting

### Map not showing
- Verify your Mapbox token is correctly set in `.env.local`
- Check browser console for Mapbox errors

### Spectrograms not loading
- Ensure you ran the precompute script
- Check that PNG files exist in `public/spectrograms/`

### Scroll not working smoothly
- GSAP ScrollTrigger requires sufficient content height
- Each chapter section should be at least 100vh

---

## Need Help?

Check the architecture documentation in the project root:
- `emotional-cartography-architecture.md` - Full technical blueprint
- `emotional-cartography-diagrams.md` - Visual system diagrams
- `emotional-cartography-components.tsx` - Component reference code
