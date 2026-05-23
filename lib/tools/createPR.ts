import { Octokit } from '@octokit/rest'

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
const OWNER = process.env.GITHUB_OWNER || ''
const REPO = process.env.GITHUB_REPO || ''

export async function executeCreatePR(args: {
  title: string
  prompt_addition: string
  safety_rule_json: string
}) {
  // TODO: implement — create branch, commit files, open PR
  void octokit
  void args
  return { pr_url: `https://github.com/${OWNER}/${REPO}/pull/1`, status: 'created' }
}
