import { faL } from "@fortawesome/free-solid-svg-icons";
import { db, admin } from "../DB/firestore.js";
import dotenv from "dotenv"
import express from 'express';
import { FieldValue } from "firebase-admin/firestore"
import slugify from "slugify";
import { v4 as uuidv4 } from 'uuid';
import { storeVideo, uploadVideo } from "../DB/storage.js";
import { deleteData, matchData, readAllData, readSingleData } from "../DB/crumd.js";

dotenv.config()

const upload = multer(); //

const bucket = admin.storage().bucket() = GET


//register admin
export const adminRegisterController = async (req, res) => {
    try {
      const { name, address, contact, email, instagram, facebook, twitter } = req.body;
      const adminId = uuidv4();
      if (!name) {
        return res.send({ message: 'Name is required' });
      }
      if (!address) {
        return res.send({ message: 'Address is required' });
      }
      if (!contact) {
        return res.send({ message: 'Contact is required' });
      }
      if (!email) {
        return res.send({ message: 'Email is required' });
      }
      if (!instagram) {
        return res.send({ message: 'Instagram is required' });
      }
      if (!facebook) {
        return res.send({ message: 'Facebook is required' });
      }
      if (!twitter) {
        return res.send({ message: 'Twitter is required' });
      }
  
      //existing user
      const querySnapshot = await readSingleData(process.env.adminCollection, adminId);
      if (querySnapshot) {
        return res.status(200).send({
          success: false,
          message: 'Admin already registered. Please login.',
        });
      }
  
      const adminJson = {
        adminId: adminId,
        name: name,
        address: address,
        contact: contact,
        email: email,
        instagram: instagram,
        facebook: facebook,
        twitter: twitter,
        photoUrl: '',
        role: 2,
      };
  
      //token
      const token = await JWT.sign(
        { id: adminId },
        process.env.JWT_token,
        {
          expiresIn: '7d',
        }
      );
  
      var adminData = await createData(process.env.adminCollection, adminId, adminJson)
      console.log('success');
  
      return res.status(201).send({
        success: true,
        message: 'Admin registered successfully',
        admin: adminJson,
        token
      });
    } catch (error) {
      console.error('Error in admin registration:', error);
      return res.status(500).send({
        success: false,
        message: 'Error in admin registration',
        error: error.message,
      });
    }
  };

  //Login User
  export const adminLoginController = async (req, res) => {
    try {
      const { adminId } = req.body;
      //Validtion
      if (!adminId) {
        return res.status(404).send({
          success: false,
          message: 'Invalid admin',
        });
      }
      //Retrieve user data
      const adminData = await readSingleData(process.env.adminCollection, adminId);
  
      //verification
      if (!adminData) {
        return res.status(404).send({
          success: false,
          message: 'admin is not registered',
        });
      }
  
      //token
      const token = await JWT.sign(
        { id: adminData.adminId },
        process.env.JWT_token,
        {
          expiresIn: '7d',
        }
      );
      res.status(200).send({
        success: true,
        message: 'Admin Login successfully',
        user: {
            adminId: adminData?.adminId,
            name: adminData?.name,
            address: adminData?.address,
            contact: adminData?.contact,
            email: adminData?.email,
            instagram: adminData?.instagram,
            facebook: adminData?.facebook,
            twitter: adminData?.twitter,
            photoUrl: adminData?.photoUrl,
            role: adminData?.role,
        },
        token,
      });
      console.log('success');
    } catch (error) {
      console.log(error);
      res.status(500).send({
        success: false,
        message: 'Error in admin login',
        error: error,
      });
    }
  };