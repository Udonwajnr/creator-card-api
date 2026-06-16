/* eslint-disable camelcase */
const { throwAppError } = require('@app-core/errors');
const creatorCardRepository = require('@app/repository/creator-card');
const MESSAGES = require('@app/messages/creator-card');
const { serializeCard } = require('./create');

async function getCreatorCard({ slug, access_code }) {
  // Rule 1: Not found or deleted
  const card = await creatorCardRepository.findOne({ query: { slug } });

  if (!card || card.deleted !== null) {
    throwAppError(MESSAGES.NOT_FOUND, 'NF01');
  }

  // Rule 2: Draft
  if (card.status === 'draft') {
    throwAppError(MESSAGES.NOT_FOUND, 'NF02');
  }

  // Rule 3 & 4: Private card access
  if (card.access_type === 'private') {
    if (!access_code) {
      throwAppError(MESSAGES.CARD_IS_PRIVATE, 'AC03');
    }
    if (access_code !== card.access_code) {
      throwAppError(MESSAGES.INVALID_ACCESS_CODE, 'AC04');
    }
  }

  // access_code never returned on retrieval
  return serializeCard(card, false);
}

module.exports = getCreatorCard;
