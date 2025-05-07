import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { awsConfig, s3Client } from '../aws/awsConfig';

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
    const compressedImage = await sharp(filePath)
      .jpeg({ quality: 80 }) // Reduce JPEG quality
      .png({ compressionLevel: 8 }) // Reduce PNG compression
      .webp({ quality: 80 }) // Reduce WebP quality
      .toBuffer();
    return compressedImage;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Failed to compress image: ${err.message}`);
    } else {
      throw new Error('Failed to compress image due to an unknown error.');
    }
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

// Main function to upload file to S3
export const uploadFile = async (
  file: Express.Multer.File,
  uploadsFolder: string
): Promise<string> => {
  if (!file) {
    throw new Error('No file provided');
  }

  // Validate file type and size
  const allowedTypes = [
    'image/jpg',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'text/csv',
    'video/mp4',
    'audio/mpeg',
  ];
  const maxSize = 100 * 1024 * 1024; // 100MB

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(
      'Invalid file type. Only jpg, jpeg, png, gif, webp, heic, heif, csv, mp4, and mpeg formats are allowed.'
    );
  }

  if (file.size > maxSize) {
    throw new Error('File size exceeds 100MB limit.');
  }

  const filePath = path.join(uploadsFolder, file.filename);
  // Check video duration if it's a video file
  let uploadBuffer: Buffer;
  if (file.mimetype === 'video/mp4' || file.mimetype === 'audio/mpeg') {
    const duration = await getVideoDuration(filePath);
    const minDuration = 2 * 60; // 2 minutes in seconds
    const maxDuration = 3 * 60; // 3 minutes in seconds

    if (duration < minDuration || duration > maxDuration) {
      fs.unlinkSync(filePath); // Delete file if duration is invalid
      throw new Error('Video duration must be between 2 and 3 minutes.');
    }

    // Compress video
    uploadBuffer = await compressVideo(filePath);
  } else if (
    file.mimetype.startsWith('image/') &&
    !['image/heic', 'image/heif'].includes(file.mimetype)
  ) {
    // Compress image (skip HEIC/HEIF for now)
    uploadBuffer = await compressImage(filePath, file.mimetype);
  } else {
    // For CSV or HEIC/HEIF, use original file
    uploadBuffer = fs.readFileSync(filePath);
  }

  // Check size after compression
  if (uploadBuffer.length > maxSize) {
    // fs.unlinkSync(filePath); // Delete file if size exceeds limit
    throw new Error('Compressed file size exceeds 100MB limit.');
  }

  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  const fileName = `${uuidv4()}.${fileExtension}`;
  const key = `uploads/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: awsConfig.bucketName,
    Key: key,
    Body: uploadBuffer,
    ContentType: file.mimetype,
    ACL: 'public-read', // Make file publicly accessible
  });
  console.log(command)

  try {
    await s3Client.send(command);
    // Delete file from server after successful upload
    // fs.unlinkSync(filePath);
    return `https://${awsConfig.bucketName}.s3.${awsConfig.region}.amazonaws.com/${key}`;
  } catch (err) {
    // fs.unlinkSync(filePath); // Delete file if upload fails
    if (err instanceof Error) {
      throw new Error(`Failed to upload file to S3: ${err.message}`);
    } else {
      throw new Error('Failed to upload file to S3 due to an unknown error.');
    }
  }
};
