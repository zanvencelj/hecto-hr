import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import type { Readable } from 'stream';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly presignClient: S3Client;
  private readonly defaultBucket: string;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>('MINIO_ENDPOINT') ?? 'http://localhost:9000';
    // Signed URLs embed the endpoint host, so they must be generated against an
    // address the user's browser can reach — not the docker-internal hostname.
    const publicEndpoint = config.get<string>('MINIO_PUBLIC_ENDPOINT') || endpoint;
    const accessKeyId = config.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin';
    const secretAccessKey = config.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin';
    this.defaultBucket = config.get<string>('MINIO_BUCKET') ?? 'hectohr';

    const clientConfig = {
      region: 'us-east-1',
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    };
    this.client = new S3Client({ ...clientConfig, endpoint });
    this.presignClient =
      publicEndpoint === endpoint
        ? this.client
        : new S3Client({ ...clientConfig, endpoint: publicEndpoint });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureBucket();
    } catch (error) {
      // Don't block boot on storage being down; uploads will surface the error
      this.logger.error(`Could not ensure default bucket: ${(error as Error).message}`);
    }
  }

  async ensureBucket(bucket = this.defaultBucket): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
      this.logger.log(`Created bucket: ${bucket}`);
    }
  }

  async upload(
    key: string,
    body: Buffer | Readable | string,
    contentType = 'application/octet-stream',
    bucket = this.defaultBucket,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async getSignedDownloadUrl(
    key: string,
    expiresIn = 3600,
    bucket = this.defaultBucket,
  ): Promise<string> {
    return getSignedUrl(
      this.presignClient,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn },
    );
  }

  async delete(key: string, bucket = this.defaultBucket): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }
}
