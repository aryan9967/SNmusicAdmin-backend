import express from 'express';
import multer from 'multer';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
import { checkcache_for_events, checkcache_for_study } from '../middleware/caching_middleware.js';
import { createStudy, deleteStudy, readAllStudy, readSingleStudy, readStudyVideo, updateStudy } from '../controllers/studyController.js';
import { readAllAccess, readUserAccess, testPreference, updateAccess } from '../controllers/accessController.js';
import { updateFieldOrderData } from '../DB/crumd.js';

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
router.get('/read-all-access', readAllAccess);

//Verify Phone Number || POST
router.post('/read-user-access', readUserAccess);

//Verify Phone Number || POST
router.post('/update-access', updateAccess);

//Verify Phone Number || POST
router.post('/delete-study', deleteStudy);

//Verify Phone Number || POST
router.post('/test-preference', testPreference);

export default router;
