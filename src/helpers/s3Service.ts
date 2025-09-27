import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import colors from 'colors';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { s3Client } from '../aws/awsConfig';
import { config } from '../config';
import { logger, errorLogger } from '../shared/logger';
import { USER_UPLOADS_FOLDER } from '../modules/user/user.constant';

// Supported file types and their max sizes
const FILE_LIMITS = {
  images: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'],
    maxSize: 50 * 1024 * 1024, // 50MB (increased due to compression)
  },
  documents: {
    extensions: ['pdf', 'doc', 'docx', 'txt'],
    maxSize: 100 * 1024 * 1024, // 100MB (increased due to compression)
  },
  videos: {
    extensions: ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm'],
    maxSize: 500 * 1024 * 1024, // 500MB (increased due to compression)
  },
  audio: {
    extensions: ['mp3', 'wav', 'ogg', 'aac', 'flac'],
    maxSize: 50 * 1024 * 1024, // 50MB (increased due to compression)
  },
};

const COMPRESSION_CONFIG = {
  images: {
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1080,
    format: 'webp',
  },
  videos: {
    crf: 28, // Constant Rate Factor (lower = better quality, higher = smaller size)
    maxWidth: 1280,
    maxHeight: 720,
    videoBitrate: '1000k',
    audioBitrate: '128k',
  },
  documents: {
    quality: 85, // For PDF compression
    dpi: 150, // For image-based PDFs
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
 * Compress image using Sharp
 */
const compressImage = async (
  inputPath: string,
  outputPath: string
): Promise<{ originalSize: number; compressedSize: number }> => {
  try {
    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;

    await sharp(inputPath)
      .resize(
        COMPRESSION_CONFIG.images.maxWidth,
        COMPRESSION_CONFIG.images.maxHeight,
        {
          fit: 'inside',
          withoutEnlargement: true,
        }
      )
      .webp({ quality: COMPRESSION_CONFIG.images.quality })
      .toFile(outputPath);

    const compressedStats = fs.statSync(outputPath);
    const compressedSize = compressedStats.size;

    logger.info(
      colors.cyan(
        `📸 Image compressed: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(
          compressedSize /
          1024 /
          1024
        ).toFixed(2)}MB (${Math.round(
          (1 - compressedSize / originalSize) * 100
        )}% reduction)`
      )
    );

    return { originalSize, compressedSize };
  } catch (error) {
    errorLogger.error('Image compression failed', {
      error,
      inputPath,
      outputPath,
    });
    throw new Error(
      `Image compression failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
};

/**
 * Compress video using FFmpeg
 */
const compressVideo = async (
  inputPath: string,
  outputPath: string
): Promise<{ originalSize: number; compressedSize: number }> => {
  return new Promise((resolve, reject) => {
    try {
      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;

      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(COMPRESSION_CONFIG.videos.videoBitrate)
        .audioBitrate(COMPRESSION_CONFIG.videos.audioBitrate)
        .size(
          `${COMPRESSION_CONFIG.videos.maxWidth}x${COMPRESSION_CONFIG.videos.maxHeight}`
        )
        .outputOptions([
          `-crf ${COMPRESSION_CONFIG.videos.crf}`,
          '-preset medium',
          '-movflags +faststart',
        ])
        .output(outputPath)
        .on('start', commandLine => {
          logger.info(
            colors.cyan(
              `🎬 Starting video compression: ${path.basename(inputPath)}`
            )
          );
        })
        .on('progress', progress => {
          if (progress.percent) {
            logger.info(
              colors.yellow(
                `🎬 Video compression progress: ${Math.round(
                  progress.percent
                )}%`
              )
            );
          }
        })
        .on('end', () => {
          try {
            const compressedStats = fs.statSync(outputPath);
            const compressedSize = compressedStats.size;

            logger.info(
              colors.cyan(
                `🎬 Video compressed: ${(originalSize / 1024 / 1024).toFixed(
                  2
                )}MB → ${(compressedSize / 1024 / 1024).toFixed(
                  2
                )}MB (${Math.round(
                  (1 - compressedSize / originalSize) * 100
                )}% reduction)`
              )
            );

            resolve({ originalSize, compressedSize });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', error => {
          errorLogger.error('Video compression failed', {
            error,
            inputPath,
            outputPath,
          });
          reject(new Error(`Video compression failed: ${error.message}`));
        })
        .run();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Compress document (currently supports basic optimization)
 */
const compressDocument = async (
  inputPath: string,
  outputPath: string,
  mimeType: string
): Promise<{ originalSize: number; compressedSize: number }> => {
  try {
    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;

    // For now, we'll just copy the file (future enhancement can add PDF compression)
    fs.copyFileSync(inputPath, outputPath);

    const compressedStats = fs.statSync(outputPath);
    const compressedSize = compressedStats.size;

    logger.info(
      colors.cyan(
        `📄 Document processed: ${(originalSize / 1024 / 1024).toFixed(2)}MB`
      )
    );

    return { originalSize, compressedSize };
  } catch (error) {
    errorLogger.error('Document compression failed', {
      error,
      inputPath,
      outputPath,
    });
    throw new Error(
      `Document compression failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
};

/**
 * Compress audio file
 */
const compressAudio = async (
  inputPath: string,
  outputPath: string
): Promise<{ originalSize: number; compressedSize: number }> => {
  return new Promise((resolve, reject) => {
    try {
      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;

      ffmpeg(inputPath)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .audioFrequency(44100)
        .output(outputPath)
        .on('start', () => {
          logger.info(
            colors.cyan(
              `🎵 Starting audio compression: ${path.basename(inputPath)}`
            )
          );
        })
        .on('end', () => {
          try {
            const compressedStats = fs.statSync(outputPath);
            const compressedSize = compressedStats.size;

            logger.info(
              colors.cyan(
                `🎵 Audio compressed: ${(originalSize / 1024 / 1024).toFixed(
                  2
                )}MB → ${(compressedSize / 1024 / 1024).toFixed(
                  2
                )}MB (${Math.round(
                  (1 - compressedSize / originalSize) * 100
                )}% reduction)`
              )
            );

            resolve({ originalSize, compressedSize });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', error => {
          errorLogger.error('Audio compression failed', {
            error,
            inputPath,
            outputPath,
          });
          reject(new Error(`Audio compression failed: ${error.message}`));
        })
        .run();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Compress file based on its type
 */
const compressFile = async (
  file: Express.Multer.File,
  fileCategory: string
): Promise<{
  compressedPath: string;
  originalSize: number;
  compressedSize: number;
  newExtension?: string;
}> => {
  const inputPath = file.path || path.join(USER_UPLOADS_FOLDER, file.filename);
  const tempDir = path.dirname(inputPath);
  const baseName = path.basename(
    file.originalname,
    path.extname(file.originalname)
  );

  let outputPath: string;
  let newExtension: string | undefined;
  let compressionResult: { originalSize: number; compressedSize: number };

  try {
    switch (fileCategory) {
      case 'images':
        newExtension = 'webp';
        outputPath = path.join(
          tempDir,
          `${baseName}_compressed.${newExtension}`
        );
        compressionResult = await compressImage(inputPath, outputPath);
        break;

      case 'videos':
        newExtension = 'mp4';
        outputPath = path.join(
          tempDir,
          `${baseName}_compressed.${newExtension}`
        );
        compressionResult = await compressVideo(inputPath, outputPath);
        break;

      case 'audio':
        newExtension = 'mp3';
        outputPath = path.join(
          tempDir,
          `${baseName}_compressed.${newExtension}`
        );
        compressionResult = await compressAudio(inputPath, outputPath);
        break;

      case 'documents':
        const originalExt = path.extname(file.originalname).slice(1);
        outputPath = path.join(
          tempDir,
          `${baseName}_compressed.${originalExt}`
        );
        compressionResult = await compressDocument(
          inputPath,
          outputPath,
          file.mimetype
        );
        break;

      default:
        throw new Error(
          `Compression not supported for file category: ${fileCategory}`
        );
    }

    return {
      compressedPath: outputPath,
      originalSize: compressionResult.originalSize,
      compressedSize: compressionResult.compressedSize,
      newExtension,
    };
  } catch (error) {
    errorLogger.error('File compression failed', {
      error,
      fileCategory,
      fileName: file.originalname,
    });
    throw error;
  }
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
 * Upload single file to S3 with compression
 */
export const uploadSingleFileToS3 = async (
  file: Express.Multer.File,
  uploadsFolder: string = USER_UPLOADS_FOLDER,
  customFileName?: string,
  enableCompression: boolean = true
): Promise<string> => {
  const filePaths: string[] = [];

  try {
    // Validate file
    const { fileCategory, fileExtension } = validateFile(file);

    // Prepare file path
    const filePath = file.path || path.join(uploadsFolder, file.filename);
    filePaths.push(filePath);

    let uploadBuffer: Buffer;
    let finalFileName: string;
    let compressionStats: {
      originalSize: number;
      compressedSize: number;
    } | null = null;

    // Compress file if enabled and supported
    if (
      enableCompression &&
      ['images', 'videos', 'audio', 'documents'].includes(fileCategory)
    ) {
      try {
        logger.info(
          colors.blue(
            `🗜️  Compressing ${fileCategory} file: ${file.originalname}`
          )
        );

        const compressionResult = await compressFile(file, fileCategory);
        filePaths.push(compressionResult.compressedPath);

        uploadBuffer = fs.readFileSync(compressionResult.compressedPath);
        compressionStats = {
          originalSize: compressionResult.originalSize,
          compressedSize: compressionResult.compressedSize,
        };

        // Use new extension if compression changed it
        const finalExtension = compressionResult.newExtension || fileExtension;
        finalFileName = customFileName || `${uuidv4()}.${finalExtension}`;

        logger.info(
          colors.green(
            `✅ Compression complete: ${Math.round(
              (1 -
                compressionResult.compressedSize /
                  compressionResult.originalSize) *
                100
            )}% size reduction`
          )
        );
      } catch (compressionError) {
        logger.warn(
          colors.yellow(
            `⚠️  Compression failed, uploading original file: ${
              compressionError instanceof Error
                ? compressionError.message
                : 'Unknown error'
            }`
          )
        );
        uploadBuffer = fs.readFileSync(filePath);
        finalFileName = customFileName || `${uuidv4()}.${fileExtension}`;
      }
    } else {
      // Upload original file without compression
      uploadBuffer = fs.readFileSync(filePath);
      finalFileName = customFileName || `${uuidv4()}.${fileExtension}`;
    }

    const key = `${uploadsFolder}/${finalFileName}`;

    // Only log in development or for large files
    if (process.env.NODE_ENV === 'development' || file.size > 5 * 1024 * 1024) {
      logger.info(colors.blue(`📤 Uploading file to S3: ${file.originalname}`));
    }

    // Prepare metadata
    const metadata: Record<string, string> = {
      originalName: file.originalname,
      uploadedAt: new Date().toISOString(),
      originalSize: file.size.toString(),
    };

    if (compressionStats) {
      metadata.compressed = 'true';
      metadata.compressedSize = compressionStats.compressedSize.toString();
      metadata.compressionRatio = Math.round(
        (1 - compressionStats.compressedSize / compressionStats.originalSize) *
          100
      ).toString();
    }

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: config.aws.bucketName,
      Key: key,
      Body: uploadBuffer,
      ContentType: file.mimetype,
      Metadata: metadata,
    });

    await s3Client.send(command);

    // Generate file URL
    const fileUrl = `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;

    // Only log successful uploads in development or for large files
    if (process.env.NODE_ENV === 'development' || file.size > 5 * 1024 * 1024) {
      const sizeInfo = compressionStats
        ? ` (${(compressionStats.originalSize / 1024 / 1024).toFixed(2)}MB → ${(
            compressionStats.compressedSize /
            1024 /
            1024
          ).toFixed(2)}MB)`
        : ` (${(file.size / 1024 / 1024).toFixed(2)}MB)`;
      logger.info(
        colors.green(`✅ File uploaded successfully${sizeInfo}: ${fileUrl}`)
      );
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
 * Upload multiple files to S3 with compression
 */
export const uploadFilesToS3 = async (
  files: Express.Multer.File[],
  uploadsFolder: string = USER_UPLOADS_FOLDER,
  enableCompression: boolean = true
): Promise<string[]> => {
  if (!files || files.length === 0) {
    throw new Error('No files provided');
  }

  const fileUrls: string[] = [];

  logger.info(
    colors.blue(
      `📤 Starting upload of ${files.length} files to S3 with compression...`
    )
  );

  try {
    // Process each file using the single file upload function
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      logger.info(
        colors.cyan(
          `📤 Processing file ${i + 1}/${files.length}: ${file.originalname}`
        )
      );

      try {
        const fileUrl = await uploadSingleFileToS3(
          file,
          uploadsFolder,
          undefined,
          enableCompression
        );
        fileUrls.push(fileUrl);
        logger.info(
          colors.green(
            `✅ Uploaded (${i + 1}/${files.length}): ${file.originalname}`
          )
        );
      } catch (fileError) {
        errorLogger.error(`Failed to upload file ${file.originalname}`, {
          error: fileError,
        });
        throw new Error(
          `Failed to upload ${file.originalname}: ${
            fileError instanceof Error ? fileError.message : 'Unknown error'
          }`
        );
      }
    }

    logger.info(
      colors.green(
        `🎉 All ${files.length} files uploaded successfully with compression!`
      )
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

// Export compression functions
export const compressionUtils = {
  compressImage,
  compressVideo,
  compressAudio,
  compressDocument,
  compressFile,
};

// Export only the upload function
export const s3Utils = {
  uploadFilesToS3,
};
