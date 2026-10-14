import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://prjmssdqknyidizllotb.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByam1zc2Rxa255aWRpemxsb3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNDkxMjgsImV4cCI6MjEwNjkyNTEyOH0.Eb2EB-AxWkZ4oh6BHAn4V0tgdPOWVfj2nNBYfUphq6c";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
