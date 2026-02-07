import { supabase } from './supabaseClient';

interface SyncResult {
  success: boolean;
  contentCount: number;
  adsCount: number;
  funnelsCount: number;
  errors: string[];
}

export const syncLocalDataToSupabase = async (storagePrefix: string): Promise<SyncResult> => {
  const result: SyncResult = {
    success: true,
    contentCount: 0,
    adsCount: 0,
    funnelsCount: 0,
    errors: [],
  };

  if (!supabase) {
    result.errors.push('Supabase not configured');
    result.success = false;
    return result;
  }

  // 1. Sync Content Items
  try {
    const contentKey = `${storagePrefix}_content`;
    const contentData = localStorage.getItem(contentKey);
    if (contentData) {
      const items = JSON.parse(contentData);
      for (const item of items) {
        const { error } = await supabase.from('content_items').upsert({
          id: item.id,
          user_id: storagePrefix,
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
        if (error) {
          result.errors.push(`Content "${item.title}": ${error.message}`);
        } else {
          result.contentCount++;
        }
      }
    }
  } catch (err) {
    result.errors.push(`Content sync failed: ${err}`);
  }

  // 2. Sync Ads
  try {
    const adsKey = `${storagePrefix}_ad_items`;
    const adsData = localStorage.getItem(adsKey);
    if (adsData) {
      const items = JSON.parse(adsData);
      for (const ad of items) {
        const { error } = await supabase.from('ads').upsert({
          id: ad.id,
          user_id: storagePrefix,
          name: ad.name,
          status: ad.status,
          drive_link: ad.driveLink,
          script: ad.script,
          description: ad.description,
          funnel_id: ad.funnelId || null,
          ad_type: ad.adType,
          order_num: ad.order,
        });
        if (error) {
          result.errors.push(`Ad "${ad.name}": ${error.message}`);
        } else {
          result.adsCount++;
        }
      }
    }
  } catch (err) {
    result.errors.push(`Ads sync failed: ${err}`);
  }

  // 3. Sync Funnels
  try {
    const funnelsKey = `${storagePrefix}_funnels`;
    const funnelsData = localStorage.getItem(funnelsKey);
    if (funnelsData) {
      const items = JSON.parse(funnelsData);
      for (const funnel of items) {
        const { error } = await supabase.from('funnels').upsert({
          id: funnel.id,
          user_id: storagePrefix,
          name: funnel.name,
          description: funnel.description,
          steps: funnel.steps,
          expected_metrics: funnel.expectedMetrics ?? null,
        });
        if (error) {
          result.errors.push(`Funnel "${funnel.name}": ${error.message}`);
        } else {
          result.funnelsCount++;
        }
      }
    }
  } catch (err) {
    result.errors.push(`Funnels sync failed: ${err}`);
  }

  result.success = result.errors.length === 0;
  return result;
};
