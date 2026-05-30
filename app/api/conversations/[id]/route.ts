import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/conversations/[id] — load a conversation
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 404 })
  }
  return Response.json(data)
}

// DELETE /api/conversations/[id] — delete a conversation
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', params.id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ deleted: true })
}
