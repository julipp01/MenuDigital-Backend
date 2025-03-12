/*
Navicat MySQL Data Transfer

Source Server         : test2
Source Server Version : 80040
Source Host           : 127.0.0.1:3306
Source Database       : saas_restaurantes

Target Server Type    : MYSQL
Target Server Version : 80040
File Encoding         : 65001

Date: 2025-03-11 20:12:32
*/

SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for categories
-- ----------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Records of categories
-- ----------------------------

-- ----------------------------
-- Table structure for menu_items
-- ----------------------------
DROP TABLE IF EXISTS `menu_items`;
CREATE TABLE `menu_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `restaurant_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `description` text,
  `category` varchar(50) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `restaurant_id` (`restaurant_id`),
  CONSTRAINT `menu_items_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Records of menu_items
-- ----------------------------
INSERT INTO `menu_items` VALUES ('1', '12', 'Salchipapas Especial', '18.00', 'Papas fritas con salchicha, queso y salsas', 'Entradas', '');
INSERT INTO `menu_items` VALUES ('2', '12', 'Anticuchos de Corazón', '25.00', 'Servidos con papas doradas y ají especial', 'Entradas', '');
INSERT INTO `menu_items` VALUES ('3', '12', 'Choclo con Queso', '15.00', 'Choclo tierno acompañado de queso serrano', 'Entradas', '');
INSERT INTO `menu_items` VALUES ('5', '12', 'Pollo a la Brasa (1/2 con papas y ensalada)', '40.00', 'fresco', 'Platos Principales', '/uploads/1741198588947-1741198509431-1741193711903-1740971924612.glb');
INSERT INTO `menu_items` VALUES ('6', '12', 'Pollo Entero + Papas + Ensalada + Gaseosa 1.5L', '78.00', 'fresco', 'Platos Principales', '/uploads/1741198759591-1741137955657-1741024236004.jpg');
INSERT INTO `menu_items` VALUES ('7', '12', 'Papas fritas adicionales', '10.00', '', 'Acompañamientos', '');
INSERT INTO `menu_items` VALUES ('8', '12', 'Ensalada fresca', '8.00', '', 'Acompañamientos', '');
INSERT INTO `menu_items` VALUES ('9', '12', 'Arroz chaufa de pollo', '18.00', '', 'Acompañamientos', '');
INSERT INTO `menu_items` VALUES ('10', '12', 'Crema Volteada', '12.00', '', 'Postres', '/uploads/1741198632936-1741198588947-1741198509431-1741193711903-1740971924612.glb');
INSERT INTO `menu_items` VALUES ('11', '12', 'Pie de Limón', '14.00', '', 'Postres', '');
INSERT INTO `menu_items` VALUES ('12', '12', 'Chicha Morada 1 vasochico', '10.00', 'fresco', 'Bebidas', '/uploads/1741198128209-1741138172883-1741137955657-1741024236004.jpg');
INSERT INTO `menu_items` VALUES ('13', '12', 'Gaseosa personal', '8.00', 'fresco', 'Bebidas', '/uploads/1741204804923-1741135947252-example.jpg');
INSERT INTO `menu_items` VALUES ('14', '12', 'Cerveza 620ml', '18.00', '', 'Bebidas', '');
INSERT INTO `menu_items` VALUES ('15', '12', 'ceviche', '34.00', 'de pescado', 'Platos Principales', '/uploads/1741193656393-1740971909757.jpg');
INSERT INTO `menu_items` VALUES ('16', '12', 'ceviche', '23.00', 'Palta, huevo, tomate y mayonesa', 'Postres', '/uploads/1741196970859-1740968295702.jpg');
INSERT INTO `menu_items` VALUES ('17', '12', 'ceviche', '23.00', 'Fresa, Mango, Plátano', 'Platos Principales', '/uploads/1741198611707-1741138172883-1741137955657-1741024236004.jpg');
INSERT INTO `menu_items` VALUES ('18', '12', 'ceviche', '25.00', 'Palta, huevo, tomate y mayonesa', 'Platos Principales', '/uploads/1741198349776-1741139886272-1740968295702.jpg');
INSERT INTO `menu_items` VALUES ('19', '12', 'Triple Clásico', '34.00', 'Tomate, mozzarella, pepperoni', 'caldos', '/uploads/1741205577169-1741139886272-1740968295702.jpg');
INSERT INTO `menu_items` VALUES ('20', '1', 'Salchipapas Especial', '18.00', 'Papas fritas con salchicha, queso y salsas', 'Entradas', '/uploads/1741223412772-big_2.jpg');
INSERT INTO `menu_items` VALUES ('21', '1', 'Anticuchos de Corazón', '25.00', 'Servidos con papas doradas y ají especial', 'Entradas', '');
INSERT INTO `menu_items` VALUES ('22', '1', 'Choclo con Queso', '15.00', 'Choclo tierno acompañado de queso serrano', 'Entradas', '');
INSERT INTO `menu_items` VALUES ('23', '1', 'Pollo a la Brasa (1/4 con papas y ensalada)', '22.00', 'fresco', 'Postres', '/uploads/1741211975478-1741135001453-dish3.jpg');
INSERT INTO `menu_items` VALUES ('24', '1', 'Pollo a la Brasa (1/2 con papas y ensalada)', '40.00', 'fresco', 'Platos Principales', '/uploads/1741209498060-1741193711903-1740971924612.glb');
INSERT INTO `menu_items` VALUES ('25', '1', 'Pollo Entero + Papas + Ensalada + Gaseosa 1.5L', '78.00', 'rico', 'Platos Principales', '/uploads/1741214090512-4_optimized_300x300.jpg');
INSERT INTO `menu_items` VALUES ('26', '1', 'Papas fritas adicionales', '10.00', '', 'Acompañamientos', '');
INSERT INTO `menu_items` VALUES ('27', '1', 'Ensalada fresca', '8.00', '', 'Acompañamientos', '');
INSERT INTO `menu_items` VALUES ('28', '1', 'Arroz chaufa de pollo', '18.00', '', 'Acompañamientos', '');
INSERT INTO `menu_items` VALUES ('29', '1', 'Crema Volteada', '12.00', 'fresco', 'Postres', '/uploads/1741212958258-1741137955657-1741024236004.jpg');
INSERT INTO `menu_items` VALUES ('30', '1', 'Pie de Limón', '14.00', 'fresco', 'Postres', '/uploads/1741223331537-big_2.jpg');
INSERT INTO `menu_items` VALUES ('31', '1', 'Chicha Morada 1 vaso', '10.00', 'ricoo', 'Bebidas', '/uploads/1741214116962-example.glb');
INSERT INTO `menu_items` VALUES ('32', '1', 'Gaseosa personal', '8.00', 'rico', 'Bebidas', '/uploads/1741214139828-1741133169978-big_2.jpg');
INSERT INTO `menu_items` VALUES ('33', '1', 'Cerveza 620ml', '18.00', 'rico', 'Bebidas', '/uploads/1741223165064-plato2.glb');
INSERT INTO `menu_items` VALUES ('34', '1', 'ceviche', '34.00', 'fresco', 'Platos Principales', '/uploads/1741207907423-1741135001453-dish3.jpg');
INSERT INTO `menu_items` VALUES ('36', '1', 'cancha', '4.00', 'sabrosa', 'raciones', '/uploads/1741209448987-1741137955657-1741024236004.jpg');
INSERT INTO `menu_items` VALUES ('37', '1', 'ceviche', '23.00', 'Pan tostado con ajo', 'platos', '/uploads/1741210715635-1741137955657-1741024236004.jpg');
INSERT INTO `menu_items` VALUES ('38', '1', 'ceviche', '23.00', 'Pan tostado con ajo', 'fondo', '/uploads/1741210856208-1741198588947-1741198509431-1741193711903-1740971924612.glb');
INSERT INTO `menu_items` VALUES ('39', '1', 'ceviche', '34.00', 'fresco', 'Platos Principales', '/uploads/1741211857095-1741198079150-1741193711903-1740971924612.glb');
INSERT INTO `menu_items` VALUES ('40', '1', 'ceviche', '23.00', 'Palta, huevo, tomate y mayonesa', 'Platos Principales', '/uploads/1741212018031-1741138172883-1741137955657-1741024236004.jpg');
INSERT INTO `menu_items` VALUES ('41', '1', 'Triple Clásico', '34.00', 'Tomate, mozzarella, pepperoni', 'Platos Principales', '/uploads/1741212900287-1741135947252-example.jpg');
INSERT INTO `menu_items` VALUES ('42', '1', 'ceviche', '23.00', 'Fresa, Mango, Plátano', 'Platos Principales', '/uploads/1741213106974-1741138172883-1741137955657-1741024236004.jpg');
INSERT INTO `menu_items` VALUES ('43', '1', 'ceviche', '89.00', 'Palta, huevo, tomate y mayonesa', 'Platos Principales', '/uploads/1741224851554-example.glb');
INSERT INTO `menu_items` VALUES ('44', '2', 'Salchipapas Especial', '18.00', 'Papas fritas con salchicha, queso y salsas', 'Entradas', '');
INSERT INTO `menu_items` VALUES ('45', '2', 'Anticuchos de Corazón', '25.00', 'Servidos con papas doradas y ají especial', 'Entradas', '');
INSERT INTO `menu_items` VALUES ('46', '2', 'Choclo con Queso', '15.00', 'Choclo tierno acompañado de queso serrano', 'Entradas', '');
INSERT INTO `menu_items` VALUES ('47', '2', 'Pollo a la Brasa (1/4 con papas y ensalada)', '22.00', '', 'Platos Principales', '');
INSERT INTO `menu_items` VALUES ('48', '2', 'Pollo a la Brasa (1/2 con papas y ensalada)', '40.00', '', 'Platos Principales', '');
INSERT INTO `menu_items` VALUES ('49', '2', 'Pollo Entero + Papas + Ensalada + Gaseosa 1.5L', '78.00', '', 'Platos Principales', '');
INSERT INTO `menu_items` VALUES ('50', '2', 'Papas fritas adicionales', '10.00', '', 'Acompañamientos', '');
INSERT INTO `menu_items` VALUES ('51', '2', 'Ensalada fresca', '8.00', '', 'Acompañamientos', '');
INSERT INTO `menu_items` VALUES ('52', '2', 'Arroz chaufa de pollo', '18.00', '', 'Acompañamientos', '');
INSERT INTO `menu_items` VALUES ('53', '2', 'Crema Volteada', '12.00', '', 'Postres', '');
INSERT INTO `menu_items` VALUES ('54', '2', 'Pie de Limón', '14.00', '', 'Postres', '');
INSERT INTO `menu_items` VALUES ('55', '2', 'Chicha Morada 1 vaso', '10.00', 'fresco', 'guarnición ', '/uploads/1741233965233-croissant_scan_low_poly (1).glb');
INSERT INTO `menu_items` VALUES ('56', '2', 'Gaseosa personal', '8.00', '', 'Bebidas', '');
INSERT INTO `menu_items` VALUES ('57', '2', 'Cerveza 620ml', '18.00', 'fresco', 'Bebidas', '/uploads/1741233853428-big_2.jpg');
INSERT INTO `menu_items` VALUES ('58', '2', 'tallarin verde', '34.00', 'verde', 'Platos Principales', '/uploads/1741276029810-brave_screenshot (1).png');
INSERT INTO `menu_items` VALUES ('59', '2', 'ceviche', '34.00', 'fresco', 'Bebidas', '/uploads/1741276066494-big_2.jpg');
INSERT INTO `menu_items` VALUES ('60', '3', 'Salchipapas Especial', '18.00', 'Papas fritas con salchicha, queso y salsas', 'Entradas', '');
INSERT INTO `menu_items` VALUES ('61', '3', 'Anticuchos de Corazón', '25.00', 'Servidos con papas doradas y ají especial', 'Entradas', '');
INSERT INTO `menu_items` VALUES ('62', '3', 'Choclo con Queso', '15.00', 'Choclo tierno acompañado de queso serrano', 'Entradas', '');
INSERT INTO `menu_items` VALUES ('63', '3', 'Pollo a la Brasa (1/4 con papas y ensalada)', '22.00', '', 'Platos Principales', '');
INSERT INTO `menu_items` VALUES ('64', '3', 'Pollo a la Brasa (1/2 con papas y ensalada)', '40.00', '', 'Platos Principales', '');
INSERT INTO `menu_items` VALUES ('65', '3', 'Pollo Entero + Papas + Ensalada + Gaseosa 1.5L', '78.00', '', 'Platos Principales', '');
INSERT INTO `menu_items` VALUES ('66', '3', 'Papas fritas adicionales', '10.00', '', 'Acompañamientos', '');
INSERT INTO `menu_items` VALUES ('67', '3', 'Ensalada fresca', '8.00', '', 'Acompañamientos', '');
INSERT INTO `menu_items` VALUES ('68', '3', 'Arroz chaufa de pollo', '18.00', '', 'Acompañamientos', '');
INSERT INTO `menu_items` VALUES ('69', '3', 'Crema Volteada', '12.00', '', 'Postres', '');
INSERT INTO `menu_items` VALUES ('70', '3', 'Pie de Limón', '14.00', '', 'Postres', '');
INSERT INTO `menu_items` VALUES ('71', '3', 'Chicha Morada 1 vaso', '10.00', '', 'Bebidas', '');
INSERT INTO `menu_items` VALUES ('72', '3', 'Gaseosa personal', '8.00', '', 'Bebidas', '');
INSERT INTO `menu_items` VALUES ('73', '3', 'Cerveza 620ml', '18.00', '', 'Bebidas', '');
INSERT INTO `menu_items` VALUES ('74', '1', 'mondongo45', '55.00', 'verde', 'Platos Principales', '/uploads/1741283950086-1741135001453-dish3.jpg');
INSERT INTO `menu_items` VALUES ('75', '1', 'torta', '34.00', 'verde', 'Postres', '/uploads/1741289670961-low_poly_paris-brest.glb');
INSERT INTO `menu_items` VALUES ('76', '3', 'Chicharrón ', '25.00', 'Rico , bueno y barato ', 'Platos Principales', '/uploads/1741298412287-IMG-20250304-WA0000.jpg');

-- ----------------------------
-- Table structure for menu_templates
-- ----------------------------
DROP TABLE IF EXISTS `menu_templates`;
CREATE TABLE `menu_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `fields` json NOT NULL,
  `default_colors` json NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Records of menu_templates
