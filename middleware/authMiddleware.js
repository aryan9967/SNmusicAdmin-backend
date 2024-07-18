import JWT from 'jsonwebtoken';
import { db } from '../DB/firestore.js';

export const requireSignIn = async (req, res, next) => {
  try {
    const token = req.headers.authorization; // Get the token from the request headers
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token is required. Please login again.',
      });
    }

    const decode = JWT.verify(token, process.env.JWT_token);
    req.user_id = decode.id;
    console.log("inside signin", decode.id);
    next();
  } catch (error) {
    console.log(error);
    res.status(401).send("Authorization error")
  }
};

//admin access
export const isAdmin = async (req, res, next) => {
  if (req.user_id) {
    try {
      const userRef = db.collection(process.env.userCollection).doc(req.user_id);
      const response = await userRef.get();
      const user = response.data();
      if (user.role == 2) {
        next();
      } else {
        return res.status(401).send({
          success: false,
          message: 'Unauthorized Access',
        });
      }
    } catch (error) {
      console.log(error);
      res.status(401).send({
        success: false,
        message: 'Error in Admin Access',
        error: error,
      });
    }
  }
  else {
    return res.status(400).send("Userid is not provided")
  }
};

export const isUser = async (req, res, next) => {
  if (req.user_id) {
    try {
      const user_doc = await db.collection(process.env.userCollection).doc(req.user_id).get()
      const { role } = user_doc.data()
      if (Number(role) == 0) {
        console.log("user signed in")
        next()
      }
      else {
        res.status(401).send("unauthorized")
      }
    }
    catch (err) {
      console.log("error")
    }
  }
  else {
    return res.status(400).send("Userid is not provided")
  }
}

export const isSeller = async (req, res, next) => {
  if (req.user_id) {
    try {
      console.log("req body in isSeller",req.body)
      const user_doc = await db.collection(process.env.sellerCollection).doc(req.user_id).get()
      const { role } = user_doc.data()
      if (Number(role) == 1) {
        console.log("seller signed in")
        req.seller_id = req.user_id
        next()
      }
      else {
       return res.status(401).send("unauthorized")
      }
    }
    catch (err) {
      console.log("error")
    }
  }
  else {
    return res.status(400).send("Userid is not provided")
  }
}

export const authorizeProductOwner = async (req, res, next) => {
  const pid = req.body.pid
  console.log(req.body)
  console.log("pid", pid)
  const seller_id = req.seller_id
  console.log(seller_id)
  if (pid && seller_id) {
    const seller_doc = await db.collection(process.env.sellerCollection).doc(seller_id).get()
    const seller_products = seller_doc.data().products
    console.log(seller_products)
    let check = false

    for(var i = 0 ; i<seller_products.length; i++){
      if(seller_products[i] == pid){
        check = true
        break
      }
    }
    if(check){
      console.log("Product belongs to seller")
      next()
    }
    else{
      return res.status(401).send("Product does not belong to seller")
    }

  }
  else {
    return res.status(400).send("Pid or seller_id is not provided")
  }
}