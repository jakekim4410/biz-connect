// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// .env 파일에 등록한 값을 불러옵니다.
// lazy 초기화 — 빌드 시점에 env가 없어도 에러가 발생하지 않습니다.
let _supabase: SupabaseClient | null = null;

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      _supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
    return (_supabase as any)[prop];
  }
});