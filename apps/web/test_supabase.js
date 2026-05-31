import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://rwzjsdkuixwviidjhmcp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3empzZGt1aXh3dmlpZGpobWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0ODIzNTYsImV4cCI6MjA5NTA1ODM1Nn0.7eNvdbysKjr9s0pw6BDPNNqLWVO6kBciongbLruKyOY'
)

async function test() {
  const { data: data1, error: err1 } = await supabase.from('quest_groups').select('*').limit(1)
  console.log('quest_groups query:', { data1, err1 })
  const { data: data2, error: err2 } = await supabase.from('group_members').select('*').limit(1)
  console.log('group_members query:', { data2, err2 })
}

test()
