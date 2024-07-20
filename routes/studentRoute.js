import express from 'express';
import multer from 'multer';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
import { createStudents, deleteStudent, readAllStudent, readSingleStudent, updateStudent } from '../controllers/studentController.js';

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB file size limit
}).fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 },
]);

//route object
const router = express.Router();

//routing

//Verify Phone Number || POST
router.post('/create-student', upload, createStudents);

//Verify Phone Number || POST
router.get('/read-all-student', readAllStudent);

//Verify Phone Number || POST
router.post('/read-student', readSingleStudent);

//Verify Phone Number || POST
router.post('/update-student', upload, updateStudent);

//Verify Phone Number || POST
router.post('/delete-student', deleteStudent);

export default router;
