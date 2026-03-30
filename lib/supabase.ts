// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// .env 파일에 등록한 값을 불러옵니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! 

// 파일을 서버에서 업로드하기 위해 권한이 높은 Service Role Key를 사용합니다.
export const supabase = createClient(supabaseUrl, supabaseServiceKey)