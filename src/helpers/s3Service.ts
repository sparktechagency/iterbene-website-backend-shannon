import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { s3Client } from '../aws/awsConfig';
import { config } from '../config';

// Helper function to get video duration
const getVideoDuration = (filePath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(
          new Error(`Failed to read video metadata: ${err.message}`)
        );
      }
      const duration = metadata.format.duration || 0; // Duration in seconds
      resolve(duration);
    });
  });
};

// Helper function to compress image
const compressImage = async (
  filePath: string,
  mimetype: string
): Promise<Buffer> => {
  try {
    const image = sharp(filePath);
    switch (mimetype) {
      case 'image/jpeg':
      case 'image/jpg':
        return await image.jpeg({ quality: 80 }).toBuffer();
      case 'image/png':
        return await image.png({ compressionLevel: 8 }).toBuffer();
      case 'image/webp':
        return await image.webp({ quality: 80 }).toBuffer();
      default:
        return await image.toBuffer(); // Fallback for other formats
    }
  } catch (err) {
    throw new Error(
      `Failed to compress image: ${
        err instanceof Error ? err.message : 'Unknown error'
      }`
    );
  }
};

// Helper function to compress video
const compressVideo = (filePath: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    ffmpeg(filePath)
      .outputOptions([
        '-vf scale=1280:720', // Scale to 720p
        '-b:v 1M', // Set video bitrate to 1Mbps
        '-r 24', // Set frame rate to 24fps
        '-c:a aac', // Use AAC audio codec
        '-b:a 128k', // Set audio bitrate to 128kbps
      ])
      .format('mp4')
      .on('error', err => {
        reject(new Error(`Failed to compress video: ${err.message}`));
      })
      .on('end', () => {
        resolve(Buffer.concat(chunks));
      })
      .pipe()
      .on('data', chunk => {
        chunks.push(chunk);
      });
  });
};

// Upload multiple files to S3
export const uploadFilesToS3 = async (
  files: Express.Multer.File[],
  uploadsFolder: string
): Promise<string[]> => {
  if (!files || files.length === 0) {
    throw new Error('No files provided');
  }

  const fileUrls: string[] = [];
  const maxSize = 100 * 1024 * 1024; // 100MB

  for (const file of files) {
    const filePath = path.join(uploadsFolder, file.filename);
    let uploadBuffer: Buffer;

    try {
      // Check video duration if it's a video file
      if (file.mimetype === 'video/mp4' || file.mimetype === 'audio/mpeg') {
        const duration = await getVideoDuration(filePath);
        const minDuration = 2 * 60; 
        const maxDuration = 3 * 60; // 3 minutes in seconds

        if (duration < minDuration || duration > maxDuration) {
          throw new Error(
            `Video duration must be between 2 and 3 minutes for file: ${file.originalname}`
          );
        }

        // Compress video
        uploadBuffer = await compressVideo(filePath);
      } else if (
        file.mimetype.startsWith('image/') &&
        !['image/heic', 'image/heif'].includes(file.mimetype)
      ) {
        // Compress image (skip HEIC/HEIF)
        uploadBuffer = await compressImage(filePath, file.mimetype);
      } else {
        // For CSV or HEIC/HEIF, use original file
        uploadBuffer = await fs.readFile(filePath);
      }

      // Check size after compression
      if (uploadBuffer.length > maxSize) {
        throw new Error(
          `Compressed file size exceeds 100MB limit for file: ${file.originalname}`
        );
      }

      // S3 upload
      const fileExtension = path
        .extname(file.originalname)
        .toLowerCase()
        .slice(1);
      const fileName = `${uuidv4()}.${fileExtension}`;
      const key = `${uploadsFolder}/${fileName}`;

      const command = new PutObjectCommand({
        Bucket: config.aws.bucketName,
        Key: key,
        Body: uploadBuffer,
        ContentType: file.mimetype,
      });

      await s3Client.send(command);
      // Generate the file URL
      const fileUrl = `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;
      fileUrls.push(fileUrl);
    } catch (error) {
      throw new Error(
        `File upload failed for ${file.originalname}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  return fileUrls;
};

// Delete file from S3
export const deleteFileFromS3 = async (fileKey: string): Promise<void> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: config.aws.bucketName,
      Key: fileKey,
    });

    await s3Client.send(command);
    console.log(`File deleted from S3: ${fileKey}`);
  } catch (error) {
    throw new Error(
      `Failed to delete file from S3: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
};
