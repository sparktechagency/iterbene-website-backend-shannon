import { PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { s3Client } from '../aws/awsConfig';
import { config } from '../config';

// Upload any file to S3
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
      // Read the raw file synchronously
      uploadBuffer = fs.readFileSync(filePath);

      // Check file size
      if (uploadBuffer.length > maxSize) {
        throw new Error(
          `File size exceeds 100MB limit for file: ${file.originalname}`
        );
      }

      // S3 upload
      const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
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
    } finally {
      // Clean up temporary file synchronously
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn(`Failed to delete temp file ${filePath}: ${err}`);
      }
    }
  }

  return fileUrls;
};