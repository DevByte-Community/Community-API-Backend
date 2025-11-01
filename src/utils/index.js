// src/utils/index.js
const customErrors = require('./customErrors');

class Validator {
  /**
   * Validate request body against a Joi schema
   * @param {Object} schema - Joi schema
   * @param {Object} data - req.body
   * @returns {Object} { value?, errorResponse? }
   */
  static validate(schema, data) {
    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      return {
        errorResponse: {
          success: false,
          message: 'Validation failed',
          errors: error.details.map((err) => err.message),
        },
      };
    }

    return { _value: value };
  }
}

const toList = (v, d = []) =>
  (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .concat(d);

module.exports = Validator;
module.exports.customErrors = customErrors;
module.exports.toList = toList;
