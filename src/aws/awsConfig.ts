import { S3Client } from '@aws-sdk/client-s3';
import { config } from '../config';

export const awsConfig = {
  region: config.aws.region,
  bucketName: config.aws.bucketName,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
  httpOptions: {
     timeout: 30000 // 30 seconds
  }
};

export const s3Client = new S3Client({
  region: awsConfig.region,
  credentials: awsConfig.credentials,
});
