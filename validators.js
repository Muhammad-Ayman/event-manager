const Joi = require('joi');

const settingsSchema = Joi.object({
    name: Joi.string().trim().min(1).required().messages({
        'string.empty': 'Site name is required.',
        'any.required': 'Site name is required.'
    }),
    description: Joi.string().trim().min(1).required().messages({
        'string.empty': 'Site description is required.',
        'any.required': 'Site description is required.'
    })
});

const eventSchema = Joi.object({
    title: Joi.string().trim().min(1).required().messages({
        'string.empty': 'Event title is required.',
        'any.required': 'Event title is required.'
    }),
    description: Joi.string().allow('').optional(),
    event_date: Joi.string().trim().min(1).required().messages({
        'string.empty': 'Event date is required.',
        'any.required': 'Event date is required.'
    }),
    full_price_tickets: Joi.number().integer().min(0).required().messages({
        'number.min': 'Full-price ticket count must be a non-negative number.',
        'number.base': 'Full-price ticket count must be a non-negative number.'
    }),
    full_price_cost: Joi.number().min(0).required().messages({
        'number.min': 'Full-price ticket price must be a non-negative number.',
        'number.base': 'Full-price ticket price must be a non-negative number.'
    }),
    concession_tickets: Joi.number().integer().min(0).required().messages({
        'number.min': 'Concession ticket count must be a non-negative number.',
        'number.base': 'Concession ticket count must be a non-negative number.'
    }),
    concession_cost: Joi.number().min(0).required().messages({
        'number.min': 'Concession ticket price must be a non-negative number.',
        'number.base': 'Concession ticket price must be a non-negative number.'
    })
});

const bookingSchema = Joi.object({
    attendee_name: Joi.string().trim().min(1).required().messages({
        'string.empty': 'Please enter your name.',
        'any.required': 'Please enter your name.'
    }),
    full_price_qty: Joi.number().integer().min(0).required(),
    concession_qty: Joi.number().integer().min(0).required()
});

module.exports = { settingsSchema, eventSchema, bookingSchema };
