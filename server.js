import express from 'express';
import colors from 'colors';
import dotenv from 'dotenv';
// import { } from './client/src/DB/firebase.js';
import authRoutes from './routes/authRoute.js';
import albumRoutes from './routes/albumRoute.js';
import studentRoutes from './routes/studentRoute.js';
import eventRoutes from './routes/eventRoute.js';
// import productRoutes from './routes/productRoutes.js';
import cors from 'cors';
import bodyParser from 'body-parser';
import utilroute from "./routes/utilities.js"

//configure env
dotenv.config();

//express object
const app = express();

//middlewares
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

//routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/album', albumRoutes);
app.use('/api/v1/gallery', authRoutes);
app.use('/api/v1/event', eventRoutes);
app.use('/api/v1/student', studentRoutes);

//rest api
app.get('/', (req, res) => {
  try {
    res.send('<h1>Welcome to E-commerce</h1>');
  } catch (error) {
    console.log(error);
  }
});

//PORT
const PORT = process.env.PORT || 8080;

//Listens
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`.cyan);
});
