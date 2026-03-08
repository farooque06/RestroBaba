import { v2 as cloudinary } from 'cloudinary';
import { Router } from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = Router();

// Configure Cloudinary
// Note: These should be in .env but I'll provide a placeholder check
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req: any, _file: any) => {
        const clientId = req.clientId || 'public';
        return {
            folder: `restroflow/${clientId}`,
            allowed_formats: ['jpg', 'png', 'webp', 'avif'],
            transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
        };
    },
});

const upload = multer({ storage: storage });

router.post('/', upload.single('image'), async (req: any, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        // Return the secure URL
        res.json({
            url: req.file.path,
            publicId: req.file.filename
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

export default router;
