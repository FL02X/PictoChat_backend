import bcrypt from "bcrypt";
import { Client } from "pg";
import { nanoid } from "nanoid";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const client = new Client({
  user: process.env.SQL_USER,
  host: "localhost",
  database: "postgres",
  password: process.env.SQL_PASS,
});

client.connect((err) => {
  if (err) {
    console.log("Error connecting to database" + err.stack);
    return;
  }
  console.log("conectado");
});

export const login = async (req: Request, res: Response) => {
  const user = req.body.user;
  const password = req.body.password;

  const query = "SELECT * FROM Users WHERE Users = $1";
  const values = [user];

  client.query(query, values, async (err, result) => {
    if (err) {
      console.log(err.message);
      res.status(401).send({ error: err.message });
      res.setHeader("Access-Control-Allow-Origin", "*");
      return;
    }

    if (result.rowCount > 0) {
      const rows = result.rows;
      const verifiedRow = rows.map((e) => e.verified);

      if (verifiedRow[0] == 0) {
        console.log("Email no verificado.");
        res.send({ error: "Email no verificado" });
        res.setHeader("Access-Control-Allow-Origin", "*");
        return;
      }

      const passwordRow = rows.map((e) => e.passwords);
      const isPasswordValid = await bcrypt.compare(password, passwordRow[0]);
      if (!isPasswordValid) {
        console.log("Contraseña incorrecta" + passwordRow[0], password);
        res.send({ error: "Contraseña incorrecta" });
        res.setHeader("Access-Control-Allow-Origin", "*");
      } else {
        const SESSION_TOKEN = nanoid();

        const query = "UPDATE Users SET session_token = $2 WHERE Users = $1";
        const values = [user, SESSION_TOKEN];
        client.query(query, values, (err, result) => {
          if (err) {
            console.log(err.message);
            res.status(500).send({ error: err.message });
            res.setHeader("Access-Control-Allow-Origin", "*");
            return;
          }
          res
            .cookie("SessionToken", SESSION_TOKEN, {
              httpOnly: true,
            })
            //Remove on public.
            .send({ token: SESSION_TOKEN })
            .status(200);
        });
      }
    } else {
      res.send("Usuario no encontrado.");
      res.setHeader("Access-Control-Allow-Origin", "*");
      client.end;
    }
  });
};

export const register = async (req: Request, res: Response) => {
  const { user, password, email } = req.body;
  if (!user) {
    res.send("El nombre de usario es obligatorio.").status(400);
  } else if (!password) {
    res.send("La contraseña es obligatoria.").status(400);
  } else if (!email) {
    res.send("Correo electronico es obligatorio.").status(400);
  }

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const token = jwt.sign({ user: user }, process.env.JWT_KEY, {
    expiresIn: "30s",
  });
  const url = `http://localhost:3000/auth/email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Email verification to PictoChat Web",
    html: `Link: <a href=${url}>${url}</a>`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log(err.message);
      res
        .send({
          error: "No se ha podido enviar correo de verificacion.",
        })
        .status(502);
    } else {
      res.send({
        message: "Correo de verificacion enviado.",
      });
    }
  });

  const hashedPassword = await bcrypt.hash(password, 10);

  const query =
    "INSERT INTO Users(username, passwords, email, verified) VALUES ($1, $2, $3, $4)";
  const values = [user, hashedPassword, email, 0];

  client.query(query, values, (err, result) => {
    if (err) {
      console.log(err.message);
      res.status(500).send({ error: err.message });
      return;
    }
    console.log("SCHEMA CREADO!!", hashedPassword);
    client.end;
  });
};

export const getAllMessages = (req: Request, res: Response) => {
  const query =
    "SELECT json_agg(messages) FROM (SELECT * FROM message_board_1) messages";
  client.query(query, (err, result) => {
    if (err) {
      res.status(500).send({ error: err.message });
      console.log(err);
      return;
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "1800");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "PUT, POST, GET, DELETE, PATCH, OPTIONS"
    );
    res.send(result.rows[0]);
  });
};

export const emailVerification = (req: Request, res: Response) => {
  const token = req.params.token;
  let user: String;

  if (!token) {
    res
      .send({
        err: "Token is obligatory.",
      })
      .status(400);
  }

  jwt.verify(token, process.env.JWT_KEY, (err, decoded: any) => {
    if (err) {
      console.log(err.message);
      res
        .send({
          error: "Enlace caducado.",
          status: false,
        })
        .status(400);
      return;
    }

    if (!decoded.user) {
      res
        .send({
          error: "Invalid token.",
          status: false,
        })
        .status(400);
      return;
    }

    user = decoded.username;
    const values = [user];
    const query = "UPDATE users SET verified = 1 WHERE username = $1";
    client.query(query, values, (err, result) => {
      if (err) {
        console.log(err.message);
        res
          .send({
            error: err.message,
          })
          .status(500);
        return;
      }

      console.log(result);
      res.send({
        status: true,
      });
    });
  });
};
