import type { Transformer, TransformOptions } from '../../@types/transformer';
import type { TemplateNode } from '@astrojs/parser';
import { EndOfHead } from './util/end-of-head.js';

/** If there are hydrated components, inject styles for [data-astro-root] and [data-astro-children] */
export default function (opts: TransformOptions): Transformer {
  let hasComponents = false;
  let isHmrEnabled = typeof opts.compileOptions.hmrPort !== 'undefined';
  const eoh = new EndOfHead();

  return {
    visitors: {
      html: {
        Fragment: {
          enter(node) {
            eoh.enter(node);
          },
          leave(node) {
            eoh.leave(node);
          }
        },
        InlineComponent: {
          enter(node) {
            const [_name, kind] = node.name.split(':');
            if (kind && !hasComponents) {
              hasComponents = true;
            }
          },
        },
        Element: {
          enter(node) {
            eoh.enter(node);
          },
          leave(node) {
            eoh.leave(node);
          }
        },
      },
    },
    async finalize() {
      const children = [];
      if (hasComponents) {
        children.push({
          type: 'Element',
          name: 'style',
          attributes: [{ name: 'type', type: 'Attribute', value: [{ type: 'Text', raw: 'text/css', data: 'text/css' }] }],
          start: 0,
          end: 0,
          children: [
            {
              start: 0,
              end: 0,
              type: 'Text',
              data: 'astro-root, astro-fragment { display: contents; }',
              raw: 'astro-root, astro-fragment { display: contents; }',
            },
          ],
        });
      }

      if (isHmrEnabled && hasComponents) {
        const { hmrPort } = opts.compileOptions;
        children.push(
          {
            type: 'Element',
            name: 'script',
            attributes: [],
            children: [{ type: 'Text', data: `window.HMR_WEBSOCKET_URL = window.HMR_WEBSOCKET_URL || 'ws://localhost:${hmrPort}';`, start: 0, end: 0 }],
            start: 0,
            end: 0,
          },
          {
            type: 'Element',
            name: 'script',
            attributes: [
              { type: 'Attribute', name: 'type', value: [{ type: 'Text', data: 'module', start: 0, end: 0 }], start: 0, end: 0 },
              { type: 'Attribute', name: 'src', value: [{ type: 'Text', data: '/_snowpack/hmr-client.js', start: 0, end: 0 }], start: 0, end: 0 },
            ],
            children: [],
            start: 0,
            end: 0,
          }
        );
      }

      debugger;
      eoh.append(...children);

      /*
      head.children = head.children ?? [];
      head.children.push(...children);
      */
    },
  };
}
