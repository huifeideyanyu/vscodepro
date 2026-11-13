
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://cjnuyasmjmodynjpaoxr.supabase.co";

// 在这里粘贴你自己的 sb_publishable_ 密钥
const SUPABASE_KEY = "sb_publishable_9dCsowYjqpvoen6tID33Sg_hBpGkehh";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);
