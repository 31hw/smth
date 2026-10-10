import runtimeConfig from './runtime-config';

export default function getConfig() {
  if (typeof window !== 'undefined') {
    return {
      publicRuntimeConfig: runtimeConfig.publicRuntimeConfig,
      serverRuntimeConfig: { backend: {} },
    };
  }
  return runtimeConfig;
}
