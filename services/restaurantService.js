const pool = require("../config/db");

const getRestaurantById = async (restaurantId) => {
  const [rows] = await pool.query("SELECT * FROM restaurants WHERE id = ?", [restaurantId]);
  return rows[0] || null;
};

const createRestaurant = async (data, ownerId) => {
  const { name, colors, logo, sections, plan_id } = data;
  const [result] = await pool.query(
    "INSERT INTO restaurants (name, colors, logo_url, sections, plan_id, owner_id) VALUES (?, ?, ?, ?, ?, ?)",
    [name, JSON.stringify(colors), logo || null, JSON.stringify(sections), plan_id || null, ownerId]
  );
  return result.insertId;
};

const updateRestaurant = async (restaurantId, data) => {
  const { name, colors, logo, sections, plan_id } = data;
  const [result] = await pool.query(
    "UPDATE restaurants SET name = ?, colors = ?, logo_url = ?, sections = ?, plan_id = ? WHERE id = ?",
    [name, JSON.stringify(colors), logo || null, JSON.stringify(sections), plan_id || null, restaurantId]
  );
  return result.affectedRows;
};

module.exports = { getRestaurantById, createRestaurant, updateRestaurant };
