import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/conversations — list all conversations
export async function GET() {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json(data)
}

// POST /api/conversations — create or update a conversation
export async function POST(request: Request) {
  const body = await request.json()
  const { id, title, messages } = body as { id?: string; title?: string; messages: unknown[] }

  if (id) {
    // Update existing
    const { data, error } = await supabase
      .from('conversations')
      .update({ title, messages, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }
    return Response.json({ id: data.id })
  } else {
    // Create new
    const { data, error } = await supabase
      .from('conversations')
      .insert({ title: title || 'New conversation', messages: messages || [] })
      .select('id')
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }
    return Response.json({ id: data.id })
  }
}
