export async function executeNimbleSearch(args: { query: string }) {
  if (!process.env.NIMBLE_API_KEY) {
    return { error: 'Nimble API key not configured. Skipping web search.' }
  }
  try {
    const res = await fetch('https://api.nimbleway.com/api/v1/realtime/web', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(process.env.NIMBLE_API_KEY + ':').toString('base64')}`,
      },
      body: JSON.stringify({
        parse: true,
        query: args.query,
        search_engine: 'google_search',
        format: 'json',
        render: false,
      }),
    })
    return await res.json()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[nimbleSearch] Error:', msg)
    return { error: `Nimble search failed: ${msg}` }
  }
}
