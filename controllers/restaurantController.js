const restaurantService = require("../services/restaurantService");
const restaurantSchema = require("../models/restaurantModel");

const getRestaurant = async (req, res) => {
  try {
    const restaurant = await restaurantService.getRestaurantById(req.params.restaurantId);
    if (!restaurant) return res.status(404).json({ error: "Restaurante no encontrado" });

    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const createRestaurant = async (req, res) => {
  const { error } = restaurantSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details });

  try {
    const restaurantId = await restaurantService.createRestaurant(req.body, req.user.id);
    res.status(201).json({ message: "Restaurante creado", id: restaurantId });
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const updateRestaurant = async (req, res) => {
  const { error } = restaurantSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details });

  try {
    const updated = await restaurantService.updateRestaurant(req.params.restaurantId, req.body);
    if (!updated) return res.status(404).json({ error: "Restaurante no encontrado" });

    res.json({ message: "Restaurante actualizado" });
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = { getRestaurant, createRestaurant, updateRestaurant };
