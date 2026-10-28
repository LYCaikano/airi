import type { ChatProviderWithExtraOptions } from '@xsai-ext/providers/utils'

import type { ChatRequestOptions, ProviderInstance } from '../../../types'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { parse } from 'zod/v4/core'

import { getDefinedProvider } from '../../../index'
import { providerDemonRoute } from './index'

function isChatProvider(provider: ProviderInstance): provider is ChatProviderWithExtraOptions<string, ChatRequestOptions> {
  return 'chat' in provider && typeof provider.chat === 'function'
}

async function createTestProvider() {
  const schema = await providerDemonRoute.createProviderConfig({ t: key => key })
  const config = parse(schema, { apiKey: 'test-key' })
  const provider = await providerDemonRoute.createProvider(config)
  if (!isChatProvider(provider))
    throw new Error('DemonRoute provider must support chat')

  return { config, provider }
}

describe('demonRoute provider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is registered with the DemonRoute endpoint as default', async () => {
    const { config } = await createTestProvider()

    expect(getDefinedProvider('demonroute')).toBe(providerDemonRoute)
    expect(config.baseUrl).toBe('https://api.demonroute.com/v1/')
  })

  it('creates an authenticated OpenAI-compatible chat request', async () => {
    const { provider } = await createTestProvider()

    expect(provider.chat('dphn/Dolphin-Mistral-24B-Venice-Edition')).toMatchObject({
      apiKey: 'test-key',
      baseURL: 'https://api.demonroute.com/v1/',
      model: 'dphn/Dolphin-Mistral-24B-Venice-Edition',
    })
  })

  it('lists chat models from the DemonRoute catalog', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => Response.json({
      object: 'list',
      data: [
        { id: 'dphn/Dolphin-Mistral-24B-Venice-Edition', object: 'model', created: 0, owned_by: 'dphn' },
        { id: 'NousResearch/Hermes-4-70B', object: 'model', created: 0, owned_by: 'NousResearch' },
      ],
    }))
    vi.stubGlobal('fetch', fetchMock)
    const { config, provider } = await createTestProvider()

    const models = await providerDemonRoute.extraMethods?.listModels?.(config, provider)

    expect(models).toEqual([
      {
        id: 'dphn/Dolphin-Mistral-24B-Venice-Edition',
        name: 'dphn/Dolphin-Mistral-24B-Venice-Edition',
        provider: 'demonroute',
        description: '',
        contextLength: 0,
        deprecated: false,
      },
      {
        id: 'NousResearch/Hermes-4-70B',
        name: 'NousResearch/Hermes-4-70B',
        provider: 'demonroute',
        description: '',
        contextLength: 0,
        deprecated: false,
      },
    ])
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://api.demonroute.com/v1/models')
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('authorization')).toBe('Bearer test-key')
  })
})
