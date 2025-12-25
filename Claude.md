# arXiv Globe Visualization - Frontend

## Project Goal

Interactive web application that visualizes the global nature of scientific collaboration by displaying arXiv research papers on a 3D globe. Institutional affiliations are geocoded and shown as pulsing markers connected by curves, allowing users to explore papers by category and see where research is happening worldwide.

**Current Status:** Deployed to production on Vercel.

**Deployment:** Live at https://arxiv-globe.vercel.app

## Technology Stack

- **Framework:** Next.js 16.1.1 (React 19.2.3)
- **Language:** TypeScript 5.9.3
- **Rendering:** Three.js 0.181.0 (WebGL)
- **LaTeX Rendering:** KaTeX 0.16.27
- **Styling:** Tailwind CSS 3.4.1
- **Deployment:** Vercel (serverless, edge-optimized)
- **Backend:** FastAPI (deployed on GCP Cloud Run)

## Architecture

### High-Level Architecture

```
User Browser
   ↓
Next.js Frontend (Vercel)
   ↓
Backend-for-Frontend API Route (/api/papers)
   ↓
FastAPI Backend (GCP Cloud Run)
   ↓
arXiv API + LLM + Geocoding
```

### Frontend Architecture

**Pattern:** Next.js App Router with client-side rendering for interactive 3D globe.

**Key Layers:**

1. **Page Layer** (`src/app/page.tsx`)
   - Main application component
   - Manages state: selected category, current index, paper data
   - Handles user interactions (category selection, next paper)
   - Fetches data from internal API route

2. **Component Layer** (`src/app/components/`)
   - `Globe.tsx` - 3D globe container, orchestrates hooks
   - `LatexRenderer.tsx` - Renders LaTeX math notation in titles/abstracts

3. **Hooks Layer** (`src/app/hooks/`)
   - `useGlobeScene.ts` - Sets up Three.js scene, camera, renderer, OrbitControls
   - `useAffiliationVisualization.ts` - Manages markers, curves, rotation on paper load

4. **Utils Layer** (`src/app/utils/`)
   - `coordinates.ts` - Lat/lon to 3D cartesian conversion
   - `markers.ts` - Create/update/remove affiliation markers
   - `curves.ts` - Bezier curves connecting affiliations
   - `landmass.ts` - Draw continents from world map image

5. **API Layer** (`src/app/api/papers/route.ts`)
   - Backend-for-Frontend (BFF) pattern
   - Proxies requests to FastAPI backend
   - Adds API key authentication (never exposed to browser)

### Three.js Visualization System

**Scene Setup:**
- Sphere geometry (radius 1, 64x64 segments)
- Phong material with ocean blue color
- Ambient + directional lighting
- Landmass overlay from world map image
- OrbitControls for manual rotation and zoom

