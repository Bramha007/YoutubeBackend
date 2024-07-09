// require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";
import colors from "colors/safe.js";
import express from "express";

import connectDB from "./db/index.js";
import app from "./app.js";

dotenv.config({ path: "./env" });
connectDB()
  .then(() => {
    const port = process.env.PORT || 8000;
    app.on("error", (error) => {
      console.log(colors.red.bold("ERROR:", error));
      throw error;
    });
    app.listen(port, () => {
      console.log(colors.blue.italic("Server is running on PORT:", port));
    });
  })
  .catch((error) =>
    console.log(colors.red.bold("MONGO DB connection failed !!!", error))
  );
// OTHER METHOD TO CONNECT DATA BASE NOT THAT PROFESSIONAL THOUGH
/*
(async function connectDB() {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (error) => {
      console.log(colors.red.bold("ERROR:", error));
      throw error;
    });

    app.listen(process.evn.PORT, () => {
      console.log(colors.green.bold(`App is listening on ${process.env.PORT}`));
    });
  } catch (error) {
    console.log(colors.red.bold("ERROR:", error));
  }
})();
*/
