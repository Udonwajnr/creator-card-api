const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const creatorCardRepository = require('@app/repository/creator-card');
const MESSAGES = require('@app/messages/creator-card');
const { serializeCard } = require('./create');

const deleteSpec = `root {
  creator_reference string required
}`;

const parsedSpec = validator.parse(deleteSpec);

async function deleteCreatorCard({ slug, body }) {
  validator.validate(body, parsedSpec);

  const card = await creatorCardRepository.findOne({ query: { slug, deleted: null } });

  if (!card) {
    throwAppError(MESSAGES.NOT_FOUND, 'NF01');
  }

  const now = Date.now();

  await creatorCardRepository.updateOne({
    query: { slug },
    updateValues: { deleted: now, updated: now },
  });

  const updatedCard = await creatorCardRepository.findOne({ query: { slug } });

  return serializeCard(updatedCard, true);
}

module.exports = deleteCreatorCard;
