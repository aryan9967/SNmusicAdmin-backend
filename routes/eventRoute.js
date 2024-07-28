import express from 'express';
import multer from 'multer';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
import { createEvent, deleteEvent, readAllEvent, readEventVideo, readKeywordEvent, readSingleEvent, updateEvent } from '../controllers/eventController.js';
import { checkcache_for_events } from '../middleware/caching_middleware.js';

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
router.post('/create-event', upload, createEvent);

//Verify Phone Number || POST
router.get('/read-all-event', checkcache_for_events, readAllEvent);

//Verify Phone Number || POST
router.post('/read-keyword-event', readKeywordEvent);

//Verify Phone Number || POST
router.post('/read-event', readSingleEvent);

//Verify Phone Number || POST
router.post('/read-event-video', readEventVideo);

//Verify Phone Number || POST
router.post('/update-event', upload, updateEvent);

//Verify Phone Number || POST
router.post('/delete-event', deleteEvent);

export default router;
