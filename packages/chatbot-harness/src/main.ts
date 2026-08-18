import dotenv from "dotenv";
import express from 'express';
import morgan from "morgan";

const app = express();

dotenv.config();

app.use(morgan("dev"));
app.use(express.json());

app.get('/', (req, res) => {
    res.send("Hello World!");
});

app.listen(process.env.PORT, () => {
    console.log("Listening on port", process.env.PORT);
});
