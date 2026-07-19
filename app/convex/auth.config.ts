/**
 * Конфигурация auth-провайдеров деплоя Convex.
 * Формат Convex Auth: сам деплой выступает OIDC-провайдером.
 * CONVEX_SITE_URL подставляется окружением деплоя автоматически.
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
