import express from 'express';
import colors from 'colors';
import dotenv from 'dotenv';
import morgan from "morgan";
// import { } from './client/src/DB/firebase.js';
import authRoutes from './routes/authRoute.js';
import albumRoutes from './routes/albumRoute.js';
import studentRoutes from './routes/studentRoute.js';
import eventRoutes from './routes/eventRoute.js';
import galleryRoutes from './routes/galleryRoute.js';
import instrumentRoutes from './routes/windInstrumentRoute.js';
import studyRoutes from './routes/studyRoute.js';
import accessRoutes from './routes/accessRoute.js';
// import productRoutes from './routes/productRoutes.js';
import cors from 'cors';
import bodyParser from 'body-parser';

//configure env
dotenv.config();

//express object
const app = express();

//middlewares
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(morgan('combined'));
// Custom middleware to log request duration
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

//routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/album', albumRoutes);
app.use('/api/v1/gallery', galleryRoutes);
app.use('/api/v1/event', eventRoutes);
app.use('/api/v1/instrument', instrumentRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/study', studyRoutes);
app.use('/api/v1/access', accessRoutes);

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
