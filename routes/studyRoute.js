import express from 'express';
import multer from 'multer';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
import { checkcache_for_events, checkcache_for_study } from '../middleware/caching_middleware.js';
import { createStudy, deleteStudy, readAllStudy, readSingleStudy, readStudyVideo, updateStudy } from '../controllers/studyController.js';

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
router.post('/create-study', upload, createStudy);

//Verify Phone Number || POST
router.get('/read-all-study', checkcache_for_study, readAllStudy);

//Verify Phone Number || POST
router.post('/read-study', readSingleStudy);

//Verify Phone Number || POST
router.post('/read-study-video', readStudyVideo);

//Verify Phone Number || POST
router.post('/update-study', upload, updateStudy);

//Verify Phone Number || POST
router.post('/delete-study', deleteStudy);

export default router;
