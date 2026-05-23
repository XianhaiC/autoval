// Unauthenticated GitHub API fetch — works on public repos, no token needed.
// For the demo dashboard we don't need write access — just listing evals/*.json
// from main. The agent's createPR tool uses its own authenticated client.

const OWNER = process.env.GITHUB_OWNER || 'dabomb1004'
const REPO = process.env.GITHUB_REPO || 'Hackathon-Template'
const EVALS_PATH = `${process.env.GITHUB_BASE_PATH || 'frontend'}/evals`
const API = 'https://api.github.com'

export interface Eval {
  id: string
  name: string
  description: string
  input: string
  assertions: Array<{ type: string; value: string | string[] }>
  evidence?: { source?: string; finding?: string }
  category?: string
  created_by?: string
}

export interface PendingPR {
  number: number
  title: string
  html_url: string
  user_login: string
  created_at: string
}

interface GitHubContentItem {
  name: string
  path: string
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  download_url: string | null
}

export async function fetchEvals(): Promise<Eval[]> {
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

    const dirRes = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${EVALS_PATH}`, {
      headers,
      next: { revalidate: 30 },
    })
    if (!dirRes.ok) {
      console.error('[fetchEvals] dir', dirRes.status, await dirRes.text())
      return []
    }
    const dir = (await dirRes.json()) as GitHubContentItem[]
    const jsonFiles = dir.filter((f) => f.type === 'file' && f.name.endsWith('.json'))

    const fetched = await Promise.all(
      jsonFiles.map(async (f) => {
        if (!f.download_url) return null
        try {
          const res = await fetch(f.download_url, { headers, next: { revalidate: 30 } })
          if (!res.ok) return null
          return (await res.json()) as Eval
        } catch (err) {
          console.error('[fetchEvals]', f.name, err)
          return null
        }
      })
    )

    return fetched.filter((e): e is Eval => e !== null)
  } catch (err) {
    console.error('[fetchEvals]', err)
    return []
  }
}

export async function fetchOpenAutovalPRs(): Promise<PendingPR[]> {
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

    const res = await fetch(`${API}/repos/${OWNER}/${REPO}/pulls?state=open&sort=created&direction=desc&per_page=10`, {
      headers,
      next: { revalidate: 30 },
    })
    if (!res.ok) return []
    const prs = (await res.json()) as Array<{
      number: number
      title: string
      html_url: string
      user: { login: string } | null
      created_at: string
    }>
    // Filter to Autoval-authored PRs only — heuristic on title prefix used by the agent.
    return prs
      .filter((p) => /^(\[autoval\]|fix:|\[test\] autoval|autoval)/i.test(p.title))
      .map((p) => ({
        number: p.number,
        title: p.title,
        html_url: p.html_url,
        user_login: p.user?.login ?? 'unknown',
        created_at: p.created_at,
      }))
  } catch (err) {
    console.error('[fetchOpenAutovalPRs]', err)
    return []
  }
}
