/**
 * validation.js
 * Joi validation schemas for all form inputs.
 * Centralises validation so route handlers stay clean.
 *
 * Usage:
 *   const { validateSettings, validateEvent, validateBooking } = require('./validation');
 *   const { error, value } = validateSettings(req.body);
 */

const Joi = require('joi');

/**
 * Schema for the Site Settings form.
 * Input:  { name, description }
 * Output: validated and trimmed values, or an error object
 */
const settingsSchema = Joi.object({
    name:        Joi.string().trim().min(1).max(100).required().messages({
        'string.empty': 'Site name is required.',
        'any.required': 'Site name is required.',
        'string.max':   'Site name must be 100 characters or fewer.'
    }),
    description: Joi.string().trim().min(1).max(500).required().messages({
        'string.empty': 'Site description is required.',
        'any.required': 'Site description is required.',
        'string.max':   'Description must be 500 characters or fewer.'
    })
});

/**
 * Schema for the Create / Edit Event form.
 * Input:  { title, description, event_date, full_price_tickets,
 *            full_price_cost, concession_tickets, concession_cost }
 * Output: validated and coerced values, or an error object
 */
const eventSchema = Joi.object({
    title:               Joi.string().trim().min(1).max(200).required().messages({
        'string.empty': 'Event title is required.',
        'any.required': 'Event title is required.',
        'string.max':   'Title must be 200 characters or fewer.'
    }),
    description:         Joi.string().trim().allow('').max(2000).optional().messages({
        'string.max': 'Description must be 2000 characters or fewer.'
    }),
    event_date:          Joi.string().trim().min(1).required().messages({
        'string.empty': 'Event date and time is required.',
        'any.required': 'Event date and time is required.'
    }),
    full_price_tickets:  Joi.number().integer().min(0).required().messages({
        'number.base':    'Full-price ticket count must be a number.',
        'number.integer': 'Full-price ticket count must be a whole number.',
        'number.min':     'Full-price ticket count cannot be negative.',
        'any.required':   'Full-price ticket count is required.'
    }),
    full_price_cost:     Joi.number().min(0).precision(2).required().messages({
        'number.base':  'Full-price ticket price must be a number.',
        'number.min':   'Full-price ticket price cannot be negative.',
        'any.required': 'Full-price ticket price is required.'
    }),
    concession_tickets:  Joi.number().integer().min(0).required().messages({
        'number.base':    'Concession ticket count must be a number.',
        'number.integer': 'Concession ticket count must be a whole number.',
        'number.min':     'Concession ticket count cannot be negative.',
        'any.required':   'Concession ticket count is required.'
    }),
    concession_cost:     Joi.number().min(0).precision(2).required().messages({
        'number.base':  'Concession ticket price must be a number.',
        'number.min':   'Concession ticket price cannot be negative.',
        'any.required': 'Concession ticket price is required.'
    })
});

/**
 * Schema for the Attendee Booking form.
 * Input:  { attendee_name, full_price_qty, concession_qty }
 * Output: validated values, or an error object
 */
const bookingSchema = Joi.object({
    attendee_name:   Joi.string().trim().min(1).max(100).required().messages({
        'string.empty': 'Please enter your name.',
        'any.required': 'Please enter your name.',
        'string.max':   'Name must be 100 characters or fewer.'
    }),
    full_price_qty:  Joi.number().integer().min(0).default(0).messages({
        'number.base':    'Full-price quantity must be a number.',
        'number.integer': 'Full-price quantity must be a whole number.',
        'number.min':     'Full-price quantity cannot be negative.'
    }),
    concession_qty:  Joi.number().integer().min(0).default(0).messages({
        'number.base':    'Concession quantity must be a number.',
        'number.integer': 'Concession quantity must be a whole number.',
        'number.min':     'Concession quantity cannot be negative.'
    })
});

/**
 * Validate site settings form data.
 * @param {object} data - req.body from the settings form
 * @returns {{ error, value }} - Joi validation result
 */
function validateSettings(data) {
    return settingsSchema.validate(data, { abortEarly: false });
}

/**
 * Validate event create/edit form data.
 * @param {object} data - req.body from the event form
 * @returns {{ error, value }} - Joi validation result
 */
function validateEvent(data) {
    return eventSchema.validate(data, { abortEarly: false, convert: true });
}

/**
 * Validate attendee booking form data.
 * @param {object} data - req.body from the booking form
 * @returns {{ error, value }} - Joi validation result
 */
function validateBooking(data) {
    return bookingSchema.validate(data, { abortEarly: false, convert: true });
}

module.exports = { validateSettings, validateEvent, validateBooking };
