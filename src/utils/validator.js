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
  fullname: Joi.string().min(3).optional().messages({
    'string.empty': 'Fullname cannot be empty',
    'string.min': 'Fullname must be at least 3 characters long',
  }),
  email: Joi.string().email().optional().messages({
    'string.email': 'Email must be a valid email address',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided',
  });

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
    'string.uuid': 'Skill ID must be a valid UUID',
    'any.required': 'Skill ID is required',
  }),
});

// Batch create skills schema
const batchCreateSkillsSchema = Joi.object({
  skills: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().min(2).max(100).required().messages({
          'string.empty': 'Skill name is required',
          'string.min': 'Skill name must be at least 2 characters long',
          'string.max': 'Skill name must not exceed 100 characters',
          'any.required': 'Skill name is required',
        }),
        description: Joi.string().max(500).allow('', null).optional().messages({
          'string.max': 'Description must not exceed 500 characters',
        }),
      })
    )
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one skill must be provided',
      'array.max': 'Maximum 50 skills can be created at once',
      'any.required': 'Skills array is required',
    }),
});

// Blog validation schemas
const createBlogSchema = Joi.object({
  title: Joi.string().min(1).max(255).trim().required().messages({
    'string.empty': 'Title is required',
    'string.min': 'Title cannot be empty',
    'string.max': 'Title must not exceed 255 characters',
    'any.required': 'Title is required',
  }),
  description: Joi.string().min(1).max(1000).trim().required().messages({
    'string.empty': 'Description is required',
    'string.min': 'Description cannot be empty',
    'string.max': 'Description must not exceed 1000 characters',
    'any.required': 'Description is required',
  }),
  coverImage: Joi.string().trim().allow('', null).optional().messages({
    'string.base': 'Cover image must be a string',
  }),
  topic: Joi.string().max(100).trim().allow('', null).optional().messages({
    'string.max': 'Topic must not exceed 100 characters',
  }),
  featured: Joi.boolean().default(false).optional().messages({
    'boolean.base': 'Featured must be a boolean',
  }),
});

const updateBlogSchema = Joi.object({
  title: Joi.string().min(1).max(255).trim().optional().messages({
    'string.empty': 'Title cannot be empty',
    'string.min': 'Title cannot be empty',
    'string.max': 'Title must not exceed 255 characters',
  }),
  description: Joi.string().min(1).max(1000).trim().optional().messages({
    'string.empty': 'Description cannot be empty',
    'string.min': 'Description cannot be empty',
    'string.max': 'Description must not exceed 1000 characters',
  }),
  coverImage: Joi.string().trim().allow('', null).optional().messages({
    'string.base': 'Cover image must be a string',
  }),
  topic: Joi.string().max(100).trim().allow('', null).optional().messages({
    'string.max': 'Topic must not exceed 100 characters',
  }),
  featured: Joi.boolean().optional().messages({
    'boolean.base': 'Featured must be a boolean',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided',
  });

const blogQuerySchema = Joi.object({
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
  featured: Joi.boolean().optional().messages({
    'boolean.base': 'Featured must be a boolean',
  }),
  topic: Joi.string().trim().optional().messages({
    'string.base': 'Topic must be a string',
  }),
  createdBy: Joi.string().uuid().optional().messages({
    'string.uuid': 'createdBy must be a valid UUID',
  }),
});

const blogIdParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.empty': 'Blog ID is required',
    'string.uuid': 'Blog ID must be a valid UUID',
    'any.required': 'Blog ID is required',
  }),
});

const { LEARNING_LEVEL_VALUES } = require('../constants/learningConstants');

const techSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.base': 'Tech name must be a string',
    'string.empty': 'Tech name cannot be empty',
    'string.min': 'Tech name must be at least 1 character',
    'string.max': 'Tech name cannot exceed 255 characters',
    'any.required': 'Tech name is required',
  }),
  icon: Joi.string().uri().allow('', null).max(500).optional().messages({
    'string.max': 'Icon path cannot exceed 500 characters',
  }),
  description: Joi.string().max(2000).allow('', null).optional().messages({
    'string.max': 'Description cannot exceed 2000 characters',
  }),
});

const createTechSchema = techSchema;
const updateTechSchema = techSchema;

// Add search query schema
const techSearchQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow('').optional(),
});

const batchCreateTechsSchema = Joi.array()
  .items(
    Joi.object({
      name: Joi.string().min(1).max(255).required().messages({
        'string.base': 'Tech name must be a string',
        'string.empty': 'Tech name cannot be empty',
        'string.min': 'Tech name must be at least 1 character',
        'string.max': 'Tech name cannot exceed 255 characters',
        'any.required': 'Tech name is required',
      }),
      icon: Joi.string().uri().allow('', null).max(500).optional().messages({
        'string.max': 'Icon path cannot exceed 500 characters',
      }),
      description: Joi.string().max(2000).allow('', null).optional().messages({
        'string.max': 'Description cannot exceed 2000 characters',
      }),
    })
  )
  .min(1)
  .max(100) // Limit batch size to prevent abuse
  .required()
  .messages({
    'array.base': 'Techs data must be an array',
    'array.min': 'At least one tech is required',
    'array.max': 'Cannot create more than 100 techs at once',
    'any.required': 'Techs data is required',
  });

