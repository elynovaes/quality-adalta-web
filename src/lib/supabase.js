import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pkddscxgogkwuulziylk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrZGRzY3hnb2drd3V1bHppeWxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjgxMDgsImV4cCI6MjA4OTgwNDEwOH0.zDXJ-8wSJQ7CUCZPEUYg44pmvwXfGx8B1Vitj7DMt4o'

export const supabase = createClient(supabaseUrl, supabaseKey)