-- ----------------------------
INSERT INTO `menu_templates` VALUES ('1', 'restaurante_general', 'Restaurante General');
INSERT INTO `menu_templates` VALUES ('2', 'polleria', 'Pollería Clásica');
INSERT INTO `menu_templates` VALUES ('3', 'pizzeria', 'Pizzería Italiana');
INSERT INTO `menu_templates` VALUES ('4', 'fuente_soda', 'Fuente de Soda Retro');
INSERT INTO `menu_templates` VALUES ('5', 'cafe_bar', 'Café Bar Moderno');
INSERT INTO `menu_templates` VALUES ('6', 'jugueria', 'Juguería Natural');

-- ----------------------------
-- Table structure for restaurants
-- ----------------------------
DROP TABLE IF EXISTS `restaurants`;
CREATE TABLE `restaurants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `owner_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `template_id` int DEFAULT NULL,
  `colors` json DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `sections` json DEFAULT NULL,
  `plan_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `owner_id` (`owner_id`),
  KEY `template_id` (`template_id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `restaurants_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `restaurants_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Records of restaurants
-- ----------------------------
INSERT INTO `restaurants` VALUES ('1', 'papiriqui', null, '2025-03-05 15:48:56', '2', '{\"primary\": \"#231b10\", \"secondary\": \"#28a42c\"}', '/uploads/1741211939015-1741138172883-1741137955657-1741024236004.jpg');
INSERT INTO `restaurants` VALUES ('2', 'julio\'s miski', null, '2025-03-05 22:28:38', '2', '{\"primary\": \"#F28C38\", \"secondary\": \"#1A1A1A\"}', '/uploads/1741275612737-big_2.jpg');
INSERT INTO `restaurants` VALUES ('3', 'Julipp01\'s Restaurant', null, '2025-03-06 11:38:21', '2', '{\"primary\": \"#F28C38\", \"secondary\": \"#1A1A1A\"}', null);

