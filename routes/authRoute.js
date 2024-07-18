import express from 'express';
import {
  adminRegisterController,
  adminLoginController,
} from '../controllers/authController.js';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
// import { create } from '../DB/FCRUD.js';

//route object
const router = express.Router();

//routing

//Register User || POST
router.post('/register-admin', adminRegisterController);

//Login User || POST
router.post('/login-admin', adminLoginController);

//protected user routing auth
router.get('/user-auth', requireSignIn, (req, res) => {
  res.status(200).send({ ok: true });
});

//protected admin routing auth
router.get('/admin-auth', requireSignIn, isAdmin, (req, res) => {
  res.status(200).send({ ok: true });
});

export default router;
