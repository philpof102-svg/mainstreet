/**
 * MainStreet SDK — LLM tool definitions (TypeScript types).
 */

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: any) => Promise<any>;
}

export interface OpenAITool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface VercelAiSdkTool {
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: any) => Promise<any>;
}

export interface LangchainToolSpec {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  func: (args: any) => Promise<any>;
}

export interface MastraToolSpec {
  id: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (ctx: { context: any }) => Promise<any>;
}

export interface GenericSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export declare function openai(): OpenAITool[];
export declare function anthropic(): AnthropicTool[];
export declare function vercelAiSdk(): Record<string, VercelAiSdkTool>;
export declare function langchain(): LangchainToolSpec[];
export declare function mastra(): MastraToolSpec[];
export declare function specs(): GenericSpec[];
export declare function execute(name: string, args: any): Promise<any>;

export declare const matchSpec: ToolSpec;
export declare const pickSpec: ToolSpec;
export declare const scoreSpec: ToolSpec;
export declare const compareSpec: ToolSpec;
export declare const leaderboardSpec: ToolSpec;
export declare const vetSpec: ToolSpec;

declare const _default: {
  openai: typeof openai;
  anthropic: typeof anthropic;
  vercelAiSdk: typeof vercelAiSdk;
  langchain: typeof langchain;
  mastra: typeof mastra;
  specs: typeof specs;
  execute: typeof execute;
  matchSpec: ToolSpec;
  pickSpec: ToolSpec;
  scoreSpec: ToolSpec;
  compareSpec: ToolSpec;
  leaderboardSpec: ToolSpec;
  vetSpec: ToolSpec;
};
export default _default;
