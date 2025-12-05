// src/lib/spotify/auth.ts
import * as AuthSession from 'expo-auth-session';

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

type SpotifyAuthResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};

export async function loginWithSpotify(): Promise<SpotifyAuthResult> {
  const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error('EXPO_PUBLIC_SPOTIFY_CLIENT_ID が設定されていません');
  }

  // .env にあればそれを使う。なければ makeRedirectUri で自動生成
  const redirectUri =
    process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI ||
    AuthSession.makeRedirectUri({ path: 'spotify' });

  const scopes =
    (process.env.EXPO_PUBLIC_SPOTIFY_SCOPES ??
      'user-read-email').split(' ');

  const authRequest = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes,
    usePKCE: true,
    responseType: AuthSession.ResponseType.Code,
  });

  // ブラウザを開いてログイン
  const result = await authRequest.promptAsync(discovery, {
    useProxy: false,
  });

  if (result.type !== 'success' || !result.params.code) {
    throw new Error('Spotify ログインがキャンセルされました');
  }

  // Code → AccessToken に交換
  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: {
        code_verifier: authRequest.codeVerifier!,
      },
    },
    discovery
  );

  if (!tokenResponse.accessToken) {
    throw new Error('Spotify トークン取得に失敗しました');
  }

  return {
    accessToken: tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken,
    expiresIn: tokenResponse.expiresIn,
  };
}
