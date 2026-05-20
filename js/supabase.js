import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://dwotapdpwuyhpjabyyld.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3b3RhcGRwd3V5aHBqYWJ5eWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzEzMTIsImV4cCI6MjA5NDc0NzMxMn0.Kx98AbELRNPLfg2kb-_aUsKHCSxeRbXdcioodPQQKv8'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})