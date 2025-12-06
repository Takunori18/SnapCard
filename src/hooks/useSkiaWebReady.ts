import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { ensureSkiaWeb } from '../web-shims/ensureSkiaWeb';

type SkiaWebState = {
  ready: boolean;
  error: Error | null;
};

/**
 * Web で CanvasKit のロードが完了するまで待ち、Skia を安全に使えるようにする。
 */
export const useSkiaWebReady = (): SkiaWebState => {
  const [state, setState] = useState<SkiaWebState>({
    ready: Platform.OS !== 'web',
    error: null,
  });

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    let mounted = true;
    ensureSkiaWeb()
      .then(() => {
        if (mounted) {
          setState({ ready: true, error: null });
        }
      })
      .catch((error) => {
        if (mounted) {
          setState({ ready: false, error });
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return state;
};
