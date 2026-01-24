# ShopSmart Travel

A PWA for managing shopping lists during international travel.

## Day 1 - Project Setup ✓

### Completed Tasks
- ✅ Vite + React + TypeScript project created
- ✅ All dependencies installed (Firebase, Tailwind CSS, Lucide React)
- ✅ Tailwind CSS configured with custom theme
- ✅ Firebase configuration ready
- ✅ Environment variables template created
- ✅ Basic directory structure created
- ✅ Development server running on http://localhost:5173/

## Tech Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)

**Backend:**
- Firebase Authentication
- Cloud Firestore
- Cloud Functions
- Cloud Storage
- Firebase Hosting

## Project Structure

```
src/
├── components/
│   ├── Auth/
│   ├── Trip/
│   ├── Item/
│   │   └── AddItem/
│   ├── Budget/
│   ├── Priority/
│   ├── Offline/
│   └── Shared/
├── hooks/
├── services/
│   └── firebase.ts
├── types/
│   ├── Trip.ts
│   ├── Item.ts
│   └── User.ts
├── utils/
├── constants/
│   ├── categories.ts
│   ├── locations.ts
│   └── priorities.ts
└── App.tsx
```

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com/
   - Copy your Firebase config from Project Settings > General > Your apps
   - Fill in the values in `.env` file

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:5173/ in your browser

## Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase credentials:

```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Development Roadmap

### Week 1: Core Features (Jan 17-23)
- [x] Day 1: Project Setup
- [x] Day 2: Authentication & Layout
- [x] Day 3: Trip CRUD
- [x] Day 4: Quick Add Item UI
- [x] Day 5: Item List & Filters
- [x] Day 6: Check/Uncheck Items
- [x] Day 7: Priority Feature

### Week 2: Extended Features (Jan 18-24)
- [x] Day 8: URL Scraping (8-layer extraction strategy)
- [x] Day 9: Image Upload & Display (user-based storage security)
- [x] Day 10: Currency Conversion (with zero-division protection)
- [x] Day 11-12: PWA & Offline Support
- [x] Day 13: Sharing Feature (email-based collaboration)
- [x] Day 13.5: **QA Testing & Security Hardening** (17 critical/major issues fixed)
- [ ] Day 14: Testing with Partner

### Week 3: Polish & Launch (Jan 20-Feb 6)
- [x] Day 15-16: **Purchase Price Recording** (track actual vs planned spending)
- [x] **Landing Page Plan** (comprehensive strategy document created)
- [ ] Day 17-18: Budget Dashboard & Alerts
- [ ] Day 19-20: UI/UX Polish & Bug Fixes
- [ ] Day 21: Deploy & Final Test

**Target Launch:** February 6, 2026
**Target Travel:** February 10-17, 2026 (Paris & London)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Next Steps

Week 1 Complete! ✅

Ready for Week 2:
1. URL Scraping (Open Graph) - Auto-fill product info from URLs
2. Image Upload & Display - Upload and display product images
3. Currency Conversion - Auto USD conversion with daily rate updates
4. PWA & Offline Support - Service worker and offline sync
5. Sharing Feature - Multi-user trip collaboration

## Documentation

Full project documentation is available in the `shopsmart-docs` folder:
- PROJECT_BRIEF.md - Project overview
- TECHNICAL_SPEC.md - Technical specifications
- DEVELOPMENT_PLAN.md - Detailed development plan
- DESIGN_SYSTEM.md - Design system and components
- SAMPLE_DATA.md - Sample data for testing
