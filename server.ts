import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";
import ws from "ws";
import cookieParser from "cookie-parser";
import { router } from "./routers/router";
import { Pool } from "pg";
const app = express();

app.use(express.json());
app.use("/", router);
morgan("dev");
app.use(cors());

const pool = new Pool({
  user: process.env.SQL_USER,
  host: "localhost",
  database: "postgres",
  password: process.env.SQL_PASS,
});

export const wss = new ws.Server({ port: 8081 });

wss.on("connection", (ws, req) => {
  let userName: String;
  console.log("New connection" + req.url);

  const query = "SELECT (users) FROM Users WHERE session_token = $1";
  const params = [req.url.slice(1)];
  pool.query(query, params, (err, result) => {
    if (err) {
      console.log(err.message);
      pool.end;
      return;
    }
    if (result.rowCount < 1) {
      ws.close(1003, "Token no existe o no ha sido enviado correctamente");
    }
    const name = result.rows.map((e) => e.users);
    console.log(name[0]);
    userName = name[0];
    ws.send(
      JSON.stringify({
        user: userName,
        logged: true,
      })
    );
  });

  ws.on("message", (message) => {
    let messageJSON: JSON;

    try {
      messageJSON = JSON.parse(message.toString());
    } catch (err) {
      ws.close(1003, "Invalid Input JSON");
      return;
    }

    if (!("message" in messageJSON)) {
      ws.close(1003, "Invalid Input JSON. Doesn't contain message");
      return;
    }

    const query =
      "INSERT INTO message_board_1(username, message) VALUES ($1, $2)";
    const params = [userName, messageJSON.message];
    pool.query(query, params, (err, result) => {
      if (err) {
        console.log(err.message);
        pool.end;
        return;
      }
      ws.send(
        JSON.stringify({
          userSend: params[0],
          messageSend: params[1],
        })
      );
    });
  });
});

app.get("/", (req, res) => {
  console.log("1");
  res.send("olo");
});

app.post("/", (req, res) => {
  console.log("1");
  res.send("olo");
});

app.listen(8080, () => {
  console.log("Server port open on 8080");
});
