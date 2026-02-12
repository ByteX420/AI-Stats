// Purpose: Executor for ai21 / text-generate.
// Why: Isolates provider-specific behavior per capability.
// How: Transforms IR and calls the AI21 Studio API (OpenAI-compatible) for this capability.

// AI21 Labs Executor - OpenAI-Compatible Studio API
// Documentation: https://docs.ai21.com/docs/studio-api
// Models: Jamba 1.5 Large (256K context), Jamba 1.5 Mini (256K), Jamba 1.6 Mini (256K)

import type { IRChatRequest } from "@core/ir";
import type { ExecutorExecuteArgs, ExecutorResult } from "@executors/types";
import { executeOpenAICompat } from "@executors/_shared/text-generate/openai-compat";
import { buildTextExecutor, cherryPickIRParams } from "@executors/_shared/text-generate/shared";
import type { ProviderExecutor } from "../../types";

export function preprocess(ir: IRChatRequest, args: ExecutorExecuteArgs): IRChatRequest {
	return cherryPickIRParams(ir, args.capabilityParams);
}

export async function execute(args: ExecutorExecuteArgs): Promise<ExecutorResult> {
	return executeOpenAICompat(args);
}

export function postprocess(ir: any): any {
	return ir;
}

export function transformStream(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
	return stream;
}

export const executor: ProviderExecutor = buildTextExecutor({
	preprocess,
	execute,
	postprocess,
	transformStream,
});
