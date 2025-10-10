# Security Architecture

---
title: Learning Catalyst Security Architecture
description: Security design patterns, privacy protection, and threat mitigation
version: 1.0.0
last_updated: 2025-10-08
---

## Overview

This document covers Learning Catalyst's security architecture, including privacy protection, data encryption, authentication mechanisms, and threat mitigation strategies. The system is designed with security and privacy as core principles, ensuring user data remains protected while maintaining functionality.

## Security Architecture Overview

### Core Security Principles

1. **Local-First Design**: User data remains on local machines by default
2. **Privacy by Design**: Privacy considerations are built into every component
3. **Minimal Data Exposure**: Only necessary data is transmitted to external services
4. **Secure Defaults**: Default configurations prioritize security over convenience
5. **Transparent Operations**: Users have visibility into data handling and usage

### Security Layers

```text
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │ Input Validation│  │ Output Filtering│  │Error Handling │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Authentication Layer                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │ API Key Storage │  │ Provider Auth   │  │Session Mgmt   │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Protection Layer                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │ Encryption      │  │ Access Control  │  │Audit Logging  │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │ File System     │  │ Network Security │  │Process Isolation│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Data Privacy and Protection

### Local-First Data Architecture

```python
from cryptography.fernet import Fernet
from pathlib import Path
import json
import os

class SecureDataStorage:
    """Secure local data storage with encryption"""

    def __init__(self, storage_path: str, encryption_key: bytes = None):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)

        if encryption_key:
            self.cipher = Fernet(encryption_key)
        else:
            self.cipher = Fernet(self._generate_key())

    def _generate_key(self) -> bytes:
        """Generate encryption key for data storage"""
        key_file = self.storage_path / ".encryption_key"

        if key_file.exists():
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            with open(key_file, 'wb') as f:
                f.write(key)
            # Restrict file permissions
            os.chmod(key_file, 0o600)
            return key

    def encrypt_sensitive_data(self, data: Dict[str, Any]) -> str:
        """Encrypt sensitive configuration data"""
        json_data = json.dumps(data).encode()
        encrypted_data = self.cipher.encrypt(json_data)
        return encrypted_data.decode()

    def decrypt_sensitive_data(self, encrypted_data: str) -> Dict[str, Any]:
        """Decrypt sensitive configuration data"""
        encrypted_bytes = encrypted_data.encode()
        decrypted_data = self.cipher.decrypt(encrypted_bytes)
        return json.loads(decrypted_data.decode())

    def store_encrypted_config(self, filename: str, data: Dict[str, Any]):
        """Store encrypted configuration file"""
        encrypted_content = self.encrypt_sensitive_data(data)
        config_file = self.storage_path / filename

        with open(config_file, 'w') as f:
            f.write(encrypted_content)

        # Restrict file permissions
        os.chmod(config_file, 0o600)

    def load_encrypted_config(self, filename: str) -> Dict[str, Any]:
        """Load and decrypt configuration file"""
        config_file = self.storage_path / filename

        if not config_file.exists():
            return {}

        with open(config_file, 'r') as f:
            encrypted_content = f.read()

        return self.decrypt_sensitive_data(encrypted_content)
```

### Data Anonymization

```python
import hashlib
import re
from typing import Dict, Any, List

