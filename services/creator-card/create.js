/* eslint-disable camelcase, no-restricted-syntax, no-use-before-define */
const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const creatorCardRepository = require('@app/repository/creator-card');
const MESSAGES = require('@app/messages/creator-card');

const createSpec = `root {
  title string required
  creator_reference string required
  status string required enum[draft,published]
  description string optional
  slug string optional
  links array optional
  service_rates object optional
  access_type string optional
  access_code string optional
}`;

const parsedSpec = validator.parse(createSpec);

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '');
}

function randomSuffix() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function createCreatorCard(serviceData) {
  validator.validate(serviceData, parsedSpec);

  const {
    title,
    description,
    slug: providedSlug,
    creator_reference,
    links,
    service_rates,
    status,
    access_type = 'public',
    access_code,
  } = serviceData;

  if (!['draft', 'published'].includes(status)) {
    throwAppError('status must be either draft or published');
  }

  // Business rule: access_code required for private
  if (access_type === 'private' && !access_code) {
    throwAppError(MESSAGES.ACCESS_CODE_REQUIRED_FOR_PRIVATE, 'AC01');
  }

  // Business rule: access_code must not be set on public cards
  if ((access_type === 'public' || !access_type) && access_code) {
    throwAppError(MESSAGES.ACCESS_CODE_NOT_ALLOWED_ON_PUBLIC, 'AC05');
  }

  // Validate access_code format
  if (access_code && !/^[a-zA-Z0-9]{6}$/.test(access_code)) {
    throwAppError('access_code must be exactly 6 alphanumeric characters', 'AC01');
  }

  // Validate links if provided
  if (links && Array.isArray(links)) {
    for (const link of links) {
      if (!link.title || link.title.length < 1 || link.title.length > 100) {
        throwAppError('Each link must have a title between 1 and 100 characters');
      }
      if (!link.url || link.url.length > 200 || !/^https?:\/\//.test(link.url)) {
        throwAppError(
          'Each link url must start with http:// or https:// and be max 200 characters'
        );
      }
    }
  }

  // Validate service_rates if provided
  if (service_rates) {
    const validCurrencies = ['NGN', 'USD', 'GBP', 'GHS'];
    if (!validCurrencies.includes(service_rates.currency)) {
      throwAppError('service_rates.currency must be one of NGN, USD, GBP, GHS');
    }
    if (
      !service_rates.rates ||
      !Array.isArray(service_rates.rates) ||
      service_rates.rates.length === 0
    ) {
      throwAppError('service_rates.rates must be a non-empty array');
    }
    for (const rate of service_rates.rates) {
      if (!rate.name || rate.name.length < 3 || rate.name.length > 100) {
        throwAppError('Each rate name must be between 3 and 100 characters');
      }
      if (rate.description && rate.description.length > 250) {
        throwAppError('Each rate description must be max 250 characters');
      }
      if (!Number.isInteger(rate.amount) || rate.amount < 1) {
        throwAppError('Each rate amount must be a positive integer');
      }
    }
  }

  // Slug handling
  let finalSlug = providedSlug;

  if (!finalSlug) {
    const baseSlug = generateSlug(title);
    const existing = await creatorCardRepository.findOne({
      query: { slug: baseSlug, deleted: null },
    });
    if (baseSlug.length < 5 || existing) {
      finalSlug = `${baseSlug}-${randomSuffix()}`;
    } else {
      finalSlug = baseSlug;
    }
  } else {
    if (finalSlug.length < 5 || finalSlug.length > 50 || !/^[a-zA-Z0-9\-_]+$/.test(finalSlug)) {
      throwAppError(
        'slug must be 5-50 characters and contain only letters, numbers, hyphens, and underscores'
      );
    }
    const existing = await creatorCardRepository.findOne({
      query: { slug: finalSlug, deleted: null },
    });
    if (existing) {
      throwAppError(MESSAGES.SLUG_TAKEN, 'SL02');
    }
  }

  const now = Date.now();

  const cardData = {
    title,
    description: description || undefined,
    slug: finalSlug,
    creator_reference,
    links: links || [],
    service_rates: service_rates || undefined,
    status,
    access_type,
    access_code: access_type === 'private' ? access_code : null,
    created: now,
    updated: now,
    deleted: null,
  };

  const created = await creatorCardRepository.create(cardData);

  return serializeCard(created, true);
}

function serializeCard(card, includeAccessCode = false) {
  const doc = card.toObject ? card.toObject() : card;
  const result = {
    id: doc._id,
    title: doc.title,
    description: doc.description || null,
    slug: doc.slug,
    creator_reference: doc.creator_reference,
    links: doc.links || [],
    service_rates: doc.service_rates || null,
    status: doc.status,
    access_type: doc.access_type,
    created: doc.created,
    updated: doc.updated,
    deleted: doc.deleted ?? null,
  };

  if (includeAccessCode) {
    result.access_code = doc.access_code ?? null;
  }

  return result;
}

module.exports = createCreatorCard;
module.exports.serializeCard = serializeCard;
