import { db } from '../DB/firestore.js';
import { comparePassword, hashPassword } from '../helper/authHelper.js';
import JWT from 'jsonwebtoken';
import { admin } from '../DB/firestore.js';
import { createData, readSingleData } from '../helper/crumd_demo.js';

export const verifyPhoneNumber = async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const userRecord = await admin.auth().createUser({
      phoneNumber: phoneNumber,
    });
    res.status(200).send(userRecord);
  } catch (error) {
    res.status(400).send(error);
  }
};

export const userRegisterController = async (req, res) => {
  try {
    const { displayName, phone, uid, createdAt, lastLoginAt } = req.body;
    if (!displayName) {
      return res.send({ message: 'displayName is required' });
    }
    if (!phone) {
      return res.send({ message: 'Phone is required' });
    }
    if (!uid) {
      return res.send({ message: 'uid is required' });
    }
    if (!createdAt) {
      return res.send({ message: 'createdAt is required' });
    }
    if (!lastLoginAt) {
      return res.send({ message: 'lastLoginAt is required' });
    }
    var querySnapshot = null;
    //existing user
    querySnapshot = await readSingleData(process.env.userCollection, uid);
    console.log(querySnapshot);
    if (querySnapshot) {
      return res.status(200).send({
        success: false,
        message: 'User already registered. Please login.',
      });
    }

    const userJson = {
      name: displayName,
      phone: phone,
      uid: uid,
      address: '',
      photoUrl: '',
      email: '',
      dob: '',
      alternative_phone: '',
      current_orders: [],
      cart: [],
      role: 0,
      createdAt: createdAt,
      lastLoginAt: lastLoginAt
    };

    //token
    const token = await JWT.sign(
      { id: uid },
      process.env.JWT_token,
      {
        expiresIn: '7d',
      }
    );

    var creation = await createData(process.env.userCollection, uid, userJson)
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'User registered successfully',
      user: userJson,
      token
    });
  } catch (error) {
    console.error('Error in user registration:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in user registration',
      error: error.message,
    });
  }
};

//register seller
export const sellerRegisterController = async (req, res) => {
  try {
    const { displayName, phone, uid, address, createdAt, lastLoginAt } = req.body;
    if (!displayName) {
      return res.send({ message: 'displayName is required' });
    }
    if (!phone) {
      return res.send({ message: 'Phone is required' });
    }
    if (!uid) {
      return res.send({ message: 'uid is required' });
    }
    if (!address) {
      return res.send({ message: 'address is required' });
    }
    if (!createdAt) {
      return res.send({ message: 'createdAt is required' });
    }
    if (!lastLoginAt) {
      return res.send({ message: 'lastLoginAt is required' });
    }

    //existing user
    const querySnapshot = await readSingleData(process.env.sellerCollection, uid);
    if (querySnapshot) {
      return res.status(200).send({
        success: false,
        message: 'Seller already registered. Please login.',
      });
    }

    const sellerJson = {
      name: displayName,
      phone: phone,
      uid: uid,
      address: address,
      photoUrl: [],
      orders: [],
      cart: [],
      role: 1,
    };

    //token
    const token = await JWT.sign(
      { id: uid },
      process.env.JWT_token,
      {
        expiresIn: '7d',
      }
    );

    var creation = await createData(process.env.sellerCollection, uid, sellerJson)
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Seller registered successfully',
      user: sellerJson,
      token
    });
  } catch (error) {
    console.error('Error in seller registration:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in seller registration',
      error: error.message,
    });
  }
};


//Login User
export const userLoginController = async (req, res) => {
  try {
    const { uid } = req.body;
    //Validtion
    if (!uid) {
      return res.status(404).send({
        success: false,
        message: 'Invalid user',
      });
    }
    //Retrieve user data
    const userData = await readSingleData(process.env.userCollection, uid);

    //verification
    if (!userData) {
      return res.status(404).send({
        success: false,
        message: 'User is not registered',
      });
    }

    //token
    const token = await JWT.sign(
      { id: userData.uid },
      process.env.JWT_token,
      {
        expiresIn: '7d',
      }
    );
    res.status(200).send({
      success: true,
      message: 'User Login successfully',
      user: {
        name: userData.name,
        uid: userData.uid,
        phone: userData.phone,
        photoUrl: userData.photoUrl,
        address: userData.address,
        email: userData?.email,
        dob: userData?.dob,
        role: userData.role,
      },
      token,
    });
    console.log('success');
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: 'Error in user login',
      error: error,
    });
  }
};

//Login User
export const sellerLoginController = async (req, res) => {
  try {
    const { uid } = req.body;
    //Validtion
    if (!uid) {
      return res.status(404).send({
        success: false,
        message: 'Invalid seller',
      });
    }
    //Retrieve user data
    const userData = await readSingleData(process.env.sellerCollection, uid);

    //verification
    if (!userData) {
      return res.status(404).send({
        success: false,
        message: 'seller is not registered',
      });
    }

    //token
    const token = await JWT.sign(
      { id: userData.uid },
      process.env.JWT_token,
      {
        expiresIn: '7d',
      }
    );
    res.status(200).send({
      success: true,
      message: 'seller Login successfully',
      user: {
        name: userData.displayName,
        uid: userData.uid,
        phone: userData.phone,
        photoUrl: userData.photoUrl,
        address: userData.address,
        role: userData.role,
      },
      token,
    });
    console.log('success');
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: 'Error in user login',
      error: error,
    });
  }
};

export const testController = (req, res) => {
  res.send('Protected Routes');
};
