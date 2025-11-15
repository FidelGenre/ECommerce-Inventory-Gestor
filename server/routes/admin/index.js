const express = require("express");
const { authRequired, roleRequired } = require("../../middlewares/auth");

const router = express.Router();

// seguridad para TODO admin
router.use(authRequired, roleRequired("admin"));

// sub-rutas
router.use("/beans", require("./beans"));
router.use("/inventory", require("./inventory"));
router.use("/suppliers", require("./suppliers"));
router.use("/purchases", require("./purchases"));
router.use("/users", require("./users"));
router.use("/dashboard", require("./dashboard"));

module.exports = router;
