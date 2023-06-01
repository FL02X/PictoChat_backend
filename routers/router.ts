import express from "express";
const router = express.Router();
import { login, register, getAllMessages } from "../controllers/UserController";

//I couldn't get the .env variables to work...

router.get("/login", login);

router.post("/register", register);

router.get("/getAllMessages", getAllMessages);

export { router };