**Affiliation Markers:**
- Small sphere geometries positioned on globe surface
- Coral red color (#ff6b6b)
- Pulsing animation (scale oscillation)
- Positioned using lat/lon → 3D conversion

**Connection Curves:**
- Quadratic or cubic Bezier curves
- Connect pairs of affiliations
- Arc height based on distance between points
- Special case: Self-loop curve for single affiliation

**Globe Rotation:**
- Automatic rotation when idle (OrbitControls autoRotate)
- Manual rotation to first affiliation on paper load
- Smooth interpolation with damping
- View reset to equator before rotation

## Key Components

### Page Component (`src/app/page.tsx`)

**Responsibilities:**
- Main application state management
- Category selection (15 arXiv categories across CS, Physics, Math)
- Paper fetching and loading states
- Layout with responsive design (mobile → desktop)

**State Management:**
```typescript
selectedCategory: string        // Current arXiv category
currentIndex: number            // Paper index in category
paperData: PaperData | null    // Current paper with affiliations
loading: boolean                // Loading state
error: string | null            // Error messages
```

**Data Flow:**
1. User selects category → resets index to 0, fetches first paper
2. User clicks "Next" → increments index, fetches next paper
3. Paper data → passed to Globe component for visualization
4. Paper metadata displayed below globe

### Globe Component (`src/app/components/Globe.tsx`)

**Responsibilities:**
- Container for Three.js scene
- Orchestrates two custom hooks
- Minimal logic - delegates to hooks

**Hook Integration:**
- `useGlobeScene()` - Returns refs to scene, camera, globe group, rotation state
- `useAffiliationVisualization()` - Consumes refs, manages markers/curves based on affiliations

### useGlobeScene Hook (`src/app/hooks/useGlobeScene.ts`)

**Responsibilities:**
- One-time scene setup (runs once on mount)
- Creates Three.js scene, camera, renderer, globe, lighting
- Sets up OrbitControls for manual interaction
- Runs animation loop (60 FPS)
- Handles window resize
- Cleanup on unmount

**OrbitControls Configuration:**
- Target: `(0, 0.3, 0)` - Positions globe lower in viewport
- Damping enabled for smooth motion
- Zoom range: 1.5 to 4.0
- Auto-rotation: 0.6 speed
- Pan disabled (no moving camera horizontally)

**Animation Loop:**
- Manual rotation to affiliation (when paper loads)
- View reset to equator head-on before rotation
- Smooth Y-axis rotation using damping
- OrbitControls update (auto-rotation + user interaction)
- Marker pulse animation update
- Render scene

### useAffiliationVisualization Hook (`src/app/hooks/useAffiliationVisualization.ts`)

**Responsibilities:**
- Responds to affiliation changes
- Filters to only geocoded affiliations (have coordinates)
- Creates markers and curves
- Triggers globe rotation to first affiliation
- Cleanup of previous markers/curves

**Effects on Paper Load:**
1. Remove old markers and curves
2. Filter to valid geocoded affiliations
3. Calculate rotation angle to center first affiliation
4. Set rotation target and trigger animation
5. Create new markers
6. Create curves (self-loop for 1, connections for 2+)

### LatexRenderer Component (`src/app/components/LatexRenderer.tsx`)

**Responsibilities:**
- Parse text with LaTeX notation (`$...$` inline, `$$...$$` display)
- Render math using KaTeX
- Display mixed text + math content
- Error handling with red error color

**Usage:**
- Paper titles (often contain math notation)
- Abstract text

## Data Flow

### Paper Loading Flow

```
1. User action (category change or "Next" button)
   ↓
2. page.tsx: fetchPaper(category, index)
   ↓
3. Frontend API: GET /api/papers?category=cs.AI&index=0
   ↓
4. BFF route.ts: Adds X-API-Key header, proxies to backend
   ↓
5. FastAPI backend: Processes paper (PDF → LLM → Geocoding)
   ↓
6. Response: GeocodedPaper JSON
   ↓
7. page.tsx: setPaperData(data)
   ↓
8. Globe component: Receives affiliations prop
   ↓
9. useAffiliationVisualization: Creates markers, curves, rotates globe
   ↓
10. useGlobeScene animation loop: Renders visualization
```

### Backend Integration (BFF Pattern)

**Why Backend-for-Frontend?**
- **Security:** API key stored server-side, never exposed to browser
- **Simplicity:** Single internal API endpoint for frontend
- **Flexibility:** Can add caching, transformation, aggregation later

**API Route Implementation:**
```typescript
// src/app/api/papers/route.ts
export async function GET(request: NextRequest) {
  // Extract query params
  const category = searchParams.get("category") || "cs.AI";
  const index = searchParams.get("index") || "0";

  // Get secrets from environment (server-side only)
  const backendUrl = process.env.BACKEND_URL;
  const apiKey = process.env.BACKEND_API_KEY;

  // Proxy to backend with authentication
  const response = await fetch(
    `${backendUrl}/papers/by-category?category=${category}&index=${index}`,
    { headers: { "X-API-Key": apiKey } }
  );

  return NextResponse.json(await response.json());
}
```

**Environment Variables:**
- `BACKEND_URL` - FastAPI backend URL (GCP Cloud Run)
- `BACKEND_API_KEY` - Authentication key for backend

**Security Benefits:**
1. API key never sent to browser (server-only env vars)
2. Backend API key validation
3. CORS restriction on backend (only allows Vercel domain)
4. Rate limiting on backend (20 req/min per IP)

## Deployment

### Vercel Deployment

**Platform:** Vercel (serverless Next.js hosting)

**Deployment URL:** https://arxiv-globe.vercel.app

**Configuration:**
- **Framework:** Next.js (auto-detected)
- **Build Command:** `npm run build`
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install`
- **Node Version:** 20.x

**Environment Variables (Production):**
Set in Vercel dashboard:
```
BACKEND_URL=https://arxiv-globe-backend-331484945482.europe-west3.run.app
BACKEND_API_KEY=mynbas-wugqeW-boxre3
```

**Deployment Process:**
1. Push to GitHub (`main` branch)
2. Vercel detects commit and triggers build
3. Runs `npm install` and `npm run build`
4. Deploys to global CDN edge network
5. Updates production URL
6. Preview deployments for PRs (separate URLs)

**Why Vercel?**
- **Zero Config:** Next.js optimized, no configuration needed
- **Global CDN:** Fast worldwide, edge-optimized
- **Serverless Functions:** API routes run as serverless functions
- **Free Tier:** Sufficient for portfolio/demo projects
- **Git Integration:** Automatic deployments on push
- **Preview Deployments:** Test PRs before merging

**Cold Start:**
- Production deployments stay warm
- API routes (serverless functions) may have slight cold start
- Static pages cached on CDN (no cold start)

### Local Development

**Prerequisites:**
- Node.js 20.x
- npm or yarn

**Setup:**
```bash
# Install dependencies
npm install

# Create .env.local file
echo 'BACKEND_URL=http://localhost:8000' > .env.local
echo 'BACKEND_API_KEY=dev_key_12345' >> .env.local

# Start development server
npm run dev
```

**Development Server:**
- Runs on http://localhost:3000
- Hot reload enabled (instant updates)
- Can test against local backend or production backend

## Type System

### Paper Data Types (`src/app/types/paper.ts`)

**Affiliation:**
```typescript
interface Affiliation {
  institution: string;
  address: string | null;
  country: string;
  latitude: number | null;   // null if not geocoded
  longitude: number | null;  // null if not geocoded
  geocoded: boolean;
}
```

**ValidAffiliation:**
```typescript
interface ValidAffiliation extends Omit<Affiliation, 'latitude' | 'longitude'> {
  latitude: number;    // Required (not null)
  longitude: number;   // Required (not null)
  geocoded: true;
}
```

**PaperData:**
```typescript
interface PaperData {
  arxiv_id: string;
  title: string;
  authors: Author[];
  abstract: string;
  published: string;
  categories: string[];
  affiliations: Affiliation[];
  metadata: {
    index: number;
    category: string;
    total_affiliations: number;
    geocoded_affiliations: number;
    has_more: boolean;  // Can fetch next paper
  };
}
```

## Key Design Decisions

### Why Client-Side Rendering for Globe?

**Decision:** Use `"use client"` directive for Globe component instead of server-side rendering.

**Reasoning:**
- Three.js requires browser APIs (WebGL, canvas, requestAnimationFrame)
- Interactive controls (OrbitControls) need DOM events
- Animation loop needs to run continuously in browser
- No SEO benefit to server-rendering 3D scene
- Page metadata (title, description) can still be server-rendered

### Why Two Separate Hooks?

**Decision:** Split globe logic into `useGlobeScene` and `useAffiliationVisualization`.

**Reasoning:**
- **Separation of concerns:** Scene setup vs. data visualization
- **Performance:** Scene setup runs once, affiliation logic runs on data change
- **Reusability:** Could visualize different data without changing scene
- **Testability:** Easier to test visualization logic separately

### Why OrbitControls Instead of Custom?

**Decision:** Use Three.js OrbitControls for manual globe rotation.

**Reasoning:**
- **Pre-built solution:** Handles complex math (quaternions, damping)
- **Feature-rich:** Auto-rotation, zoom, pan controls
- **Well-tested:** Used in thousands of Three.js projects
- **Accessible:** Mouse, touch, and keyboard support
- **Maintainable:** No need to maintain custom control code

### Why Backend-for-Frontend Pattern?

**Decision:** Create internal API route (`/api/papers`) instead of direct backend calls.

**Reasoning:**
- **Security:** API key never exposed to browser JavaScript
- **CORS simplicity:** No CORS needed for same-origin requests
- **Flexibility:** Can add caching, rate limiting, transformation
- **Error handling:** Centralized error handling and logging
- **Backend independence:** Frontend doesn't depend on backend API structure

### Why No Database/Caching in Frontend?

**Decision:** Fetch fresh data on every request, no client-side caching.

**Reasoning:**
- **Simplicity:** No need to manage cache invalidation
- **Fresh data:** Always shows latest papers from arXiv
- **Stateless:** No session management needed
- **Fast enough:** Backend processes papers in 3-4 seconds
- **Low traffic:** Single-user exploration tool, not high-traffic app

### Why Responsive Globe Height?

**Decision:** Use viewport-based height (`h-[400px] sm:h-[550px] lg:h-[650px]`).

**Reasoning:**
- **Mobile-first:** Smaller on phones (400px) where screen space is limited
- **Desktop optimized:** Larger on desktop (650px) for better visualization
- **Fixed height:** Prevents layout shift during loading
- **Title overlay:** Absolute positioning over globe works with fixed height

## Development Philosophy

**Production-First Approach:**
- Clean, maintainable code over clever optimizations
- TypeScript for type safety and IDE support
- Responsive design from the start
- Error handling and loading states
- Real-world deployment considerations

**Component Organization:**
- Colocation: Components, hooks, utils in `src/app/`
- Separation of concerns: Each module has single responsibility
- Minimal prop drilling: Use refs for Three.js objects
- Hooks for reusable logic: Scene setup, visualization

**Code Metrics:**
- page.tsx: 180 lines (main app logic)
- Globe.tsx: 42 lines (minimal orchestration)
- useGlobeScene.ts: 193 lines (scene setup + animation)
- useAffiliationVisualization.ts: 106 lines (markers + curves)
- route.ts: 47 lines (BFF proxy)

## Project Structure

```
arxiv-globe/
├── src/app/
│   ├── api/
│   │   └── papers/
│   │       └── route.ts          # BFF API route (backend proxy)
│   ├── components/
│   │   ├── Globe.tsx             # 3D globe container
│   │   └── LatexRenderer.tsx     # LaTeX math rendering
│   ├── hooks/
│   │   ├── useGlobeScene.ts      # Three.js scene setup
│   │   └── useAffiliationVisualization.ts  # Markers/curves
│   ├── types/
│   │   └── paper.ts              # TypeScript interfaces
│   ├── utils/
│   │   ├── coordinates.ts        # Lat/lon conversion
│   │   ├── markers.ts            # Marker creation/animation
│   │   ├── curves.ts             # Bezier curves
│   │   └── landmass.ts           # Continent rendering
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page component
├── public/
│   └── worldmap.png              # World map texture
├── .env.local                    # Local environment variables
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies
├── tailwind.config.ts            # Tailwind configuration
└── tsconfig.json                 # TypeScript configuration
```

## Features

### Globe Visualization
- **3D Interactive Globe:** WebGL-rendered earth with continents
- **Manual Controls:** Drag to rotate, scroll to zoom
- **Auto-Rotation:** Gentle spinning when idle
- **Smooth Animations:** Damped rotation, pulsing markers

### Affiliation Display
- **Pulsing Markers:** Red spheres at institutional locations
- **Connection Curves:** Bezier curves linking collaborating institutions
- **Auto-Center:** Rotates to show first affiliation on paper load
- **View Reset:** Returns to equator view before rotation

### Paper Browsing
- **Category Selection:** 15 arXiv categories (CS, Physics, Math)
- **Sequential Navigation:** Browse papers from newest to oldest
- **LaTeX Support:** Renders math notation in titles and abstracts
- **Metadata Display:** Authors, affiliations, abstract

### Responsive Design
- **Mobile Optimized:** Smaller globe, touch controls
- **Tablet:** Medium-sized globe
- **Desktop:** Large globe for detailed exploration
- **Text Scaling:** Responsive font sizes

## Backend Integration Details

**Backend Repository:** https://github.com/ce335805/globe-backend

**Backend Architecture:**
- **Platform:** GCP Cloud Run (serverless containers)
- **Framework:** FastAPI (Python)
- **Region:** europe-west3 (Frankfurt, Germany)
- **Processing Pipeline:**
  1. Fetch paper from arXiv API
  2. Download PDF and extract first page
  3. Parse affiliations with LLM (gpt-4o-mini)
  4. Geocode addresses to coordinates (Nominatim)
  5. Return structured JSON

**Backend Security:**
1. **API Key Authentication:** X-API-Key header required
2. **Rate Limiting:** 20 requests/minute per IP
3. **CORS Restriction:** Only allows Vercel domain and localhost

**Backend Response Format:**
```json
{
  "arxiv_id": "2501.12345",
  "title": "Paper Title",
  "authors": [{"name": "Author Name"}],
  "abstract": "Abstract text...",
  "affiliations": [
    {
      "institution": "MIT",
      "address": "Cambridge, MA",
      "country": "USA",
      "latitude": 42.3601,
      "longitude": -71.0942,
      "geocoded": true
    }
  ],
  "metadata": {
    "index": 0,
    "category": "cs.AI",
    "total_affiliations": 3,
    "geocoded_affiliations": 3,
    "has_more": true
  }
}
```

## Testing

**Manual Testing:**
1. Visit https://arxiv-globe.vercel.app
2. Select different categories
3. Click "Next" to browse papers
4. Drag globe to rotate manually
5. Scroll to zoom in/out
6. Test on mobile device

**Local Testing:**
```bash
# Start frontend
npm run dev

# Open browser
open http://localhost:3000

# Test against local backend
# Ensure backend is running on http://localhost:8000
```

## Future Enhancements

**Potential Features:**
- Paper search by arXiv ID or keyword
- Save/bookmark favorite papers
- Share paper links (deep linking)
- Animation timeline showing paper history
- Filter by date range or impact metrics
- Dark mode toggle
- Export visualization as image/video
- Full-screen globe mode

**Performance Optimizations:**
- Client-side caching (IndexedDB for browsed papers)
- Lazy loading of Three.js (code splitting)
- WebWorker for coordinate calculations
- LOD (Level of Detail) for distant markers

**Visualization Improvements:**
- Color-code markers by institution type
- Marker size based on number of authors
- Animated curve growth
- Tooltip on marker hover
- Institution name labels
- Globe rotation following mouse

## Troubleshooting

**Issue:** Globe not rendering
- Check browser console for WebGL errors
- Ensure browser supports WebGL 2.0
- Try different browser (Chrome, Firefox, Safari)

**Issue:** Papers not loading
- Check backend is running and accessible
- Verify BACKEND_URL and BACKEND_API_KEY in .env.local
- Check browser network tab for failed requests
- Verify CORS allows your origin

**Issue:** Slow loading
- Backend cold start after idle (5-9 seconds first request)
- Geocoding is rate-limited (1 req/sec)
- Papers with many affiliations take longer

**Issue:** LaTeX not rendering
- Check browser console for KaTeX errors
- Verify LaTeX syntax in paper title/abstract
- Invalid LaTeX displays in red

## Resources

- **Live Demo:** https://arxiv-globe.vercel.app
- **Backend Repo:** https://github.com/ce335805/globe-backend
- **arXiv API:** https://info.arxiv.org/help/api/index.html
- **Three.js Docs:** https://threejs.org/docs/
- **Next.js Docs:** https://nextjs.org/docs
- **Vercel Docs:** https://vercel.com/docs

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

## Deployment Checklist

Before deploying to production:
- [ ] Set environment variables in Vercel dashboard
- [ ] Verify backend URL points to production
- [ ] Test API key authentication
- [ ] Check responsive design on mobile
- [ ] Verify CORS allows Vercel domain
- [ ] Test paper loading across categories
- [ ] Verify LaTeX rendering
- [ ] Check globe controls (drag, zoom)
- [ ] Test "Next" button pagination
- [ ] Monitor backend logs for errors
