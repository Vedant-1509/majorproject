import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import router from './routes/donor.routes.js';
import ngoRouter from './routes/ngo.routes.js';
import adminrouter from './routes/admin.routes.js';
import ltrRoutes from "./routes/ltrData.route.js";
import path from 'path';
dotenv.config()

console.log("ENV CHECK:", process.env.OPENCAGE_API_KEY);

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(path.resolve(), 'uploads')));
app.use("/api/v0", ltrRoutes);
app.use("/api/v1", router)
app.use("/api/v2", ngoRouter)
app.use("/api", adminrouter)

const start = async () => {

    const connectDB = await mongoose.connect("mongodb://morevedant1509_db_user:ETVaR9tdDW919vLt@ac-jztqv2z-shard-00-00.xyfgcjd.mongodb.net:27017,ac-jztqv2z-shard-00-01.xyfgcjd.mongodb.net:27017,ac-jztqv2z-shard-00-02.xyfgcjd.mongodb.net:27017/?ssl=true&replicaSet=atlas-slywyq-shard-0&authSource=admin&appName=Cluster0")

    app.listen(process.env.PORT, () => {
        console.log("server is running on port 5000")
        console.log("MongoDB is connected")
    })

}
start()
