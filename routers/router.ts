import express from "express";
const router = express.Router();
import {
  login,
  register,
  getAllMessages,
  emailVerification,
} from "../controllers/UserController";

router.get("/login", login);

/* 
  UNUSED USER AND PASSWORD AUTHENTICATION ROUTERS.
*/

/* router.post("/register", register);

router.get("/getAllMessages", getAllMessages);

router.get("/emailVerification", emailVerification); */

export { router };
