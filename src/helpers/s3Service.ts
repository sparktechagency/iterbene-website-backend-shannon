import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import colors from 'colors';
import { s3Client } from '../aws/awsConfig';
import { config } from '../config';
import { logger, errorLogger } from '../shared/logger';
import { USER_UPLOADS_FOLDER } from '../modules/user/user.constant';

// Supported file types and their max sizes
const FILE_LIMITS = {
  images: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  documents: {
    extensions: ['pdf', 'doc', 'docx', 'txt'],
    maxSize: 50 * 1024 * 1024, // 50MB
  },
  videos: {
    extensions: ['mp4', 'avi', 'mov', 'wmv'],
    maxSize: 100 * 1024 * 1024, // 100MB
  },
  audio: {
    extensions: ['mp3', 'wav', 'ogg'],
    maxSize: 20 * 1024 * 1024, // 20MB
  },
};

/**
 * Validate file type and size
 */
const validateFile = (file: Express.Multer.File) => {
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);

  // Check if file type is supported
  let fileCategory: string | null = null;
  let maxSize = 0;

  for (const [category, limits] of Object.entries(FILE_LIMITS)) {
    if (limits.extensions.includes(fileExtension)) {
      fileCategory = category;
      maxSize = limits.maxSize;
      break;
    }
  }

  if (!fileCategory) {
    throw new Error(`Unsupported file type: ${fileExtension}`);
  }

  // Check file size
  if (file.size > maxSize) {
    throw new Error(
      `File size exceeds ${
        maxSize / (1024 * 1024)
      }MB limit for ${fileCategory}: ${file.originalname}`
    );
  }

  return { fileCategory, fileExtension };
};

/**
 * Clean up local temporary files
 */
const cleanupLocalFiles = (filePaths: string[]) => {
  filePaths.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(colors.green(`🗑️  Cleaned up local file: ${filePath}`));
      }
    } catch (err) {
      logger.warn(
        colors.yellow(`⚠️  Failed to delete temp file ${filePath}: ${err}`)
      );
    }
  });
};

/**
 * Upload single file to S3
 */
export const uploadSingleFileToS3 = async (
  file: Express.Multer.File,
  uploadsFolder: string = USER_UPLOADS_FOLDER,
  customFileName?: string
): Promise<string> => {
  const filePaths: string[] = [];

  try {
    // Validate file
    const { fileExtension } = validateFile(file);

    // Prepare file path
    const filePath = file.path || path.join(uploadsFolder, file.filename);
    filePaths.push(filePath);

    // Read file
    const uploadBuffer = fs.readFileSync(filePath);

    // Generate unique filename
    const fileName = customFileName || `${uuidv4()}.${fileExtension}`;
    const key = `${uploadsFolder}/${fileName}`;

    // Only log in development or for large files
    if (process.env.NODE_ENV === 'development' || file.size > 5 * 1024 * 1024) {
      logger.info(colors.blue(`📤 Uploading file to S3: ${file.originalname}`));
    }

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: config.aws.bucketName,
      Key: key,
      Body: uploadBuffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
      },
    });

    await s3Client.send(command);

    // Generate file URL
    const fileUrl = `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;

    // Only log successful uploads in development or for large files
    if (process.env.NODE_ENV === 'development' || file.size > 5 * 1024 * 1024) {
      logger.info(colors.green(`✅ File uploaded successfully: ${fileUrl}`));
    }

    return fileUrl;
  } catch (error) {
    errorLogger.error('Single file upload failed', {
      error,
      fileName: file.originalname,
      fileSize: file.size,
    });

    throw new Error(
      `File upload failed for ${file.originalname}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  } finally {
    // Clean up local files
    cleanupLocalFiles(filePaths);
  }
};

/**
 * Upload multiple files to S3
 */
