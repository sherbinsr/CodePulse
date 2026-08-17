import logging
import os
from pathlib import Path
from typing import Optional, Union

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import settings

logger = logging.getLogger(__name__)


class S3Service:
    def __init__(self):
        self.bucket_name = settings.s3_bucket_name or "gitaudit"
        self.region = settings.aws_region or "us-east-1"
        self.access_key = settings.aws_access_key_id or os.getenv("AWS_ACCESS_KEY_ID", "")
        self.secret_key = settings.aws_secret_access_key or os.getenv("AWS_SECRET_ACCESS_KEY", "")
        self.endpoint_url = settings.s3_endpoint_url or os.getenv("AWS_ENDPOINT_URL", None)

        # Fallback local directory if S3 credentials not configured or unreachable
        self.local_storage_dir = Path("/tmp/gitaudit_s3_data") / self.bucket_name
        self.local_storage_dir.mkdir(parents=True, exist_ok=True)

        self.s3_client = None
        if self.access_key and self.secret_key:
            try:
                kwargs = {
                    "aws_access_key_id": self.access_key,
                    "aws_secret_access_key": self.secret_key,
                    "region_name": self.region,
                }
                if self.endpoint_url:
                    kwargs["endpoint_url"] = self.endpoint_url
                self.s3_client = boto3.client("s3", **kwargs)
                logger.info("Initialized S3 client for bucket %s", self.bucket_name)
            except Exception as e:
                logger.warning("Failed to initialize boto3 S3 client: %s. Using local S3 fallback.", e)
        else:
            logger.info("AWS credentials not configured. Using local filesystem S3 fallback at %s", self.local_storage_dir)

    def _safe_local_path(self, key: str) -> Path:
        """Resolve path and prevent directory traversal attacks."""
        safe_key = key.lstrip("/\\")
        base_dir = self.local_storage_dir.resolve()
        target = (self.local_storage_dir / safe_key).resolve()
        if not str(target).startswith(str(base_dir)):
            raise ValueError(f"Path traversal detected in key: {key}")
        return target

    def upload_file(
        self,
        key: str,
        content: Union[bytes, str],
        content_type: str = "text/markdown; charset=utf-8",
    ) -> dict:
        """Upload content directly to S3 (or local fallback) and return s3 metadata."""
        if isinstance(content, str):
            body_bytes = content.encode("utf-8")
        else:
            body_bytes = content

        uploaded_to_s3 = False
        s3_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{key}"

        if self.s3_client:
            try:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=key,
                    Body=body_bytes,
                    ContentType=content_type,
                )
                uploaded_to_s3 = True
                logger.info("Successfully uploaded %s to S3 bucket %s", key, self.bucket_name)
            except (BotoCoreError, ClientError, Exception) as e:
                logger.warning("S3 upload for %s failed (%s). Falling back to local storage.", key, e)

        # Always maintain local copy fallback for reliability
        try:
            local_path = self._safe_local_path(key)
            local_path.parent.mkdir(parents=True, exist_ok=True)
            with open(local_path, "wb") as f:
                f.write(body_bytes)

            if not uploaded_to_s3:
                logger.info("Saved %s to local S3 fallback store at %s", key, local_path)
        except Exception as exc:
            logger.warning("Local storage write failed for key %s: %s", key, exc)

        return {
            "s3_bucket": self.bucket_name,
            "s3_key": key,
            "s3_url": s3_url,
            "bytes_size": len(body_bytes),
        }

    def get_file_content(self, key: str) -> Optional[bytes]:
        """Fetch content from S3 (or local fallback)."""
        if self.s3_client:
            try:
                response = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
                return response["Body"].read()
            except Exception as e:
                logger.warning("Could not fetch %s from S3 (%s), checking local fallback...", key, e)

        try:
            local_path = self._safe_local_path(key)
            if local_path.exists():
                return local_path.read_bytes()
        except Exception as exc:
            logger.warning("Local storage read failed for key %s: %s", key, exc)

        return None

    def delete_file(self, key: str) -> bool:
        """Delete file from S3 and local fallback."""
        deleted = False
        if self.s3_client:
            try:
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
                deleted = True
            except Exception as e:
                logger.warning("Failed to delete %s from S3: %s", key, e)

        try:
            local_path = self._safe_local_path(key)
            if local_path.exists():
                local_path.unlink()
                deleted = True
        except Exception as exc:
            logger.warning("Local storage delete failed for key %s: %s", key, exc)

        return deleted
