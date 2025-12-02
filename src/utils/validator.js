// src/utils/validator.js
const Joi = require('joi');
const momentTz = require('moment-timezone');

const allowedLanguages = ['en', 'fr', 'es', 'de', 'it', 'pt', 'nl']; // extend as needed
const allowedAppearances = ['light', 'dark', 'system'];

// Here i define validation schemas for user input on Signup
const signupSchema = Joi.object({
  fullname: Joi.string().min(2).required().messages({
    'string.empty': 'FullName is required',
    'string.min': 'FullName must be at least 2 characters long',
  }),
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address',
  }),
  password: Joi.string().min(8).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters long',
  }),
});

// Here i define validation schemas for user input on Signin
const signinSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address',
  }),
  password: Joi.string().min(8).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters long',
  }),
});

//Here i define validation schemas for user input on Forgot Password
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address',
  }),
});

//Here i define validation schemas for user input on Verify OTP & Reset Password
const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address',
  }),
  otp: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.empty': 'OTP is required',
      'string.pattern.base': 'OTP must be a 6-digit number',
    }),
});

//Here i define validation schemas for user input on Reset Password (authenticated)
const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address',
  }),
  new_password: Joi.string().min(8).required().messages({
    'string.empty': 'New password is required',
    'string.min': 'New password must be at least 8 characters long',
  }),
});

// Here i define validate schemas for updating user profile
const updateProfileSchema = Joi.object({
  fullname: Joi.string().min(3).optional(),
  email: Joi.string().email().optional(),
}).min(1); // At least one field must be provided

const assignRoleSchema = Joi.object({
  userId: Joi.string().required().messages({
    'string.empty': 'User ID is required',
    'any.required': 'User ID is required',
  }),
  role: Joi.string().valid('USER', 'ADMIN').required().messages({
    'string.empty': 'Role is required',
    'any.required': 'Role is required',
    'any.only': 'Role must be one of: USER, ADMIN',
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(8).max(72).required().messages({
    'string.empty': 'Current password is required',
    'string.max': 'Current password must not exceed 72 characters',
  }),
  newPassword: Joi.string().min(8).max(72).required().messages({
    'string.empty': 'New password is required',
    'string.min': 'New password must be at least 8 characters long',
    'string.max': 'New password must not exceed 72 characters',
  }),
});

const preferencesUpdateSchema = Joi.object({
  visibility: Joi.boolean(),
  notification: Joi.boolean(),
  newsletter: Joi.boolean(),
  appearance: Joi.string()
    .valid(...allowedAppearances)
    .messages({
      'any.only': `appearance must be one of: ${allowedAppearances.join(', ')}`,
    }),
  language: Joi.string()
    .length(2)
    .lowercase()
    .valid(...allowedLanguages)
    .messages({
      'any.only': `language must be a valid ISO 639-1 code (${allowedLanguages.join(', ')})`,
    }),
  timezone: Joi.string()
    .custom((value, helpers) => {
      if (!momentTz.tz.zone(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'timezone must be a valid IANA timezone (e.g., UTC, Africa/Douala)',
    }),
})
  .min(1)
  .messages({
    'object.min': 'At least one preference field must be provided',
  });

// Pagination query parameters schema
const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  pageSize: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'pageSize must be a number',
    'number.integer': 'pageSize must be an integer',
    'number.min': 'pageSize must be at least 1',
    'number.max': 'pageSize must not exceed 100',
  }),
});

// Skill validation schemas
const createSkillSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Skill name is required',
    'string.min': 'Skill name must be at least 2 characters long',
    'string.max': 'Skill name must not exceed 100 characters',
    'any.required': 'Skill name is required',
  }),
  description: Joi.string().max(500).allow('', null).optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
});

const updateSkillSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    'string.min': 'Skill name must be at least 2 characters long',
    'string.max': 'Skill name must not exceed 100 characters',
  }),
  description: Joi.string().max(500).allow('', null).optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided',
  });

// Add skill to user schema
const addSkillToUserSchema = Joi.object({
  skillId: Joi.string().uuid().required().messages({
    'string.empty': 'Skill ID is required',
    'string.guid': 'Skill ID must be a valid UUID',
    'any.required': 'Skill ID is required',
  }),
});

module.exports = {
  signupSchema,
  signinSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  updateProfileSchema,
  assignRoleSchema,
  changePasswordSchema,
  preferencesUpdateSchema,
  paginationQuerySchema,
  createSkillSchema,
  updateSkillSchema,
  addSkillToUserSchema,
};
