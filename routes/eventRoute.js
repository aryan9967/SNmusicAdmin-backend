import express from 'express';
import multer from 'multer';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
import { createEvent, deleteEvent, readAllEvent, readSingleEvent, updateEvent } from '../controllers/eventController.js';

const upload = multer({storage: multer.memoryStorage()});

//route object
const router = express.Router();

//routing

//Verify Phone Number || POST
router.post('/create-student', upload.single('video'), createEvent);

//Verify Phone Number || POST
router.get('/read-all-student', readAllEvent);

//Verify Phone Number || POST
router.post('/read-student', readSingleEvent);

//Verify Phone Number || POST
router.post('/update-student', upload.single('video'), updateEvent);

//Verify Phone Number || POST
router.post('/delete-student', deleteEvent);

export default router;
