import { createOpenAI } from '@xsai-ext/providers/create'
import { listModels } from '@xsai/model'
import { z } from 'zod'

import { ProviderValidationCheck } from '../../../types'
import { createOpenAICompatibleValidators } from '../../../validators'
import { defineProvider } from '../../registry'

/** Default endpoint for provider configuration and direct model discovery. */
const DEMONROUTE_DEFAULT_BASE_URL = 'https://api.demonroute.com/v1/'

const demonRouteConfigSchema = z.object({
  apiKey: z
    .string('API Key'),
  baseUrl: z
    .string('Base URL')
    .optional()
    .default(DEMONROUTE_DEFAULT_BASE_URL),
})

type DemonRouteConfig = z.input<typeof demonRouteConfigSchema>

export const providerDemonRoute = defineProvider<DemonRouteConfig, 'demonroute'>({
  id: 'demonroute',
  name: 'DemonRoute',
  nameLocalize: ({ t }) => t('settings.pages.providers.provider.demonroute.title'),
  description: 'demonroute.com',
  descriptionLocalize: ({ t }) => t('settings.pages.providers.provider.demonroute.description'),
  tasks: ['chat'],
  icon: 'i-lobe-icons:openai',

  createProviderConfig: ({ t }) => demonRouteConfigSchema.extend({
    apiKey: demonRouteConfigSchema.shape.apiKey.meta({
      labelLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.api-key.label'),
      descriptionLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.api-key.description'),
      placeholderLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.api-key.placeholder'),
      type: 'password',
    }),
    baseUrl: demonRouteConfigSchema.shape.baseUrl.meta({
      labelLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.base-url.label'),
      descriptionLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.base-url.description'),
      placeholderLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.base-url.placeholder'),
    }),
  }),
  createProvider(config) {
    return createOpenAI(config.apiKey, config.baseUrl)
  },

  extraMethods: {
    async listModels(config) {
      const models = await listModels({ apiKey: config.apiKey, baseURL: config.baseUrl ?? DEMONROUTE_DEFAULT_BASE_URL })
      return models.map(model => ({
        id: model.id,
        name: model.id,
        provider: 'demonroute',
        description: '',
        contextLength: 0,
        deprecated: false,
      }))
    },
  },

  validationRequiredWhen(config) {
    return !!config.apiKey?.trim()
  },
  validators: {
    ...createOpenAICompatibleValidators({
      checks: [ProviderValidationCheck.Connectivity, ProviderValidationCheck.ModelList, ProviderValidationCheck.ChatCompletions],
    }),
  },
})
