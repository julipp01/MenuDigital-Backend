const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "delzhsy0h",
  api_key: process.env.CLOUDINARY_API_KEY || "596323794257486",
  api_secret: process.env.CLOUDINARY_API_SECRET || "w1Ti5eV3bW3COwAbXS1REaVm__k",
});

module.exports = cloudinary;
