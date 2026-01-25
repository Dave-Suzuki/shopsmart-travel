import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './hooks/useAuth';
import { useUserProfile } from './hooks/useUserProfile';
import { useExtensionAuth } from './hooks/useExtensionAuth';
import { OnboardingProvider } from './contexts/OnboardingContext';
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
  const { isExtensionLogin, authSent } = useExtensionAuth(user);

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
    return <LoginButton isExtensionLogin={isExtensionLogin} />;
  }

  // Show success message when auth sent to extension
  if (isExtensionLogin && authSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connected!</h2>
          <p className="text-gray-600 mb-4">
            You're now signed in to the ShopSmart extension.
          </p>
          <p className="text-sm text-gray-500">
            This tab will close automatically...
          </p>
        </div>
      </div>
    );
  }

  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
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
  );
}

export default App;
