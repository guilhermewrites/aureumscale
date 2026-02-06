import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { Funnel, FunnelStep } from '../types';

interface UseSupabaseFunnelsProps {
  userId: string;
}

export const useSupabaseFunnels = ({ userId }: UseSupabaseFunnelsProps) => {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch funnels from Supabase
  const fetchFunnels = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items: Funnel[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        steps: (row.steps || []) as FunnelStep[],
        createdAt: row.created_at,
      }));

      setFunnels(items);
      setError(null);
    } catch (err) {
      console.error('Error fetching funnels:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch funnels');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Add new funnel
  const addFunnel = async (funnel: Funnel) => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('funnels').insert({
        id: funnel.id,
        user_id: userId,
        name: funnel.name,
        description: funnel.description,
        steps: funnel.steps,
      });

      if (error) throw error;

      setFunnels(prev => [funnel, ...prev]);
      return true;
    } catch (err) {
      console.error('Error adding funnel:', err);
      setError(err instanceof Error ? err.message : 'Failed to add funnel');
      return false;
    }
  };

  // Update funnel
  const updateFunnel = async (funnel: Funnel) => {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('funnels')
        .update({
          name: funnel.name,
          description: funnel.description,
          steps: funnel.steps,
        })
        .eq('id', funnel.id);

      if (error) throw error;

      setFunnels(prev => prev.map(f => f.id === funnel.id ? funnel : f));
      return true;
    } catch (err) {
      console.error('Error updating funnel:', err);
      setError(err instanceof Error ? err.message : 'Failed to update funnel');
      return false;
    }
  };

  // Delete funnel
  const deleteFunnel = async (id: string) => {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from('funnels')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFunnels(prev => prev.filter(f => f.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting funnel:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete funnel');
      return false;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  return {
    funnels,
    setFunnels,
    loading,
    error,
    addFunnel,
    updateFunnel,
    deleteFunnel,
    refetch: fetchFunnels,
  };
};
