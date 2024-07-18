import express from 'express';
import multer from 'multer';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
import { createStudents, deleteStudent, readAllStudent, readSingleStudent, updateStudent } from '../controllers/studentController.js';

const upload = multer({storage: multer.memoryStorage()});

//route object
const router = express.Router();

//routing

//Verify Phone Number || POST
router.post('/create-student', requireSignIn, isAdmin, upload.single('video'), createStudents);

//Verify Phone Number || POST
router.get('/read-all-student', readAllStudent);

//Verify Phone Number || POST
router.post('/read-student', readSingleStudent);

//Verify Phone Number || POST
router.post('/update-student', requireSignIn, isAdmin, upload.single('video'), updateStudent);

//Verify Phone Number || POST
router.post('/delete-student', requireSignIn, isAdmin, deleteStudent);

export default router;
