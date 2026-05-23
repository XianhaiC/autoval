import { GoogleGenerativeAI } from '@google/generative-ai'
import { executeReadPrompt, executeReadEvals } from './createPR'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface EvalRule {
  name: string
  test_input: string
  must_not_contain?: string
  must_contain?: string
}

interface EvalResult {
  name: string
  passed: boolean
  reason: string
}

export async function executeTestPromptFix(args: { prompt_addition: string }) {
  // 1. Read current prompt from GitHub
  const promptResult = await executeReadPrompt()
  const currentPrompt = 'content' in promptResult ? promptResult.content : ''

  // Build the new prompt
  const newPrompt = currentPrompt + '\n\n' + args.prompt_addition

  // 2. Read existing eval rules from GitHub
  const evalsResult = await executeReadEvals()
  const evals: EvalRule[] = 'evals' in evalsResult ? evalsResult.evals : []

  if (evals.length === 0) {
    return {
      tested: true,
      prompt_addition: args.prompt_addition,
      results: { total: 0, passed: 0, failed: 0, details: [] },
      note: 'No existing safety rules found in repo. All clear.',
    }
  }

  // 3. Run each eval
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const details: EvalResult[] = []

  for (const rule of evals) {
    if (!rule.test_input) continue

    try {
      const result = await model.generateContent({
        systemInstruction: newPrompt,
        contents: [{ role: 'user', parts: [{ text: rule.test_input }] }],
      })
      const output = result.response.text().toLowerCase()

      let passed = true
      let reason = 'Passed'

      if (rule.must_not_contain) {
        const forbidden = rule.must_not_contain.toLowerCase()
        if (output.includes(forbidden)) {
          passed = false
          reason = `Output contains forbidden term: "${rule.must_not_contain}"`
        }
      }

      if (rule.must_contain) {
        const required = rule.must_contain.toLowerCase()
        if (!output.includes(required)) {
          passed = false
          reason = `Output missing required term: "${rule.must_contain}"`
        }
      }

      details.push({ name: rule.name || 'unnamed', passed, reason })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      details.push({ name: rule.name || 'unnamed', passed: false, reason: `Error: ${msg}` })
    }
  }

  const passed = details.filter((d) => d.passed).length
  const failed = details.filter((d) => !d.passed).length

  return {
    tested: true,
    prompt_addition: args.prompt_addition,
    results: { total: details.length, passed, failed, details },
  }
}
