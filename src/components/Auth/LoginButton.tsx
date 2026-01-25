import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getRedirectState } from '../../utils/authStorage';
import { debugLogger, type LogEntry } from '../../utils/debugLogger';
import { showSuccess, showError } from '../../utils/toast';

interface LoginButtonProps {
  isExtensionLogin?: boolean;
}

export function LoginButton({ isExtensionLogin = false }: LoginButtonProps) {
  const { signInWithGoogle, error: authError, isProcessingRedirect, retrySignIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Check if debug mode is enabled
  const isDebugMode = window.location.search.includes('debug=auth');

  // Subscribe to debug logs
  useEffect(() => {
    if (!isDebugMode) return;
    return debugLogger.subscribe(setLogs);
  }, [isDebugMode]);

  // Update debug info periodically in debug mode
  useEffect(() => {
    if (!isDebugMode) return;

    const updateDebugInfo = () => {
      const redirectState = getRedirectState();
      const now = Date.now();
      setDebugInfo({
        isProcessingRedirect,
        authError,
        redirectState,
        age: redirectState ? now - redirectState.redirectTimestamp : null,
        localStorage: localStorage.getItem('authRedirect'),
        sessionStorage: sessionStorage.getItem('authRedirect'),
        timestamp: now,
      });
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 1000);
    return () => clearInterval(interval);
  }, [isDebugMode, isProcessingRedirect, authError]);

  // Detect timeout from error message
  useEffect(() => {
    if (authError?.includes('timeout') || authError?.includes('took too long')) {
      setShowTimeout(true);
    } else {
      setShowTimeout(false);
    }
  }, [authError]);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      // Error is already logged in useAuth
    } finally {
      // Don't reset loading if we're in redirect flow
      if (!isProcessingRedirect) {
        setIsLoading(false);
      }
    }
  };

  const handleUploadLogs = async () => {
    try {
      // Collect all debug data
      const debugData = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        state: debugInfo,
        logs: logs,
        localStorage: {
          authRedirect: localStorage.getItem('authRedirect'),
        },
        sessionStorage: {
          authRedirect: sessionStorage.getItem('authRedirect'),
        },
      };

      const logText = JSON.stringify(debugData, null, 2);

      // Try to use native share API (works well on iOS)
      if (navigator.share) {
        const blob = new Blob([logText], { type: 'text/plain' });
        const file = new File([blob], 'shopsmart-debug-log.txt', { type: 'text/plain' });

        await navigator.share({
          title: 'ShopSmart Debug Log',
          text: 'Debug log from ShopSmart authentication',
          files: [file],
        });
        return;
      }

      // Fallback: Copy to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(logText);
        showSuccess('Logs copied to clipboard! Paste in a message to share.');
        return;
      }

      // Last resort: Download as file
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shopsmart-debug-log.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('Log file downloaded!');
    } catch (error) {
      console.error('Failed to share logs:', error);
      showError('Failed to share logs. See console for details.');
    }
  };

  // Show timeout screen with retry option
  if (showTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign-in Timeout</h2>
          <p className="text-gray-600 mb-6">
            Sign-in took longer than expected. This can happen due to slow network.
          </p>
          <button
            onClick={() => {
              setShowTimeout(false);
              retrySignIn();
            }}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
          <p className="mt-4 text-xs text-gray-500">
            Make sure you have a stable internet connection
          </p>
        </div>
      </div>
    );
  }

  // Show loading message when processing redirect
  if (isProcessingRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing sign-in...</h2>
          <p className="text-gray-600 mb-2">Processing your Google account</p>
          <p className="text-xs text-gray-500">This usually takes 2-5 seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ShopSmart Travel</h1>
          <p className="text-gray-600">
            {isExtensionLogin
              ? 'Sign in to connect the Chrome extension'
              : 'Your smart shopping companion for travel'}
          </p>
        </div>

        {authError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium mb-1">
                  {authError}
                </p>
                <p className="text-xs text-red-600">
                  {authError.includes('unauthorized')
                    ? 'Please make sure you\'re using the official app URL: https://shopsmart-800cb.web.app'
                    : 'If this persists, try: (1) Update your iOS/browser (2) Clear Safari cache (3) Try in another browser'}
                </p>
              </div>
            </div>
            <button
              onClick={retrySignIn}
              className="w-full mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear error and retry →
            </button>
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={isLoading || isProcessingRedirect}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 rounded-lg px-6 py-3 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <p className="mt-6 text-center text-sm text-gray-500">
          {isExtensionLogin
            ? 'After signing in, you\'ll be connected to the extension'
            : 'Track your shopping list across Paris & London'}
        </p>

        {isDebugMode && (
          <div className="mt-4 space-y-2">
            {/* Storage State */}
            {debugInfo && (
              <div className="p-3 bg-gray-900 text-green-400 rounded-lg text-xs font-mono">
                <div className="font-bold text-yellow-400 mb-2">📊 STATE (updates every 1s)</div>
                <div className="space-y-1">
                  <div><span className="text-gray-400">isProcessingRedirect:</span> {String(debugInfo.isProcessingRedirect)}</div>
                  <div><span className="text-gray-400">authError:</span> {debugInfo.authError || 'null'}</div>
                  {debugInfo.redirectState && (
                    <>
                      <div className="text-yellow-300 font-bold mt-2">Redirect State:</div>
                      <div><span className="text-gray-400">age:</span> {(debugInfo.age / 1000).toFixed(1)}s</div>
                      <div className="text-red-400 font-bold mt-2">⚠️ NOT PROCESSING!</div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Console Logs */}
            <div className="p-3 bg-gray-900 text-white rounded-lg text-xs font-mono">
              <div className="flex justify-between items-center mb-2">
                <div className="font-bold text-yellow-400">📝 CONSOLE LOGS</div>
                <button
                  onClick={() => debugLogger.clear()}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1 max-h-64 overflow-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500">No logs yet...</div>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className={
                        log.level === 'error'
                          ? 'text-red-400'
                          : log.level === 'warn'
                          ? 'text-yellow-400'
                          : 'text-green-400'
                      }
                    >
                      <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>{' '}
                      {log.message}
                      {log.data && <div className="text-gray-400 ml-4">{JSON.stringify(log.data, null, 2)}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handleUploadLogs}
                className="w-full bg-blue-600 text-white px-3 py-3 rounded font-bold hover:bg-blue-500 text-sm"
              >
                📤 SHARE DEBUG LOG
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-yellow-600 text-black px-3 py-2 rounded font-bold hover:bg-yellow-500 text-xs"
                >
                  RELOAD
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  className="flex-1 bg-red-600 text-white px-3 py-2 rounded font-bold hover:bg-red-500 text-xs"
                >
                  CLEAR & RELOAD
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