// Create Project Schema
const createProjectSchema = Joi.object({
  title: Joi.string().min(1).max(255).trim().required().messages({
    'string.empty': 'Title is required',
    'string.min': 'Title cannot be empty',
    'string.max': 'Title must not exceed 255 characters',
    'any.required': 'Title is required',
  }),
  description: Joi.string().max(5000).trim().allow('', null).optional().messages({
    'string.max': 'Description must not exceed 5000 characters',
  }),
  repoLink: Joi.string().uri().trim().allow('', null).optional().messages({
    'string.uri': 'Repository link must be a valid URL',
  }),
  featured: Joi.boolean().default(false).optional().messages({
    'boolean.base': 'Featured must be a boolean',
  }),
  techs: Joi.array().items(Joi.string().uuid()).optional().messages({
    'array.base': 'Techs must be an array',
  }),
  contributors: Joi.array().items(Joi.string().uuid()).optional().messages({
    'array.base': 'Contributors must be an array',
  }),
}).unknown(false); // Don't allow unknown fields

// Update Project Schema
const updateProjectSchema = Joi.object({
  title: Joi.string().min(1).max(255).trim().optional().messages({
    'string.empty': 'Title cannot be empty',
    'string.min': 'Title cannot be empty',
    'string.max': 'Title must not exceed 255 characters',
  }),
  description: Joi.string().max(5000).trim().allow('', null).optional().messages({
    'string.max': 'Description must not exceed 5000 characters',
  }),
  repoLink: Joi.string().uri().trim().allow('', null).optional().messages({
    'string.uri': 'Repository link must be a valid URL',
  }),
  featured: Joi.boolean().optional().messages({
    'boolean.base': 'Featured must be a boolean',
  }),
  techs: Joi.array().items(Joi.string().uuid()).optional().messages({
    'array.base': 'Techs must be an array',
  }),
  contributors: Joi.array().items(Joi.string().uuid()).optional().messages({
    'array.base': 'Contributors must be an array',
  }),
});

// Query Schema for GET /projects
const projectQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.min': 'Page must be at least 1',
  }),
  pageSize: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Page size must be a number',
    'number.min': 'Page size must be at least 1',
    'number.max': 'Page size cannot exceed 100',
  }),
  createdBy: Joi.string().uuid().optional().messages({
    'string.guid': 'createdBy must be a valid UUID',
  }),
  featured: Joi.boolean().optional().messages({
    'boolean.base': 'Featured must be a boolean',
  }),
  search: Joi.string().trim().optional().messages({
    'string.base': 'Search query must be a string',
  }),
}).unknown(true);

// Project ID Param Schema
const projectIdParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'any.required': 'Project ID is required',
  }),
});

// Management Endpoints Schemas
const manageTechsSchema = Joi.object({
  techIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'array.base': 'techIds must be an array',
    'array.min': 'At least one tech ID is required',
    'any.required': 'techIds is required',
  }),
});

const manageContributorsSchema = Joi.object({
  userIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'array.base': 'userIds must be an array',
    'array.min': 'At least one user ID is required',
    'any.required': 'userIds is required',
  }),
});

const createLearningSchema = Joi.object({
  name: Joi.string().min(2).max(255).trim().required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must not exceed 255 characters',
  }),
  description: Joi.string().min(10).trim().required().messages({
    'string.empty': 'Description is required',
    'string.min': 'Description must be at least 10 characters long',
  }),
  contentUrl: Joi.string().uri().trim().allow('', null).optional().messages({
    'string.uri': 'Content URL must be a valid URL',
  }),
  techs: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one tech is required',
      'array.base': 'Techs must be an array',
      'string.uuid': 'Each tech must be a valid UUID',
    }),
  duration: Joi.number().integer().min(1).optional().messages({
    'number.base': 'Duration must be a number',
    'number.integer': 'Duration must be an integer',
    'number.min': 'Duration must be at least 1 minute',
  }),
  level: Joi.string()
    .valid(...LEARNING_LEVEL_VALUES)
    .required()
    .messages({
      'any.only': `Level must be one of: ${LEARNING_LEVEL_VALUES.join(', ')}`,
    }),
});

const updateLearningSchema = Joi.object({
  name: Joi.string().min(2).max(255).trim().optional(),
  description: Joi.string().min(10).trim().optional(),
  contentUrl: Joi.string().uri().trim().allow('', null).optional(),
  techs: Joi.array().items(Joi.string().uuid()).min(1).optional(),
  duration: Joi.number().integer().min(1).optional(),
  level: Joi.string()
    .valid(...LEARNING_LEVEL_VALUES)
    .optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided',
  });

const learningQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
  level: Joi.string()
    .valid(...LEARNING_LEVEL_VALUES)
    .optional(),
  userId: Joi.string().uuid().optional(),
});

const learningIdParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.empty': 'Learning ID is required',
    'string.uuid': 'Learning ID must be a valid UUID',
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
  batchCreateSkillsSchema,
  createBlogSchema,
  updateBlogSchema,
  blogQuerySchema,
  blogIdParamSchema,
  createTechSchema,
  updateTechSchema,
  techSearchQuerySchema,
  batchCreateTechsSchema,
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
  projectIdParamSchema,
  manageTechsSchema,
  manageContributorsSchema,
  createLearningSchema,
  updateLearningSchema,
  learningQuerySchema,
  learningIdParamSchema,
};
