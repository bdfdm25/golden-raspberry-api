import { join } from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';
import { Ajv } from 'ajv';

export const OPENAPI_PATH = join(process.cwd(), 'openapi.yaml');

interface ResponseDefinition {
  content?: Record<string, { schema: object }>;
}

interface OperationDefinition {
  responses: Record<string, ResponseDefinition>;
}

export interface OpenApiDocument {
  paths: Record<string, Record<string, OperationDefinition>>;
}

/**
 * Parses, validates and dereferences the specification. Throws when the document
 * itself is not a valid OpenAPI 3 file.
 */
export async function loadOpenApiDocument(): Promise<OpenApiDocument> {
  return (await SwaggerParser.validate(OPENAPI_PATH)) as unknown as OpenApiDocument;
}

export type ResponseValidator = (path: string, status: number, body: unknown) => void;

export function createResponseValidator(document: OpenApiDocument): ResponseValidator {
  const ajv = new Ajv({ strict: false, allErrors: true });

  return (path, status, body) => {
    const schema = findResponseSchema(document, path, status);
    const validate = ajv.compile(schema);

    if (!validate(body)) {
      const errors = (validate.errors ?? [])
        .map((error) => `${error.instancePath || '/'} ${error.message ?? ''}`)
        .join('; ');
      throw new Error(`GET ${path} ${String(status)} does not match openapi.yaml: ${errors}`);
    }
  };
}

function findResponseSchema(document: OpenApiDocument, path: string, status: number): object {
  const schema =
    document.paths[path]?.get?.responses[String(status)]?.content?.['application/json']?.schema;

  if (schema === undefined) {
    throw new Error(`openapi.yaml does not document GET ${path} with status ${String(status)}`);
  }

  return schema;
}
