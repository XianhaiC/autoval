interface SerpResult {
  title?: string
  url?: string
  snippet?: string
  entity_type?: string
}

export async function executeNimbleSearch(args: { query: string }) {
  if (!process.env.NIMBLE_API_KEY) {
    return { error: 'Nimble API key not configured. Skipping web search.' }
  }
  try {
    const res = await fetch('https://sdk.nimbleway.com/v1/serp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NIMBLE_API_KEY}`,
      },
      body: JSON.stringify({
        search_engine: 'google_search',
        query: args.query,
        num_results: 5,
        no_html: true,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[nimbleSearch] API error:', res.status, text.slice(0, 200))
      return { error: `Nimble API returned ${res.status}: ${text.slice(0, 200)}` }
    }

    const data = await res.json()
    const entities = data.data?.parsing?.entities || {}
    const organicResults: SerpResult[] = entities.OrganicResult || []

    return {
      query: args.query,
      results: organicResults.slice(0, 5).map((r: SerpResult) => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet,
      })),
      related_searches: (entities.RelatedSearch || []).slice(0, 3).map((r: SerpResult) => r.title || (r as Record<string, unknown>).query),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[nimbleSearch] Error:', msg)
    return { error: `Nimble search failed: ${msg}` }
  }
}
