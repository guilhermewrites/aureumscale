import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { ContentItem, Platform, ContentStatus, VideoStyle } from '../types';

interface UseSupabaseContentProps {
  userId: string;
  platform: Platform;
}

export const useSupabaseContent = ({ userId, platform }: UseSupabaseContentProps) => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch content from Supabase
  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', platform)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items: ContentItem[] = (data || []).map(row => ({
        id: row.id,
        title: row.title,
        description: row.description || undefined,
        driveLink: row.drive_link || '',
        scriptLink: row.script_link || undefined,
        thumbnailUrl: row.thumbnail_url || undefined,
        youtubeUrl: row.youtube_url || undefined,
        status: row.status as ContentStatus,
        style: row.style as VideoStyle | undefined,
        team: row.team || [],
        postDate: row.post_date || '',
        platform: row.platform as Platform,
      }));

      setContent(items);
      setError(null);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch content');
    } finally {
      setLoading(false);
    }
  }, [userId, platform]);

  // Add new content
  const addContent = async (item: ContentItem) => {
    try {
      const { error } = await supabase.from('content_items').insert({
        id: item.id,
        user_id: userId,
        title: item.title,
        description: item.description,
        drive_link: item.driveLink,
        script_link: item.scriptLink,
        thumbnail_url: item.thumbnailUrl,
        youtube_url: item.youtubeUrl,
        status: item.status,
        style: item.style,
        team: item.team,
        post_date: item.postDate,
        platform: item.platform,
      });

      if (error) throw error;
      
      setContent(prev => [item, ...prev]);
      return true;
    } catch (err) {
      console.error('Error adding content:', err);
      setError(err instanceof Error ? err.message : 'Failed to add content');
      return false;
    }
  };

  // Update content
  const updateContent = async (item: ContentItem) => {
    try {
      const { error } = await supabase
        .from('content_items')
        .update({
          title: item.title,
          description: item.description,
          drive_link: item.driveLink,
          script_link: item.scriptLink,
          thumbnail_url: item.thumbnailUrl,
          youtube_url: item.youtubeUrl,
          status: item.status,
          style: item.style,
          team: item.team,
          post_date: item.postDate,
          platform: item.platform,
        })
        .eq('id', item.id);

      if (error) throw error;
      
      setContent(prev => prev.map(c => c.id === item.id ? item : c));
      return true;
    } catch (err) {
      console.error('Error updating content:', err);
      setError(err instanceof Error ? err.message : 'Failed to update content');
      return false;
    }
  };

  // Delete content
  const deleteContent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('content_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setContent(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting content:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete content');
      return false;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return {
    content,
    setContent,
    loading,
    error,
    addContent,
    updateContent,
    deleteContent,
    refetch: fetchContent,
  };
};
