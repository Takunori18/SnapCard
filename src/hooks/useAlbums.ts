import { useAlbumContext } from '../contexts/AlbumContext';

export const useAlbums = () => {
  return useAlbumContext();
};
