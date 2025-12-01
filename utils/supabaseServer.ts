import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!url || !serviceRole) {
  // eslint-disable-next-line no-console
  console.warn("Supabase server keys are not set. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

export const supabaseServer = createClient(url, serviceRole, {
  // server side client
});

export default supabaseServer;
