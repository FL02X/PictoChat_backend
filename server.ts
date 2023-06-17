import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import morgan from "morgan";
import ws from "ws";
import { router } from "./routers/router";
import { Pool } from "pg";
const app = express();

app.use(express.json());
app.use("/", router);
morgan("dev");
app.use(cors());

/* const pool = new Pool({
  user: process.env.SQL_USER,
  host: "localhost",
  database: "postgres",
  password: process.env.SQL_PASS,
}); */

export const wss = new ws.Server({ port: 8081 });
let usersRoom1: String[] = [];
usersRoom1.push("admin");

wss.on("connection", (ws, req) => {
  let userIsVerified: Boolean;
  let username: any;
  //.slice removes the "/" on the url request.
  /* username = req.url.slice(1); */

  const checkUsername = () => {
    if (usersRoom1.includes(username)) {
      ws.close(1003, "El nombre de usuario ya esta usado.");
    }

    if (username.length < 10) {
      usersRoom1.push(username);
    } else {
      ws.close(1003, "El nombre de usuario es muy largo.");
    }
  };

  //https://stackoverflow.com/questions/3155528/can-i-broadcast-to-all-websocket-clients
  ws.on("message", (data) => {
    let messageJSON: JSON;

    /* 
      Checks if the data being send is in a JSON format.
    */

    try {
      messageJSON = JSON.parse(data.toString());
    } catch (err) {
      ws.close(1003, "Invalid Input JSON");
      return;
    }

    if (userIsVerified) {
      /* 
        EXAMPLE:
        {
          message: "Hello",
          image: null
        }
     */

      if (!("message" in messageJSON)) {
        ws.close(1003, "Invalid Input JSON. Doesn't contain message");
        return;
      } else if (!("image" in messageJSON)) {
        ws.close(1003, "Invalid Input JSON. Doesn't contain image");
        return;
      }

      const message = {
        user: username,
        message: messageJSON.message,
        image: messageJSON.image,
      };
      console.log(message);
      console.log(usersRoom1);

      /* 
        Sends the message to all connected clients.
      */

      wss.clients.forEach((client) => client.send(JSON.stringify(message)));
    } else {
      if (!("username" in messageJSON)) {
        ws.close(1003, "No username send.");
        return;
      } else {
        username = messageJSON.username;
        userIsVerified = true;
        checkUsername();

        /* 
          Broadcast welcome message.
        */

        const message = {
          user: "admin",
          // @ts-ignore
          message: `Welcome to the chat room`,
          username: username,
          reason: "join",
          color: "green",
        };
        wss.clients.forEach((client) => client.send(JSON.stringify(message)));
        console.log("New connection: " + username, [usersRoom1]);
      }
    }
  });

  ws.on("close", (code) => {
    if (!(username === undefined)) {
      usersRoom1 = usersRoom1.filter((e) => e !== username);
      const message = {
        user: "admin",
        message: ` has leaved the room!`,
        username: username,
        // @ts-ignore
        reason: "leave",
        color: "red",
      };

      wss.clients.forEach((client) => client.send(JSON.stringify(message)));
      console.log("Lose connection: " + username, [usersRoom1]);
    }
  });
});

/* 
  UNUSED USER AND PASSWORD AUTHENTICATION WEBSOCKET.
*/

/* wss.on("connection", (ws, req) => {
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
}); */

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
