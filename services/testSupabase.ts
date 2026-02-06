import { supabase } from './supabaseClient';

export const testSupabaseConnection = async () => {
  try {
    // Try to query the content_items table
    const { data, error } = await supabase
      .from('content_items')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection error:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Supabase connected successfully!', data);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Supabase connection failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};
