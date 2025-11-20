// src/utils/validator.js
const Joi = require('joi');

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

// Here i define validation schemas for tech creation
const createTechSchema = Joi.object({
  name: Joi.string().min(2).required().messages({
    'string.empty': 'Tech name is required',
  }),
  icon: Joi.string().uri().optional().messages({
    'string.uri': 'Icon must be a valid URI',
  }),
  description: Joi.string().optional(),
});

module.exports = {
  signupSchema,
  signinSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  updateProfileSchema,
  assignRoleSchema,
  createTechSchema,
};
