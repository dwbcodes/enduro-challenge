import * as path from 'path';

/** SSM Parameter Store namespace — all config lives under this prefix. */
export const SSM_PREFIX = '/enduro-challenge';

/** Monorepo root — CDK always runs from infra/, so project root is one level up. */
export const PROJECT_ROOT = path.resolve(process.cwd(), '..');
