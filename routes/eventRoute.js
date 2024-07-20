import express from 'express';
import multer from 'multer';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
import { createEvent, deleteEvent, readAllEvent, readSingleEvent, updateEvent } from '../controllers/eventController.js';

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
router.post('/create-event', upload.single('video'), createEvent);

//Verify Phone Number || POST
router.get('/read-all-event', readAllEvent);

//Verify Phone Number || POST
router.post('/read-event', readSingleEvent);

//Verify Phone Number || POST
router.post('/update-event', upload.single('video'), updateEvent);

//Verify Phone Number || POST
router.post('/delete-event', deleteEvent);

export default router;
