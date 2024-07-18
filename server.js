import express from 'express';
import colors from 'colors';
import dotenv from 'dotenv';
// import { } from './client/src/DB/firebase.js';
import authRoutes from './routes/authRoute.js';
import albumRoutes from './routes/albumRoute.js';
import studentRoutes from './routes/studentRoute.js';
import categoryRoutes from './routes/categoryRoutes.js';
// import productRoutes from './routes/productRoutes.js';
import cors from 'cors';
import product_routes from "./routes/product_routes_aryan.js"
import banner_route from "./routes/banner_route.js"
import user_route from "./routes/userRoute.js"
import bodyParser from 'body-parser';
import seller_route from './routes/sellerRoute.js' 
import utilroute from "./routes/utilities.js"

//configure env
dotenv.config();

//express object
const app = express();

//middlewares
app.use(cors());
app.use( bodyParser.urlencoded({ extended: false }));
app.use(express.json());

//routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/album', albumRoutes);
app.use('/api/v1/gallery', authRoutes);
app.use('/api/v1/album', albumRoutes);
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
