const { createHandler } = require('@app-core/server');
const { appLogger } = require('@app-core/logger');
const { create } = require('@app/services/creator-card');
const MESSAGES = require('@app/messages/creator-card');

module.exports = createHandler({
  path: '/creator-cards',
  method: 'post',
  middlewares: [],
  async onResponseEnd(rc, rs) {
    appLogger.info({ requestContext: rc, response: rs }, 'create-creator-card-completed');
  },
  async handler(rc, helpers) {
    const payload = rc.body;
    const data = await create(payload);
    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: MESSAGES.CREATED,
      data,
    };
  },
});
