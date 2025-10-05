import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import router from './routes/donor.routes.js';
import ngoRouter from './routes/ngo.routes.js';
import adminrouter from './routes/admin.routes.js';
dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", router)
app.use("/api/v2", ngoRouter)
app.use("/api", adminrouter)
app.use(express.static("uploads"))




const start = async () => {

    const connectDB = await mongoose.connect("mongodb+srv://morevedant1509_db_user:aTC4I5qFuLznLuRC@cluster0.0fg3ex3.mongodb.net/majorproject?")

    app.listen(process.env.PORT, () => {
        console.log("server is running on port 5000")
        console.log("MongoDB is connected")
    })

}
start()
