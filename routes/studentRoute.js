import express from 'express';
import multer from 'multer';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
import { createStudents, deleteStudent, readAllStudent, readSingleStudent, readStudentVideo, updateStudent } from '../controllers/studentController.js';
import { checkcache_for_students } from '../middleware/caching_middleware.js';

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
router.get('/read-all-student', checkcache_for_students, readAllStudent);

//Verify Phone Number || POST
router.post('/read-student', readSingleStudent);

//Verify Phone Number || POST
router.post('/read-student-video', readStudentVideo);

//Verify Phone Number || POST
router.post('/update-student', upload, updateStudent);

//Verify Phone Number || POST
router.post('/delete-student', deleteStudent);

export default router;