class DataAnonymizer:
    """Anonymize sensitive data before external processing"""

    def __init__(self):
        self.sensitive_patterns = [
            r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',  # Credit cards
            r'\b\d{3}-\d{2}-\d{4}\b',  # SSN
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
            r'\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # Phone
        ]

        self.replacement_cache = {}

    def anonymize_text(self, text: str) -> str:
        """Anonymize sensitive information in text"""
        anonymized_text = text

        # Anonymize common sensitive patterns
        for pattern in self.sensitive_patterns:
            anonymized_text = self._replace_sensitive_pattern(
                anonymized_text, pattern
            )

        # Anonymize potential PII using heuristic detection
        anonymized_text = self._anonymize_pii_heuristics(anonymized_text)

        return anonymized_text

    def _replace_sensitive_pattern(self, text: str, pattern: str) -> str:
        """Replace sensitive patterns with placeholders"""
        matches = re.finditer(pattern, text)
        for match in matches:
            original = match.group()
            placeholder = self._get_placeholder(original)
            text = text.replace(original, placeholder, 1)

        return text

    def _get_placeholder(self, sensitive_value: str) -> str:
        """Generate consistent placeholder for sensitive value"""
        if sensitive_value in self.replacement_cache:
            return self.replacement_cache[sensitive_value]

        # Generate hash-based placeholder
        hash_value = hashlib.sha256(sensitive_value.encode()).hexdigest()[:8]
        placeholder = f"[REDACTED-{hash_value}]"
        self.replacement_cache[sensitive_value] = placeholder

        return placeholder

    def _anonymize_pii_heuristics(self, text: str) -> str:
        """Anonymize potential PII using heuristics"""
        # Split text into words
        words = text.split()
        anonymized_words = []

        for word in words:
            # Check for potential names (capitalized words)
            if self._is_potential_name(word):
                anonymized_words.append(self._get_placeholder(word))
            # Check for potential addresses
            elif self._is_potential_address(word):
                anonymized_words.append(self._get_placeholder(word))
            else:
                anonymized_words.append(word)

        return ' '.join(anonymized_words)

    def _is_potential_name(self, word: str) -> bool:
        """Simple heuristic to detect potential names"""
        # Basic check: capitalized word, all letters, reasonable length
        return (
            word.istitle() and
            word.isalpha() and
            2 <= len(word) <= 20 and
            not word.upper() in ['AI', 'API', 'JSON', 'XML', 'HTML', 'CSS']
        )

    def _is_potential_address(self, word: str) -> bool:
        """Simple heuristic to detect potential addresses"""
        # Basic check for street names, numbers, etc.
        return (
            any(char.isdigit() for char in word) or
            word.lower() in ['street', 'avenue', 'road', 'drive', 'lane', 'boulevard']
        )

    def create_safe_for_external_processing(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a version of data safe for external AI processing"""
        safe_data = {}

        # Deep copy and anonymize all string values
        for key, value in data.items():
            if isinstance(value, str):
                safe_data[key] = self.anonymize_text(value)
            elif isinstance(value, list):
                safe_data[key] = [
                    self.anonymize_text(item) if isinstance(item, str) else item
                    for item in value
                ]
            elif isinstance(value, dict):
                safe_data[key] = self.create_safe_for_external_processing(value)
            else:
                safe_data[key] = value

        return safe_data
```

## API Security

### Secure API Key Management

```python
import keyring
from typing import Optional, Dict, Any
import os

class SecureAPIKeyManager:
    """Secure storage and management of API keys"""

    def __init__(self, service_name: str = "learning-catalyst"):
        self.service_name = service_name

    def store_api_key(self, provider: str, api_key: str) -> bool:
        """Securely store API key using system keyring"""
        try:
            keyring.set_password(self.service_name, provider, api_key)
            return True
        except Exception as e:
            print(f"Failed to store API key for {provider}: {e}")
            return False

    def retrieve_api_key(self, provider: str) -> Optional[str]:
        """Retrieve API key from secure storage"""
        try:
            return keyring.get_password(self.service_name, provider)
        except Exception as e:
            print(f"Failed to retrieve API key for {provider}: {e}")
            return None

    def delete_api_key(self, provider: str) -> bool:
        """Delete API key from secure storage"""
        try:
            keyring.delete_password(self.service_name, provider)
            return True
        except Exception as e:
            print(f"Failed to delete API key for {provider}: {e}")
            return False

    def list_stored_providers(self) -> List[str]:
        """List all providers with stored API keys"""
        # This is provider-dependent as keyring doesn't support listing
        # Implementation depends on the specific keyring backend
        return []

    def validate_api_key_format(self, provider: str, api_key: str) -> bool:
        """Validate API key format before storage"""
        format_patterns = {
            'openai': r'^sk-[A-Za-z0-9]{48}$',
            'anthropic': r'^sk-ant-[A-Za-z0-9_-]{95}$',
            'deepseek': r'^sk-[A-Za-z0-9]{48}$',
            'siliconflow': r'^sk-[A-Za-z0-9]{48}$',
            'chatglm': r'^[A-Za-z0-9]{32,}$'
        }

        pattern = format_patterns.get(provider.lower())
        if pattern:
            return bool(re.match(pattern, api_key))

        # If no specific pattern, do basic validation
        return len(api_key) >= 20 and api_key.isalnum()

    def rotate_api_key(self, provider: str, new_api_key: str) -> bool:
        """Rotate API key securely"""
        if not self.validate_api_key_format(provider, new_api_key):
            return False

        # Store new key
        if self.store_api_key(provider, new_api_key):
            # Test new key before removing old one
            if self._test_api_key(provider, new_api_key):
                return True
            else:
                # Remove invalid key
                self.delete_api_key(provider)
                return False

        return False

    def _test_api_key(self, provider: str, api_key: str) -> bool:
        """Test if API key is valid"""
        # This would integrate with the actual provider testing
        # For now, just validate format
        return self.validate_api_key_format(provider, api_key)
```

### API Communication Security

```python
import aiohttp
import ssl
from typing import Dict, Any, Optional
import certifi

class SecureAPIClient:
    """Secure API client with proper security measures"""

    def __init__(self, base_url: str, timeout: int = 30):
        self.base_url = base_url
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.session = None

    async def __aenter__(self):
        """Async context manager entry"""
        # Create SSL context with certificate verification
        ssl_context = ssl.create_default_context(cafile=certifi.where())

        # Configure connector with security settings
        connector = aiohttp.TCPConnector(
            ssl=ssl_context,
            limit_per_host=10,  # Connection pooling
            enable_cleanup_closed=True
        )

        # Create session with security headers
        headers = {
            'User-Agent': 'Learning-Catalyst/1.0',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
        }

        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=self.timeout,
            headers=headers
        )

        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()

    async def make_secure_request(
        self,
        method: str,
        endpoint: str,
        headers: Optional[Dict[str, str]] = None,
        data: Optional[Dict[str, Any]] = None,
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Make secure API request"""
        if not self.session:
            raise RuntimeError("Session not initialized. Use async context manager.")

        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"

        # Prepare secure headers
        secure_headers = {}
        if headers:
            secure_headers.update(headers)

        if api_key:
            secure_headers['Authorization'] = f'Bearer {api_key}'

        try:
            async with self.session.request(
                method=method.upper(),
                url=url,
                headers=secure_headers,
                json=data
            ) as response:

                # Check for security issues in response
                self._check_response_security(response)

                if response.status == 200:
                    return await response.json()
                else:
                    error_data = await response.text()
                    raise APIError(
                        f"API request failed: {response.status}",
                        status_code=response.status,
                        response_text=error_data
                    )

        except aiohttp.ClientError as e:
            raise APIError(f"Network error: {e}")

    def _check_response_security(self, response: aiohttp.ClientResponse):
        """Check response for security issues"""
        # Check for security headers
        security_headers = [
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection',
            'strict-transport-security'
        ]

        missing_headers = [
            header for header in security_headers
            if header not in response.headers
        ]

        if missing_headers:
            # Log warning but don't fail (not all APIs implement these)
            print(f"Warning: Missing security headers: {missing_headers}")

        # Check content type
        content_type = response.headers.get('content-type', '')
        if 'application/json' not in content_type:
            print(f"Warning: Unexpected content type: {content_type}")

class APIError(Exception):
    """API error with security context"""
    def __init__(self, message: str, status_code: int = None, response_text: str = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_text = response_text
```

## Access Control and Permissions

### File System Security

```python
import os
import stat
from pathlib import Path
from typing import List

class SecureFileSystem:
    """Secure file system operations with proper permissions"""

    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        self._secure_base_directory()

    def _secure_base_directory(self):
        """Secure base directory with proper permissions"""
        # Set directory permissions to owner only
        os.chmod(self.base_path, 0o700)

        # Create .gitignore to prevent accidental commits
        gitignore_path = self.base_path / ".gitignore"
        if not gitignore_path.exists():
            with open(gitignore_path, 'w') as f:
                f.write("# Security: Ignore all configuration files\n")
                f.write("*\n")
            os.chmod(gitignore_path, 0o600)

    def secure_write_file(self, filename: str, content: str, sensitive: bool = True):
        """Write file with secure permissions"""
        file_path = self.base_path / filename

        with open(file_path, 'w') as f:
            f.write(content)

        # Set secure permissions
        if sensitive:
            os.chmod(file_path, 0o600)  # Owner read/write only
        else:
            os.chmod(file_path, 0o644)  # Owner read/write, group/others read

    def secure_read_file(self, filename: str) -> str:
        """Read file with security checks"""
        file_path = self.base_path / filename

        # Check file permissions
        if not self._check_file_permissions(file_path):
            raise SecurityError(f"Insecure file permissions: {filename}")

        with open(file_path, 'r') as f:
            return f.read()

    def _check_file_permissions(self, file_path: Path) -> bool:
        """Check if file has secure permissions"""
        if not file_path.exists():
            return True

        file_stat = file_path.stat()
        permissions = stat.filemode(file_stat.st_mode)

        # Check if file is accessible by others
        if permissions[-3:] != '---':  # Last three characters for others
            print(f"Warning: File {file_path} is accessible by others")

        return True

    def list_files(self, pattern: str = "*") -> List[str]:
        """List files with security filtering"""
        files = []
        for file_path in self.base_path.glob(pattern):
            if file_path.is_file() and self._check_file_permissions(file_path):
                files.append(file_path.name)
        return files

    def delete_file(self, filename: str) -> bool:
        """Securely delete file"""
        file_path = self.base_path / filename

        if file_path.exists():
            file_path.unlink()
            return True
        return False

class SecurityError(Exception):
    """Security-related error"""
    pass
```

## Input Validation and Sanitization

### Input Security Manager

```python
import re
import html
from typing import Dict, Any, List, Optional

class InputSecurityManager:
    """Validate and sanitize user inputs"""

    def __init__(self):
        # Dangerous patterns to block
        self.dangerous_patterns = [
            r'<script[^>]*>.*?</script>',  # Script tags
            r'javascript:',  # JavaScript URLs
            r'on\w+\s*=',  # Event handlers
            r'<iframe[^>]*>',  # Iframes
            r'<object[^>]*>',  # Objects
            r'<embed[^>]*>',  # Embeds
            r'<link[^>]*>',  # Links
            r'<meta[^>]*>',  # Meta tags
        ]

        # Allowed HTML tags (if any)
        self.allowed_tags = {
            'b', 'i', 'u', 'em', 'strong', 'code', 'pre'
        }

    def sanitize_input(self, input_text: str, allow_html: bool = False) -> str:
        """Sanitize user input to prevent XSS and injection attacks"""
        if not input_text:
            return ""

        # Remove null bytes
        sanitized = input_text.replace('\x00', '')

        # Remove dangerous patterns
        for pattern in self.dangerous_patterns:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE | re.DOTALL)

        if allow_html:
            # Sanitize HTML while allowing safe tags
            sanitized = self._sanitize_html(sanitized)
        else:
            # Escape all HTML
            sanitized = html.escape(sanitized)

        # Remove excessive whitespace
        sanitized = re.sub(r'\s+', ' ', sanitized).strip()

        # Limit length
        max_length = 10000  # Configure as needed
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length] + "..."

        return sanitized

    def _sanitize_html(self, html_text: str) -> str:
        """Sanitize HTML while allowing certain safe tags"""
        # Simple HTML sanitizer - in production, use a proper library like bleach
        import re

        # Remove dangerous attributes
        html_text = re.sub(r'\s*on\w+\s*=\s*["\'][^"\']*["\']', '', html_text, flags=re.IGNORECASE)
        html_text = re.sub(r'\s*href\s*=\s*["\']javascript:[^"\']*["\']', '', html_text, flags=re.IGNORECASE)

        # Remove disallowed tags
        disallowed_tags = re.compile(r'<(?!\/?(' + '|'.join(self.allowed_tags) + r'))\b[^>]*>', re.IGNORECASE)
        html_text = disallowed_tags.sub('', html_text)

        return html_text

    def validate_command_input(self, command: str, args: List[str]) -> bool:
        """Validate command input for security"""
        # Check command name
        if not self._is_safe_command_name(command):
            return False

        # Validate arguments
        for arg in args:
            if not self._is_safe_argument(arg):
                return False

        return True

    def _is_safe_command_name(self, command: str) -> bool:
        """Check if command name is safe"""
        # Only allow alphanumeric, hyphens, and underscores
        return bool(re.match(r'^[a-zA-Z0-9_-]+$', command))

    def _is_safe_argument(self, arg: str) -> bool:
        """Check if argument is safe"""
        # Check for dangerous patterns
        for pattern in self.dangerous_patterns:
            if re.search(pattern, arg, re.IGNORECASE):
                return False

        # Check for path traversal attempts
        if '..' in arg or arg.startswith('/'):
            return False

        # Check for command injection
        dangerous_commands = ['rm', 'del', 'format', 'exec', 'eval', 'system']
        for cmd in dangerous_commands:
            if cmd in arg.lower():
                return False

        return True

    def validate_file_path(self, file_path: str, base_path: str = None) -> bool:
        """Validate file path to prevent directory traversal"""
        if base_path:
            # Resolve relative to base path
            full_path = Path(base_path) / file_path
            try:
                full_path = full_path.resolve()
                base_resolved = Path(base_path).resolve()

                # Check if path is within base directory
                if not str(full_path).startswith(str(base_resolved)):
                    return False
            except (OSError, ValueError):
                return False

        # Check for dangerous patterns
        dangerous_patterns = ['..', '~/', '/etc/', '/var/', '/sys/', '/proc/']
        for pattern in dangerous_patterns:
            if pattern in file_path:
                return False

        return True

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal"""
        # Remove dangerous characters
        sanitized = re.sub(r'[<>:"/\\|?*]', '', filename)

        # Remove control characters
        sanitized = re.sub(r'[\x00-\x1f\x7f]', '', sanitized)

        # Limit length
        max_length = 255
        if len(sanitized) > max_length:
            name, ext = os.path.splitext(sanitized)
            sanitized = name[:max_length - len(ext)] + ext

        # Prevent hidden files
        if sanitized.startswith('.'):
            sanitized = '_' + sanitized[1:]

        return sanitized or 'unnamed_file'
```

## Audit Logging and Monitoring

### Security Audit Logger

```python
import logging
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

class SecurityAuditLogger:
    """Security-focused audit logging system"""

    def __init__(self, log_path: str):
        self.log_path = Path(log_path)
        self.log_path.mkdir(parents=True, exist_ok=True)

        # Configure secure logger
        self.logger = logging.getLogger('security_audit')
        self.logger.setLevel(logging.INFO)

        # Create file handler with secure permissions
        handler = logging.FileHandler(self.log_path / 'security_audit.log')
        handler.setLevel(logging.INFO)

        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)

        self.logger.addHandler(handler)

        # Set secure file permissions
        os.chmod(self.log_path / 'security_audit.log', 0o600)

    def log_api_key_usage(self, provider: str, success: bool, error: str = None):
        """Log API key usage attempts"""
        event = {
            'event_type': 'api_key_usage',
            'provider': provider,
            'success': success,
            'timestamp': datetime.now().isoformat(),
            'error': error
        }

        if success:
            self.logger.info(f"API key used successfully: {provider}")
        else:
            self.logger.warning(f"API key usage failed: {provider} - {error}")

        self._store_audit_event(event)

    def log_file_access(self, file_path: str, operation: str, success: bool):
        """Log file access attempts"""
        event = {
            'event_type': 'file_access',
            'file_path': file_path,
            'operation': operation,  # read, write, delete
            'success': success,
            'timestamp': datetime.now().isoformat()
        }

        self.logger.info(f"File access: {operation} on {file_path} - {'Success' if success else 'Failed'}")
        self._store_audit_event(event)

    def log_configuration_change(self, setting: str, old_value: Any, new_value: Any):
        """Log configuration changes"""
        event = {
            'event_type': 'config_change',
            'setting': setting,
            'old_value': str(old_value),
            'new_value': str(new_value),
            'timestamp': datetime.now().isoformat()
        }

        self.logger.info(f"Configuration changed: {setting} from {old_value} to {new_value}")
        self._store_audit_event(event)

    def log_security_violation(self, violation_type: str, details: Dict[str, Any]):
        """Log security violations"""
        event = {
            'event_type': 'security_violation',
            'violation_type': violation_type,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }

        self.logger.error(f"Security violation: {violation_type} - {details}")
        self._store_audit_event(event)

    def log_data_export(self, data_type: str, record_count: int, success: bool):
        """Log data export attempts"""
        event = {
            'event_type': 'data_export',
            'data_type': data_type,
            'record_count': record_count,
            'success': success,
            'timestamp': datetime.now().isoformat()
        }

        self.logger.info(f"Data export: {data_type} ({record_count} records) - {'Success' if success else 'Failed'}")
        self._store_audit_event(event)

    def _store_audit_event(self, event: Dict[str, Any]):
        """Store audit event in structured format"""
        audit_file = self.log_path / f"audit_{datetime.now().strftime('%Y%m%d')}.json"

        events = []
        if audit_file.exists():
            try:
                with open(audit_file, 'r') as f:
                    events = json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                events = []

        events.append(event)

        # Keep only last 1000 events per day to prevent log bloat
        if len(events) > 1000:
            events = events[-1000:]

        with open(audit_file, 'w') as f:
            json.dump(events, f, indent=2)

        # Secure file permissions
        os.chmod(audit_file, 0o600)

    def generate_security_report(self, days: int = 7) -> Dict[str, Any]:
        """Generate security report for the last N days"""
        report = {
            'period_days': days,
            'generated_at': datetime.now().isoformat(),
            'events': {}
        }

        # Collect events from audit files
        for i in range(days):
            date = datetime.now() - timedelta(days=i)
            audit_file = self.log_path / f"audit_{date.strftime('%Y%m%d')}.json"

            if audit_file.exists():
                try:
                    with open(audit_file, 'r') as f:
                        day_events = json.load(f)

                    for event in day_events:
                        event_type = event['event_type']
                        if event_type not in report['events']:
                            report['events'][event_type] = []
                        report['events'][event_type].append(event)

                except (json.JSONDecodeError, FileNotFoundError):
                    continue

        return report
```

## Threat Detection and Mitigation

### Threat Detection System

```python
import time
from collections import defaultdict, deque
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

@dataclass
class ThreatEvent:
    event_type: str
    severity: str  # low, medium, high, critical
    description: str
    timestamp: float
    source_ip: Optional[str] = None
    user_id: Optional[str] = None
    details: Dict[str, Any] = None

class ThreatDetectionSystem:
    """Detect and mitigate security threats"""

    def __init__(self, audit_logger: SecurityAuditLogger):
        self.audit_logger = audit_logger
        self.recent_events = deque(maxlen=1000)  # Keep recent events
        self.rate_limits = defaultdict(lambda: deque(maxlen=100))
        self.suspicious_patterns = []

    def detect_anomalies(self, event: ThreatEvent) -> List[str]:
        """Detect security anomalies in events"""
        threats = []

        # Check for rate limit violations
        if self._check_rate_limit_violation(event):
            threats.append("Rate limit violation detected")

        # Check for suspicious patterns
        if self._check_suspicious_patterns(event):
            threats.append("Suspicious activity pattern detected")

        # Check for authentication failures
        if event.event_type == "authentication_failure":
            if self._check_brute_force_attack(event):
                threats.append("Potential brute force attack")

        # Check for data access anomalies
        if event.event_type == "file_access":
            if self._check_unusual_data_access(event):
                threats.append("Unusual data access pattern")

        # Check for configuration changes
        if event.event_type == "config_change":
            if self._check_suspicious_config_changes(event):
                threats.append("Suspicious configuration changes")

        return threats

    def _check_rate_limit_violation(self, event: ThreatEvent) -> bool:
        """Check if event exceeds rate limits"""
        key = f"{event.user_id}:{event.event_type}"
        current_time = time.time()
        rate_window = 300  # 5 minutes
        max_requests = 100  # Max requests per window

        # Remove old events
        while (self.rate_limits[key] and
               current_time - self.rate_limits[key][0] > rate_window):
            self.rate_limits[key].popleft()

        # Add current event
        self.rate_limits[key].append(current_time)

        # Check if limit exceeded
        return len(self.rate_limits[key]) > max_requests

    def _check_suspicious_patterns(self, event: ThreatEvent) -> bool:
        """Check for suspicious activity patterns"""
        # Add event to recent events
        self.recent_events.append(event)

        # Pattern 1: Multiple failed authentications followed by success
        if event.event_type == "authentication_success":
            recent_failures = [
                e for e in list(self.recent_events)[-10:]
                if (e.event_type == "authentication_failure" and
                    e.user_id == event.user_id and
                    event.timestamp - e.timestamp < 300)  # 5 minutes
            ]

            if len(recent_failures) >= 5:
                return True

        # Pattern 2: Rapid configuration changes
        if event.event_type == "config_change":
            recent_changes = [
                e for e in list(self.recent_events)[-10:]
                if (e.event_type == "config_change" and
                    e.user_id == event.user_id and
                    event.timestamp - e.timestamp < 60)  # 1 minute
            ]

            if len(recent_changes) >= 3:
                return True

        # Pattern 3: Unusual file access patterns
        if event.event_type == "file_access":
            recent_access = [
                e for e in list(self.recent_events)[-20:]
                if (e.event_type == "file_access" and
                    e.user_id == event.user_id and
                    event.timestamp - e.timestamp < 600)  # 10 minutes
            ]

            # Check for accessing many different files quickly
            unique_files = set(e.details.get('file_path', '') for e in recent_access)
            if len(unique_files) >= 10:
                return True

        return False

    def _check_brute_force_attack(self, event: ThreatEvent) -> bool:
        """Check for potential brute force attack"""
        if not event.user_id:
            return False

        recent_failures = [
            e for e in list(self.recent_events)[-20:]
            if (e.event_type == "authentication_failure" and
                e.user_id == event.user_id and
                event.timestamp - e.timestamp < 1800)  # 30 minutes
        ]

        return len(recent_failures) >= 10

    def _check_unusual_data_access(self, event: ThreatEvent) -> bool:
        """Check for unusual data access patterns"""
        if event.event_type != "file_access" or not event.success:
            return False

        # Check for access to sensitive files
        sensitive_files = [
            'config', 'api_keys', 'tokens', 'database', 'secrets'
        ]

        file_path = event.details.get('file_path', '').lower()
        if any(sensitive in file_path for sensitive in sensitive_files):
            # Check if this is unusual for the user
            user_historical_access = [
                e for e in list(self.recent_events)[-50:]
                if (e.event_type == "file_access" and
                    e.user_id == event.user_id and
                    e.timestamp - event.timestamp < 86400)  # 24 hours
            ]

            sensitive_access_count = sum(
                1 for e in user_historical_access
                if any(sensitive in e.details.get('file_path', '').lower()
                       for sensitive in sensitive_files)
            )

            # If this is one of the first few sensitive file accesses
            return sensitive_access_count <= 2

        return False

    def _check_suspicious_config_changes(self, event: ThreatEvent) -> bool:
        """Check for suspicious configuration changes"""
        # Check for changes to security-sensitive settings
        security_settings = [
            'api_key', 'provider', 'encryption_key', 'permissions', 'firewall'
        ]

        setting = event.details.get('setting', '').lower()
        if any(security in setting for security in security_settings):
            # Check if this is a new user or unusual timing
            user_historical_changes = [
                e for e in list(self.recent_events)[-20:]
                if (e.event_type == "config_change" and
                    e.user_id == event.user_id and
                    event.timestamp - e.timestamp < 86400)  # 24 hours
            ]

            return len(user_historical_changes) <= 1

        return False

    def handle_threat(self, threat: str, event: ThreatEvent):
        """Handle detected threats"""
        # Log threat
        self.audit_logger.log_security_violation(threat, {
            'event_type': event.event_type,
            'user_id': event.user_id,
            'timestamp': event.timestamp,
            'details': event.details or {}
        })

        # Take action based on threat severity
        if "brute force" in threat.lower():
            self._handle_brute_force_threat(event)
        elif "rate limit" in threat.lower():
            self._handle_rate_limit_threat(event)
        elif "suspicious" in threat.lower():
            self._handle_suspicious_activity_threat(event)

    def _handle_brute_force_threat(self, event: ThreatEvent):
        """Handle brute force attack"""
        if event.user_id:
            # Implement temporary lockout
            print(f"⚠️ Security: Temporary lockout for user {event.user_id} due to brute force attempt")

    def _handle_rate_limit_threat(self, event: ThreatEvent):
        """Handle rate limit violations"""
        if event.user_id:
            # Implement throttling
            print(f"⚠️ Security: Rate limiting activated for user {event.user_id}")

    def _handle_suspicious_activity_threat(self, event: ThreatEvent):
        """Handle suspicious activity"""
        if event.user_id:
            # Log for manual review
            print(f"⚠️ Security: Suspicious activity detected for user {event.user_id}")
```

## Troubleshooting Security Issues

### Common Security Problems

#### Issue: Insecure File Permissions
```bash
# Symptom: Files accessible by other users
$> ls -la ~/.learning-catalyst/config.toml
-rw-r--r-- 1 user user 1234 Oct 8 10:30 config.toml

# Solution: Fix file permissions
$> chmod 600 ~/.learning-catalyst/config.toml
$> chmod 700 ~/.learning-catalyst/

# Verify security
$> ls -la ~/.learning-catalyst/
drwx------ 1 user user 4096 Oct 8 10:30 .
drwx------ 1 user user 4096 Oct 8 10:30 config.toml
```

#### Issue: API Key Exposure
```bash
# Symptom: API keys in configuration files or logs
$> grep -r "sk-" ~/.learning-catalyst/
config.toml:api_key = "sk-xxxxxxxxxxxxxxxxxxxxxxxx"

# Solution: Use secure key storage
Learning Catalyst > /config secure migrate
✓ Migrating API keys to secure storage...
✓ API keys removed from configuration files
✓ Keys now stored in system keyring

# Verify migration
Learning Catalyst > /config status
✓ All API keys stored securely
```

#### Issue: Suspicious Activity Detected
```bash
# Symptom: Security warnings in logs
Learning Catalyst > /security audit report
⚠️ Security violations detected:
  - Rate limit violations: 3
  - Suspicious configuration changes: 1
  - Unusual data access: 2

# Solution: Review and secure account
Learning Catalyst > /security investigate
🔍 Investigating security events...
  - User: test@example.com
  - Activity: Multiple failed API key attempts
  - Recommendation: Change API keys and review access logs

# Reset compromised keys
Learning Catalyst > /config rotate-all-keys
✓ All API keys rotated successfully
```

## Security Best Practices

### User Security Guidelines

1. **API Key Management**
   - Never share API keys
   - Use different keys for different environments
   - Rotate keys regularly
   - Monitor usage for unusual activity

2. **File System Security**
   - Ensure configuration directory has proper permissions (700)
   - Never commit API keys to version control
   - Use .gitignore to exclude sensitive files
   - Regularly review file permissions

3. **Network Security**
   - Use HTTPS for all API communications
   - Verify SSL certificates
   - Use VPN when on untrusted networks
   - Monitor for unusual network activity

4. **Data Protection**
   - Enable local encryption when available
   - Regular backup of configuration (securely)
   - Review audit logs periodically
   - Use strong, unique passwords

### Developer Security Guidelines

1. **Input Validation**
   - Validate all user inputs
   - Sanitize data before processing
   - Implement proper error handling
   - Use parameterized queries

2. **Secure Coding Practices**
   - Follow OWASP guidelines
   - Implement proper authentication
   - Use secure communication protocols
   - Regular security reviews

3. **Testing and Monitoring**
   - Include security testing in CI/CD
   - Monitor for security events
   - Regular penetration testing
   - Keep dependencies updated

## Related Documentation

- **[CLI Architecture](cli-architecture.md)**: Command-line interface design
- **[Data Layer Architecture](data-layer.md)**: Data storage and management
- **[AI Integration Architecture](ai-integration.md)**: AI provider integration
- **[Performance Optimization](../performance-optimization/)**: Performance tuning strategies

---

*Last updated: October 8, 2025*
*Version: 1.0.0*
*Category: System Architecture*