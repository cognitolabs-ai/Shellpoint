# Changelog

All notable changes to ShellPoint will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-10

### Added
- **Core Features**
  - JWT-based authentication system with bcrypt password hashing
  - User registration and login functionality
  - SSH key authentication support (RSA, ED25519, ECDSA)
  - Multiple SSH session tabs support
  - Real-time terminal streaming via WebSocket
  - Terminal resize support with automatic fitting

- **Connection Management**
  - SSH connection profiles with descriptions
  - Password and SSH key authentication methods
  - Connection CRUD operations (Create, Read, Update, Delete)
  - Visual connection cards with color coding
  - Active connection status indicators
  - Material Design icons for better UX

- **SSH Keys Vault**
  - Secure SSH private key storage
  - Support for encrypted keys with passphrases
  - File upload for SSH keys
  - Key usage tracking
  - Multiple key types support (RSA, ED25519, ECDSA)

- **User Profile Management**
  - Username and email configuration
  - Password change functionality
  - Terminal theme preferences (8 themes)
  - Profile persistence across sessions

- **Terminal Themes**
  - Default theme
  - Dracula
  - Monokai
  - Nord
  - One Dark
  - Solarized Dark
  - Gruvbox Dark
  - Tokyo Night

- **UI/UX Improvements**
  - Modern, responsive interface with Tailwind CSS
  - Material Design icon system
  - Smooth animations and transitions
  - Modal dialogs for forms
  - Connection cards with vibrant color schemes
  - Tab-based terminal sessions
  - Status bar with connection states

- **Security Features**
  - JWT tokens stored in httpOnly cookies
  - Secure cookie flags (secure, sameSite: strict)
  - Password strength validation (min 8 chars, letter + number)
  - Port range validation (1-65535)
  - Host format validation
  - Input sanitization
  - Environment-based JWT secret

- **Database**
  - SQLite database for data persistence
  - Automatic migrations for schema updates
  - Users, SSH keys, and connections tables
  - Foreign key relationships
  - Automatic theme column migration

- **DevOps & Deployment**
  - Docker support with multi-stage builds
  - docker-compose configuration
  - Health checks for containers
  - GitHub Actions CI/CD workflow
  - Automated Docker image builds
  - Release automation with tags
  - Cross-platform Docker images (amd64, arm64)

- **Documentation**
  - Comprehensive README with setup instructions
  - Docker deployment guide
  - Security best practices
  - Development guidelines
  - API documentation in knowledge base
  - Troubleshooting section

- **Developer Experience**
  - Hot reload support in development mode
  - Environment variable configuration
  - .env.example template
  - Structured project layout
  - Code comments and documentation
  - Knowledge base for development

### Changed
- **Branding**
  - Application branded for CognitioLabs
  - Professional UI redesign
  - Updated package.json with company info
  - Added company footer and credits

- **Icons**
  - Replaced emoji icons with Material Design icons
  - Consistent icon system throughout app
  - Better visual hierarchy

- **Colors**
  - Vibrant color palette for connection cards
  - Improved visual contrast
  - Professional blue theme

### Fixed
- Duplicate `showAuthError()` function removed
- Status bar selector issues resolved
- Modal close animation consistency
- README port documentation (3000 → 8080)
- Error handling in all API endpoints
- Fetch error handling with try-catch blocks
- WebSocket error state checking
- SIGINT handler for graceful shutdown
- Database migration for theme column
- Password update logic improvements

### Security
- Added JWT_SECRET environment variable requirement
- Implemented secure cookie settings
- Added input validation across the application
- Password strength enforcement
- Fatal error on missing JWT_SECRET
- Documented security considerations

### Infrastructure
- Created Dockerfile with Alpine Linux base
- Multi-stage Docker build for optimization
- Health check configuration
- Volume support for data persistence
- Non-root user in container
- Tini init system for proper signal handling
- .dockerignore for optimized builds

## [Unreleased]

### Planned Features
- SFTP file transfer support
- SSH port forwarding (local and remote)
- Command history and autocomplete
- Connection grouping and organization
- Connection search and filtering
- Import/export connection profiles
- Database encryption for secrets
- Two-factor authentication (2FA)
- Session recording and playback
- Custom terminal fonts
- Terminal splitting
- Multiple user support with admin panel
- LDAP/OAuth authentication
- Audit logging
- API rate limiting
- WebSocket compression

---

## Release Notes

### Version 1.0.0 - Initial Release

ShellPoint 1.0.0 is the first stable release, providing a professional web-based SSH client with modern features and security practices. Built by CognitioLabs, this release includes:

- Complete SSH client functionality with both password and key authentication
- Modern, responsive UI with Material Design
- Multi-session tab support for concurrent connections
- Secure authentication and session management
- Docker-ready deployment
- Comprehensive documentation

**Docker Image:** `ghcr.io/cognitiolabs/shellpoint:1.0.0`

---

*For more information, visit [https://cognitiolabs.eu](https://cognitiolabs.eu)*
