import "server-only";

/**
 * Minimal Azure OpenAI chat-completions client.
 *
 * Deliberately hand-rolled rather than pulling in an SDK: we make exactly one
 * kind of call (a structured-output completion, optionally with one image) and
 * the wire format for that is small and stable.
 */

export class AiConfigError extends Error {}
export class AiRequestError extends Error {}

type AzureConfig = {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
};

/** Screening is an optional feature; the UI degrades when this returns false. */
export function isScreeningConfigured(): boolean {
  return Boolean(
    process.env.AZURE_OPENAI_API_KEY &&
      process.env.AZURE_OPENAI_ENDPOINT &&
      process.env.AZURE_OPENAI_DEPLOYMENT,
  );
}

function readConfig(): AzureConfig {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

  if (!endpoint || !apiKey || !deployment) {
    throw new AiConfigError(
      "AI screening is not configured. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY and AZURE_OPENAI_DEPLOYMENT.",
    );
  }

  return {
    endpoint: endpoint.replace(/\/+$/, ""),
    apiKey,
    deployment,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
  };
}

export type ImageInput = { mimeType: string; base64: string };

export type CompletionResult = {
  content: string;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail: "high" } };

/**
 * Sends one completion constrained to `jsonSchema` and returns the raw JSON
 * string. Temperature is pinned to 0 so re-screening the same resume against
 * the same job produces a stable score.
 */
export async function completeJson({
  systemPrompt,
  userPrompt,
  image,
  jsonSchema,
  schemaName,
  maxTokens = 1200,
  signal,
}: {
  systemPrompt: string;
  userPrompt: string;
  image?: ImageInput;
  jsonSchema: Record<string, unknown>;
  schemaName: string;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<CompletionResult> {
  const config = readConfig();
  const url = `${config.endpoint}/openai/deployments/${encodeURIComponent(
    config.deployment,
  )}/chat/completions?api-version=${encodeURIComponent(config.apiVersion)}`;

  const userContent: ChatContentPart[] = [{ type: "text", text: userPrompt }];
  if (image) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:${image.mimeType};base64,${image.base64}`,
        detail: "high",
      },
    });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": config.apiKey },
      signal,
      body: JSON.stringify({
        temperature: 0,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, strict: true, schema: jsonSchema },
        },
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new AiRequestError(
      `Could not reach Azure OpenAI: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  if (!response.ok) {
    // Azure echoes the prompt back in some error payloads, so only the status
    // and a short excerpt are surfaced — the full body may contain resume text.
    const body = await response.text().catch(() => "");
    throw new AiRequestError(
      `Azure OpenAI returned ${response.status}: ${body.slice(0, 300)}`,
    );
  }

  const payload = (await response.json()) as {
    model?: string;
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const choice = payload.choices?.[0];
  const content = choice?.message?.content;

  if (choice?.finish_reason === "length") {
    throw new AiRequestError(
      "The model response was cut off before it produced complete JSON.",
    );
  }
  if (!content) {
    throw new AiRequestError("Azure OpenAI returned an empty response.");
  }

  return {
    content,
    modelName: payload.model ?? config.deployment,
    inputTokens: payload.usage?.prompt_tokens ?? null,
    outputTokens: payload.usage?.completion_tokens ?? null,
  };
}
