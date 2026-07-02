import * as path from 'path';

/** SSM Parameter Store namespace — all config lives under this prefix. */
export const SSM_PREFIX = '/enduro-challenge';

/** Monorepo root — CDK runs from infra/ (one up), tests run from repo root (same). */
export const PROJECT_ROOT = path.basename(process.cwd()) === 'infra'
  ? path.resolve(process.cwd(), '..')
  : process.cwd();