-- ----------------------------
-- Table structure for subscription_plans
-- ----------------------------
DROP TABLE IF EXISTS `subscription_plans`;
CREATE TABLE `subscription_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `items_limit` int NOT NULL DEFAULT '0',
  `images_limit` int NOT NULL DEFAULT '0',
  `price` decimal(10,2) NOT NULL,
  `features` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Records of subscription_plans
-- ----------------------------

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `role` enum('free','plata','oro','premium','admin') NOT NULL DEFAULT 'free',
  `restaurant_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `users_ibfk_1` (`restaurant_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES ('13', 'julio', 'julio@hotmail.com', '$2b$10$Vhe6J2H2W5CU/TmyrJ6HiOB5rB0axR8n.KQuELQdL/RyQClehv5xq', '2025-03-05 15:48:56', 'admin', '1');
INSERT INTO `users` VALUES ('14', 'julio', 'julio@gmail.com', '$2b$10$DctxmLwzEjv/o0hXH8UipuaD8zaosA/5Ee4MH/1WsKkNKtfL5PMAm', '2025-03-05 22:28:38', 'premium', '2');
INSERT INTO `users` VALUES ('15', 'Julipp01', 'julio@dev.com', '$2b$10$HpmSbCbrLgn3Z9pbYCNrp.2UTaGzZIitqfPYwanOvk6Lv2JgWvaiu', '2025-03-06 11:38:21', 'oro', '3');
