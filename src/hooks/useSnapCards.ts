import { useState, useEffect } from 'react';
import { SnapCard } from '../types';
import { mockCards, mockDiscoverCards } from '../mock/data';

export const useSnapCards = (userId?: string) => {
  const [cards, setCards] = useState<SnapCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Supabase からデータ取得
    // const fetchCards = async () => {
    //   const { data, error } = await supabase
    //     .from('cards')
    //     .select('*')
    //     .eq('userId', userId)
    //     .order('createdAt', { ascending: false });
    //   
    //   if (data) setCards(data);
    //   setLoading(false);
    // };
    // fetchCards();
    
    // モックデータで動作
    setTimeout(() => {
      setCards(userId ? mockCards : mockDiscoverCards);
      setLoading(false);
    }, 500);
  }, [userId]);

  const refreshCards = () => {
    setLoading(true);
    setTimeout(() => {
      setCards(userId ? mockCards : mockDiscoverCards);
      setLoading(false);
    }, 500);
  };

  return { cards, loading, refreshCards };
};

export const useSnapCard = (cardId: string) => {
  const [card, setCard] = useState<SnapCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Supabase から単一カード取得
    // const fetchCard = async () => {
    //   const { data, error } = await supabase
    //     .from('cards')
    //     .select('*')
    //     .eq('id', cardId)
    //     .single();
    //   
    //   if (data) setCard(data);
    //   setLoading(false);
    // };
    // fetchCard();
    
    setTimeout(() => {
      const found = [...mockCards, ...mockDiscoverCards].find(c => c.id === cardId);
      setCard(found || null);
      setLoading(false);
    }, 300);
  }, [cardId]);

  return { card, loading };
};
