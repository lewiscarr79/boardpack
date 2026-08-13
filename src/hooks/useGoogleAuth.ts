import { useState, useEffect, useCallback } from 'react';
import { AuthState } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

declare const google: any;

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ');

export function useGoogleAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const savedToken = sessionStorage.getItem('google_access_token');
    const savedExpiry = sessionStorage.getItem('google_token_expiry');
    
    if (savedToken && savedExpiry && Number(savedExpiry) > Date.now()) {
      return {
        accessToken: savedToken,
        expiresAt: Number(savedExpiry),
      };
    }
    return { accessToken: null, expiresAt: null };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save auth token helper
  const setToken = useCallback((token: string, expiresInSeconds = 3600) => {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    sessionStorage.setItem('google_access_token', token);
    sessionStorage.setItem('google_token_expiry', String(expiresAt));
    setAuthState({
      accessToken: token,
      expiresAt,
    });
    setError(null);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('google_access_token');
    sessionStorage.removeItem('google_token_expiry');
    setAuthState({ accessToken: null, expiresAt: null });
  }, []);

  // Request OAuth access token using Google Identity Services GIS token client
  const login = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      setError('Google Identity Services script is loading. Please wait a moment and click again.');
      setIsLoading(false);
      return;
    }

    try {
      // Use client_id provisioned for this applet
      const client = google.accounts.oauth2.initTokenClient({
        client_id: firebaseConfig.oAuthClientId || '77057416161-pvp2fc01nmc79c3vnitqh161tdhplvto.apps.googleusercontent.com',
        scope: REQUIRED_SCOPES,
        callback: (response: any) => {
          setIsLoading(false);
          if (response.error) {
            console.error('OAuth token error:', response);
            setError(`Authentication failed: ${response.error_description || response.error}`);
            return;
          }
          if (response.access_token) {
            const expiresIn = response.expires_in ? Number(response.expires_in) : 3600;
            setToken(response.access_token, expiresIn);
          }
        },
        error_callback: (err: any) => {
          setIsLoading(false);
          console.error('OAuth popup error:', err);
          setError('OAuth login failed or popup was closed.');
        },
      });

      client.requestAccessToken({ prompt: '' });
    } catch (err: any) {
      setIsLoading(false);
      console.error('GIS initialization error:', err);
      setError(err.message || 'Failed to open Google login prompt.');
    }
  }, [setToken]);

  return {
    accessToken: authState.accessToken,
    isAuthenticated: Boolean(authState.accessToken && (authState.expiresAt || 0) > Date.now()),
    isLoading,
    error,
    login,
    logout,
    setToken,
  };
}
