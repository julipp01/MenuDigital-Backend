const Joi = require("joi");

const restaurantSchema = Joi.object({
  name: Joi.string().trim().max(255).required(),
  colors: Joi.object().pattern(Joi.string(), Joi.string()).required(),
  logo: Joi.string().uri().allow(null, ""),
  sections: Joi.object().required(),
  plan_id: Joi.number().integer().allow(null),
});

module.exports = restaurantSchema;
