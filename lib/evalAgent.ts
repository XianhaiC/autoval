import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Tool declarations for the eval agent
const tools: FunctionDeclaration[] = [
  {
    name: 'query_clickhouse',
    description: 'Query the ClickHouse log table for LLM call records. Use SQL syntax.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        sql: { type: SchemaType.STRING, description: 'SQL query to run against llm_call_logs table' },
      },
      required: ['sql'],
    },
  },
  {
    name: 'nimble_web_search',
    description: 'Search the web for evidence to ground your judgment. Use for drug interactions, medical facts, etc.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'judge_output',
    description: 'Score an LLM output as correct or incorrect, given the input and any web evidence.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        input: { type: SchemaType.STRING, description: 'The original user input' },
        output: { type: SchemaType.STRING, description: 'The LLM output to judge' },
        evidence: { type: SchemaType.STRING, description: 'Web evidence to ground the judgment' },
        verdict: { type: SchemaType.STRING, description: 'SAFE or DANGEROUS' },
        reason: { type: SchemaType.STRING, description: 'Why this verdict' },
      },
      required: ['input', 'output', 'verdict', 'reason'],
    },
  },
  {
    name: 'generate_safety_rule',
    description: 'Create a safety rule (eval test case) from a failure.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: 'Human-readable rule name' },
        description: { type: SchemaType.STRING, description: 'What this rule checks' },
        input: { type: SchemaType.STRING, description: 'Test input' },
        must_not_contain: { type: SchemaType.STRING, description: 'Output must NOT contain this' },
        must_contain: { type: SchemaType.STRING, description: 'Output MUST contain this' },
        evidence_source: { type: SchemaType.STRING, description: 'Where the evidence came from' },
      },
      required: ['name', 'description', 'input'],
    },
  },
  {
    name: 'test_prompt_fix',
    description: 'Test a modified prompt against all safety rules. Returns pass/fail for each rule.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        new_prompt_addition: { type: SchemaType.STRING, description: 'The rule to add to the system prompt' },
      },
      required: ['new_prompt_addition'],
    },
  },
  {
    name: 'create_pull_request',
    description: 'Create a GitHub PR with the updated prompt and new safety rule.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: 'PR title' },
        prompt_addition: { type: SchemaType.STRING, description: 'Text to add to system prompt' },
        safety_rule_json: { type: SchemaType.STRING, description: 'JSON string of the safety rule' },
      },
      required: ['title', 'prompt_addition', 'safety_rule_json'],
    },
  },
  {
    name: 'scan_recent_logs',
    description: 'Scan recent ClickHouse logs for potential issues. Returns suspicious entries.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        minutes: { type: SchemaType.NUMBER, description: 'How many minutes back to scan (default: 60)' },
      },
    },
  },
  {
    name: 'complete_run',
    description: 'Mark the current run as complete with a summary.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        summary: { type: SchemaType.STRING, description: 'Summary of what was found and fixed' },
        issues_found: { type: SchemaType.NUMBER, description: 'Number of issues found' },
        rules_added: { type: SchemaType.NUMBER, description: 'Number of new safety rules created' },
        pr_url: { type: SchemaType.STRING, description: 'URL of the created PR' },
      },
      required: ['summary'],
    },
  },
]

export { tools, genAI }
// TODO: implement runEvalAgent() with the agentic loop
