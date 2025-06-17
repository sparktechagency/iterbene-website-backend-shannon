import multer, { StorageEngine, FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

const fileUploadHandler = (UPLOADS_FOLDER: string) => {
  // Ensure the upload folder exists
  const ensureFolder = async () => {
    try {
      await fs.mkdir(UPLOADS_FOLDER, { recursive: true });
    } catch (err) {
      console.error(`Failed to create upload folder: ${err}`);
      throw new Error('Unable to create upload folder');
    }
  };

  ensureFolder();

  // Configure multer storage
  const storage: StorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_FOLDER); // Use the provided destination folder
    },
    filename: (req, file, cb) => {
      const fileExt = path.extname(file.originalname).toLowerCase();
      const filename = `${uuidv4()}${fileExt}`; // Use UUID for unique filename
      cb(null, filename);
    },
  });

  // File filter to allow only specific file types
  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    const allowedTypes = [
      'image/jpg',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'image/webp',
      'image/heic',
      'image/heif',
      'text/csv',
      'video/mp4',
      'audio/mpeg',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true); // Accept file
    } else {
      console.error(`File rejected: ${file.originalname}`);
      cb(
        new Error(
          'Only jpg, jpeg, png, gif, webp, heic, heif, csv, mp4, pdf and mpeg formats are allowed!'
        )
      );
    }
  };

  // Create and return the upload middleware
  return multer({
    storage,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter,
  });
};
export default fileUploadHandler;
