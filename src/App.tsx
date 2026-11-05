import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './hooks/useAuth';
import { useUserProfile } from './hooks/useUserProfile';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { ExchangeRateProvider } from './contexts/ExchangeRateProvider';
import { LoginButton } from './components/Auth/LoginButton';
import { Header } from './components/Shared/Header';
import { LandingPage } from './pages/LandingPage';
import { TripsPage } from './pages/TripsPage';
import { TripDetailPage } from './pages/TripDetailPage';
import { BulkImportPage } from './pages/BulkImportPage';
import { InstallPrompt } from './components/Shared/InstallPrompt';
import { ReloadPrompt } from './components/Shared/ReloadPrompt';
import { WelcomeModal } from './components/Onboarding/WelcomeModal';

function App() {
  return (
    <>
      <Toaster position="bottom-right" richColors closeButton />
      <BrowserRouter>
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Authenticated app routes */}
          <Route path="/app/*" element={<AuthenticatedApp />} />

          {/* Legacy routes - redirect to /app */}
          <Route path="/trip/:tripId" element={<LegacyTripRedirect />} />
          <Route path="/trip/:tripId/import" element={<LegacyImportRedirect />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

function LegacyTripRedirect() {
  const tripId = window.location.pathname.split('/trip/')[1]?.split('/')[0];
  const search = window.location.search;
  return <Navigate to={`/app/trip/${tripId}${search}`} replace />;
}

function LegacyImportRedirect() {
  const tripId = window.location.pathname.split('/trip/')[1]?.split('/')[0];
  const search = window.location.search;
  return <Navigate to={`/app/trip/${tripId}/import${search}`} replace />;
}

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  useUserProfile(user);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginButton />;
  }

  return (
    // One shared exchange-rate listener for every signed-in page.
    <ExchangeRateProvider>
      <OnboardingProvider>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="container mx-auto px-4 py-4 sm:py-8">
            <Routes>
              <Route path="/" element={<TripsPage />} />
              <Route path="/trip/:tripId" element={<TripDetailPage />} />
              <Route path="/trip/:tripId/import" element={<BulkImportPage />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </main>
          <InstallPrompt />
          <ReloadPrompt />
          <WelcomeModal />
        </div>
      </OnboardingProvider>
    </ExchangeRateProvider>
  );
}

export default App;
