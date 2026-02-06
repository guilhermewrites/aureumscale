import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

export type AdStatus = 'Unassigned' | 'Pending' | 'Scripted' | 'Recorded' | 'Edited' | 'Needs Review' | 'Live' | 'Paused' | 'Killed';

export interface AdItem {
  id: string;
  name: string;
  description?: string;
  script?: string;
  driveLink?: string;
  status: AdStatus;
  adType: 'marketing' | 'remarketing';
  funnelId?: string;
  order: number;
  createdAt: string;
  isDeleted?: boolean;
}

interface UseSupabaseAdsProps {
  userId: string;
}

export const useSupabaseAds = ({ userId }: UseSupabaseAdsProps) => {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch ads from Supabase
  const fetchAds = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('user_id', userId)
        .order('order_num', { ascending: true });

      if (error) throw error;

      const items: AdItem[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        script: row.script || undefined,
        driveLink: row.drive_link || undefined,
        status: row.status as AdStatus,
        adType: row.ad_type as 'marketing' | 'remarketing',
        funnelId: row.funnel_id || undefined,
        order: row.order_num || 0,
        createdAt: row.created_at,
        isDeleted: false,
      }));

      setAds(items);
      setError(null);
    } catch (err) {
      console.error('Error fetching ads:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ads');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Add new ad
  const addAd = async (item: AdItem) => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('ads').insert({
        id: item.id,
        user_id: userId,
        name: item.name,
        description: item.description,
        script: item.script,
        drive_link: item.driveLink,
        status: item.status,
        ad_type: item.adType,
        funnel_id: item.funnelId,
        order_num: item.order,
      });

      if (error) throw error;

      setAds(prev => [...prev, item]);
      return true;
    } catch (err) {
      console.error('Error adding ad:', err);
      setError(err instanceof Error ? err.message : 'Failed to add ad');
      return false;
    }
  };

  // Update ad
  const updateAd = async (id: string, updates: Partial<AdItem>) => {
    if (!supabase) return false;
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.script !== undefined) dbUpdates.script = updates.script;
      if (updates.driveLink !== undefined) dbUpdates.drive_link = updates.driveLink;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.adType !== undefined) dbUpdates.ad_type = updates.adType;
      if (updates.funnelId !== undefined) dbUpdates.funnel_id = updates.funnelId;
      if (updates.order !== undefined) dbUpdates.order_num = updates.order;

      const { error } = await supabase
        .from('ads')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setAds(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
      return true;
    } catch (err) {
      console.error('Error updating ad:', err);
      setError(err instanceof Error ? err.message : 'Failed to update ad');
      return false;
    }
  };

  // Delete ad
  const deleteAd = async (id: string) => {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('ads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAds(prev => prev.filter(a => a.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting ad:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete ad');
      return false;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  return {
    ads,
    setAds,
    loading,
    error,
    addAd,
    updateAd,
    deleteAd,
    refetch: fetchAds,
  };
};
