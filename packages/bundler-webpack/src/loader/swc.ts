import { Config, transform, transformSync } from '@swc/core';
import type { LoaderContext } from '../../compiled/webpack';
import { Env, SwcOptions } from '../types';

function getBaseOpts({
  filename,
  targets = { chrome: '61' },
}: {
  filename: string;
  targets?: Record<string, any>;
}) {
  const isTSFile = filename.endsWith('.ts');
  const isTypeScript = isTSFile || filename.endsWith('.tsx');
  const isDev = process.env.NODE_ENV === Env.development;

  const polyfillOpts = isDev
    ? {}
    : {
        env: {
          /**
           * need `@umijs/preset-umi/src/features/polyfill/swcPolyfill` config alias and provide polyfill
           */
          mode: 'usage',
          coreJs: 3,
          targets,
        },
      };

  const swcOpts: Config = {
    module: {
      // @ts-ignore
      type: 'es6',
      ignoreDynamic: true,
    },
    ...polyfillOpts,
    jsc: {
      parser: {
        syntax: isTypeScript ? 'typescript' : 'ecmascript',
        [isTypeScript ? 'tsx' : 'jsx']: !isTSFile,
        dynamicImport: isTypeScript,
      },
      target: 'es2015',
      transform: {
        react: {
          runtime: 'automatic',
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment',
          throwIfNamespace: true,
          development: isDev,
          useBuiltins: true,
        },
      },
    },
  };
  return swcOpts;
}

function swcLoader(this: LoaderContext<SwcOptions>, contents: string) {
  // 启用异步模式
  const callback = this.async();
  const loaderOpts = this.getOptions();

  const { sync = false, parseMap = false, targets, ...otherOpts } = loaderOpts;
  const filename = this.resourcePath;

  const swcOpts = {
    ...getBaseOpts({
      filename,
      targets,
    }),
    filename,
    sourceMaps: this.sourceMap,
    sourceFileName: filename,
    ...otherOpts,
  };

  try {
    if (sync) {
      const output = transformSync(contents, swcOpts);
      callback(
        null,
        output.code,
        parseMap ? JSON.parse(output.map!) : output.map,
      );
    } else {
      transform(contents, swcOpts).then(
        (output) => {
          callback(
            null,
            output.code,
            parseMap ? JSON.parse(output.map!) : output.map,
          );
        },
        (err) => {
          callback(err);
        },
      );
    }
  } catch (e: any) {
    callback(e);
  }
}

export default swcLoader;
