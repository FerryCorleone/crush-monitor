import "dotenv/config";
import { checkProvider, providerErrorMessage } from "../server/provider";
import { ConfigurationError } from "../server/provider-config";

try {
  const result = await checkProvider();
  console.log(`连接成功 / Connected: ${result.provider} · ${result.model}`);
  console.log(
    `Tokens: ${result.usage.input_tokens} in / ${result.usage.output_tokens} out`,
  );
} catch (error) {
  console.error(
    error instanceof ConfigurationError
      ? error.message
      : providerErrorMessage(error),
  );
  process.exitCode = 1;
}
