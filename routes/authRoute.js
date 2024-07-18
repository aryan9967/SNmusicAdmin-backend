import express from 'express';
import {
  testController,
  verifyPhoneNumber,
  userRegisterController,
  userLoginController,
  sellerRegisterController,
  sellerLoginController,
} from '../controllers/authController.js';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
// import { create } from '../DB/FCRUD.js';

//route object
const router = express.Router();

//routing

//Verify Phone Number || POST
router.post('/verify', verifyPhoneNumber);

//Register User || POST
router.post('/register-user', userRegisterController);

//Register Seller || POST
router.post('/register-seller', sellerRegisterController);

//Login User || POST
router.post('/login-user', userLoginController);

//Login Seller || POST
router.post('/login-seller', sellerLoginController);

//test route
router.get('/test', requireSignIn, isAdmin, testController);

//protected user routing auth
router.get('/user-auth', requireSignIn, (req, res) => {
  res.status(200).send({ ok: true });
});

//protected admin routing auth
router.get('/admin-auth', requireSignIn, isAdmin, (req, res) => {
  res.status(200).send({ ok: true });
});

export default router;