export const uploadFilesToS3 = async (
  files: Express.Multer.File[],
  uploadsFolder: string = USER_UPLOADS_FOLDER
): Promise<string[]> => {
  if (!files || files.length === 0) {
    throw new Error('No files provided');
  }

  const fileUrls: string[] = [];
  const filePaths: string[] = [];

  logger.info(
    colors.blue(`📤 Starting upload of ${files.length} files to S3...`)
  );

  try {
    // Process each file
    for (const file of files) {
      const filePath = file.path || path.join(uploadsFolder, file.filename);
      filePaths.push(filePath);

      // Validate file
      const { fileExtension } = validateFile(file);

      // Read file
      const uploadBuffer = fs.readFileSync(filePath);

      // Generate unique filename
      const fileName = `${uuidv4()}.${fileExtension}`;
      const key = `${uploadsFolder}/${fileName}`;

      logger.info(colors.cyan(`📤 Uploading: ${file.originalname}`));

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: config.aws.bucketName,
        Key: key,
        Body: uploadBuffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      await s3Client.send(command);

      // Generate file URL
      const fileUrl = `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;
      fileUrls.push(fileUrl);

      logger.info(colors.green(`✅ Uploaded: ${file.originalname}`));
    }

    logger.info(
      colors.green(`🎉 All ${files.length} files uploaded successfully!`)
    );
    return fileUrls;
  } catch (error) {
    errorLogger.error('Multiple files upload failed', {
      error,
      filesCount: files.length,
      fileNames: files.map(f => f.originalname),
    });

    throw new Error(
      `Batch upload failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  } finally {
    // Clean up all local files
    cleanupLocalFiles(filePaths);
  }
};

/**
 * Delete file from S3
 */
export const deleteFileFromS3 = async (fileUrl: string): Promise<void> => {
  try {
    // Extract key from URL
    const url = new URL(fileUrl);
    const key = url.pathname.slice(1); // Remove leading slash

    logger.info(colors.blue(`🗑️  Deleting file from S3: ${key}`));

    const command = new DeleteObjectCommand({
      Bucket: config.aws.bucketName,
      Key: key,
    });

    await s3Client.send(command);

    logger.info(colors.green(`✅ File deleted successfully: ${key}`));
  } catch (error) {
    errorLogger.error('Failed to delete file from S3', {
      error,
      fileUrl,
    });

    throw new Error(
      `Failed to delete file: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
};

/**
 * Delete multiple files from S3
 */
export const deleteMultipleFilesFromS3 = async (
  fileUrls: string[]
): Promise<void> => {
  if (!fileUrls || fileUrls.length === 0) {
    return;
  }

  logger.info(colors.blue(`🗑️  Deleting ${fileUrls.length} files from S3...`));

  try {
    const deletePromises = fileUrls.map(url => deleteFileFromS3(url));
    await Promise.allSettled(deletePromises);

    logger.info(
      colors.green(`✅ Batch delete completed for ${fileUrls.length} files`)
    );
  } catch (error) {
    errorLogger.error('Batch delete failed', {
      error,
      fileUrls,
    });

    throw new Error(
      `Batch delete failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
};

/**
 * Get file info from S3 URL
 */
export const getFileInfoFromUrl = (fileUrl: string) => {
  try {
    const url = new URL(fileUrl);
    const key = url.pathname.slice(1);
    const fileName = path.basename(key);
    const fileExtension = path.extname(fileName).slice(1);

    return {
      key,
      fileName,
      fileExtension,
      bucket: config.aws.bucketName,
      region: config.aws.region,
    };
  } catch (error) {
    throw new Error(`Invalid S3 URL: ${fileUrl}`);
  }
};

// Export utility functions
export const s3Utils = {
  uploadSingle: uploadSingleFileToS3,
  uploadMultiple: uploadFilesToS3,
  deleteSingle: deleteFileFromS3,
  deleteMultiple: deleteMultipleFilesFromS3,
  getFileInfo: getFileInfoFromUrl,
  validateFile,
  cleanupLocalFiles,
};
