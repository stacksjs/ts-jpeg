import type { BunpressConfig } from 'bunpress'

const config: BunpressConfig = {
  name: 'jpgx',
  description: 'TypeScript implementation of a performant JPEG encoder & decoder',
  theme: '@bunpress/theme-docs',
  srcDir: './docs',
  outDir: './dist/docs',
  sidebar: [
    {
      text: 'Getting Started',
      items: [
        { text: 'Introduction', link: '/intro' },
        { text: 'Installation', link: '/install' },
        { text: 'Usage', link: '/usage' },
        { text: 'Configuration', link: '/config' },
      ],
    },
    {
      text: 'Features',
      items: [
        { text: 'JPEG Encoding', link: '/features/jpeg-encoding' },
        { text: 'JPEG Decoding', link: '/features/jpeg-decoding' },
        { text: 'Quality Settings', link: '/features/quality-settings' },
        { text: 'Metadata Handling', link: '/features/metadata-handling' },
      ],
    },
    {
      text: 'Advanced',
      items: [
        { text: 'Configuration', link: '/advanced/configuration' },
        { text: 'Custom Profiles', link: '/advanced/custom-profiles' },
        { text: 'Performance', link: '/advanced/performance' },
        { text: 'CI/CD Integration', link: '/advanced/ci-cd-integration' },
      ],
    },
  ],
}

export default config
