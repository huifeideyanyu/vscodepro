
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://cjnuyasmjmodynjpaoxr.supabase.co';

const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_9dCsowYjqpvoen6tID33Sg_hBpGkehh';

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
