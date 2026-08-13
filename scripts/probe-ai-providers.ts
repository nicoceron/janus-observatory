import { existsSync } from 'node:fs';
import process from 'node:process';

import {
  DeepSeekResponsesClient,
  ProviderError,
  VoyageEmbeddingClient,
  readDeepSeekConfig,
  readVoyageConfig,
} from '@janus/agent';

const localEnvironmentPath = 'apps/web/.env.local';
if (existsSync(localEnvironmentPath)) {
  process.loadEnvFile(localEnvironmentPath);
}

async function probe() {
  if (!process.env.DEEPSEEK_API_KEY || !process.env.VOYAGE_API_KEY) {
    throw new ProviderError({
      message:
        'Missing provider credentials. Add replacement keys to apps/web/.env.local before running the live probe.',
      code: 'AI_PROVIDER_NOT_CONFIGURED',
      retryable: false,
    });
  }

  const deepSeek = new DeepSeekResponsesClient(readDeepSeekConfig(process.env));
  const voyage = new VoyageEmbeddingClient(readVoyageConfig(process.env));

  const models = await deepSeek.listModels();
  const configuredModel = process.env.JANUS_LLM_MODEL ?? 'deepseek-v4-flash';
  if (!models.includes(configuredModel)) {
    throw new ProviderError({
      message: `Configured DeepSeek model ${configuredModel} is not available to this account.`,
      code: 'DEEPSEEK_MODEL_UNAVAILABLE',
      retryable: false,
    });
  }

  const generation = await deepSeek.createText({
    instructions: 'Return only the exact text JANUS_OK. Do not add punctuation.',
    input: 'Run the Janus Observatory provider canary.',
    // V4 defaults to thinking mode. Leave enough budget for reasoning plus the public token.
    maxOutputTokens: 256,
  });
  if (!/\bJANUS_OK\b/.test(generation.text)) {
    throw new ProviderError({
      message: 'DeepSeek canary returned an unexpected public output.',
      code: 'DEEPSEEK_CANARY_MISMATCH',
      retryable: true,
    });
  }

  const embedding = await voyage.embed(['Project Janus provider canary'], 'query');

  process.stdout.write(
    `${JSON.stringify(
      {
        deepSeek: {
          available: true,
          model: generation.telemetry.model,
          status: generation.telemetry.status,
          inputTokens: generation.telemetry.inputTokens,
          outputTokens: generation.telemetry.outputTokens,
        },
        voyage: {
          available: true,
          model: embedding.model,
          dimensions: embedding.dimensions,
          vectors: embedding.embeddings.length,
        },
      },
      null,
      2,
    )}\n`,
  );
}

try {
  await probe();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown provider probe error.';
  process.stderr.write(`AI provider probe failed safely: ${message}\n`);
  process.exitCode = 1;
}
