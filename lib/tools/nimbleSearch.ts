export async function executeNimbleSearch(args: { query: string }) {
  // TODO: implement Nimble Web Search API call
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
}
