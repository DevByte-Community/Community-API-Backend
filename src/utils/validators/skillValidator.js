const Joi = require('joi');

// Id validation
const validateSkillId = Joi.object({
  id: Joi.string().uuid().required().messages({
    'any.required': 'The skill ID is required for updating.',
    'string.uuid': 'The skill ID must be a valid UUID format.',
  }),
});

// Validation schema for admin to create a new skill
const createSkillSchema = Joi.object({
  name: Joi.string().min(2).required().trim().empty('').messages({
    'string.empty': 'Name cannot be empty.',
    'string.min': 'Name must be at least 2 character long.',
  }),
  description: Joi.string().trim().allow('').optional(),
});

// Validation schema for admin to update an existing skill
const updateSkillSchema = Joi.object({
  name: Joi.string().min(2).trim().empty('').optional().messages({
    'string.empty': 'Name cannot be empty if provided.',
    'string.min': 'Name must be at least 2 characters long.',
  }),
  description: Joi.string().trim().allow('').optional(),
})
  .min(1)
  .messages({
    'object.min': 'The request body must contain at least one valid field (name or description).',
  }); // Ensures at least one field is present

module.exports = { validateSkillId, createSkillSchema, updateSkillSchema };
