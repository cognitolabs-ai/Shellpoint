# Changelog

All notable changes to ShellPoint will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-10-13

### Added
- **Code Snippets Feature**
  - Save, manage, and execute reusable code snippets and scripts
  - Full CRUD operations (Create, Read, Update, Delete)
  - Snippet fields: name, content, description (optional), language (optional)
  - Copy to clipboard functionality
  - Snippet library modal with search and organization
  - Real-time execution in any terminal tab via play button
  - Smart filtering: Bash/Shell filter (default) and All snippets view
  - Material Design UI with smooth animations

- **Split Screen Mode**
  - View and work with multiple terminals simultaneously
  - Automatic layout selection based on active connection count:
    - 2 terminals: Top-bottom horizontal split
    - 4 terminals: 2×2 grid layout
  - Smart tab selection using activity tracking (last active tabs)
  - Draggable separators for custom terminal sizing
    - 2 terminals: Horizontal separator
    - 4 terminals: Crosshair separator (H+V linked)
    - 20-80% movement constraint to prevent unusable sizes
  - Active terminal visual highlighting with border
  - Grid icon button (auto-shows when ≥2 tabs)
  - Tab switching within split mode (replaces top terminal)
  - Auto-exit when closing displayed tabs
  - Full window resize support for all visible terminals

- **Terminal Tab Enhancements**
  - Play button on each tab for quick snippet execution
  - Activity order tracking for intelligent tab management
  - Improved tab switching behavior in split mode

- **API Endpoints**
  - GET `/api/snippets` - List all code snippets
  - POST `/api/snippets` - Create new snippet
  - PUT `/api/snippets/:id` - Update snippet
  - DELETE `/api/snippets/:id` - Delete snippet

- **Database Schema**
  - New `code_snippets` table with user relationships
  - Fields: id, user_id, name, content, description, language, timestamps
  - Foreign key constraints with cascade delete

### Changed
- Enhanced API documentation with Code Snippets endpoints and UI Features section
- Updated terminal resize handler to support split screen mode
- Improved tab management with activity tracking
- Tab UI now includes snippet execution button

### Fixed
- Terminal resize issues in split screen layouts
- Tab close behavior when in split mode
- Icon visibility logic for split mode button

### UI/UX Improvements
- Snippet dropdown with Material Design
- Filter buttons for snippet selection
- Visual feedback for active terminals in split mode
- Smooth transitions for split mode activation/deactivation
- Keyboard shortcuts (ESC to close dropdowns)
- Click-outside handling for better UX

## [1.1.0] - 2025-10-13

### Added
- **Comprehensive Documentation Suite**
  - Complete REST API reference with all endpoints, parameters, and examples (docs/API.md)
  - Technical architecture documentation with system design and diagrams (docs/ARCHITECTURE.md)
  - Production deployment guide for Docker, Kubernetes, and Cloud platforms (docs/DEPLOYMENT.md)
  - Security policy with vulnerability reporting and best practices (docs/SECURITY.md)
  - Contributing guidelines with coding standards and commit conventions (docs/CONTRIBUTING.md)
  - Documentation index and navigation (docs/README.md)

- **GitHub Repository Templates**
  - Bug report template for standardized issue reporting
  - Feature request template for suggesting new functionality
  - Pull request template with comprehensive checklist

- **Developer Resources**
  - API documentation with WebSocket protocol specifications
  - Deployment examples for AWS, GCP, Azure, DigitalOcean
  - Reverse proxy configurations for Nginx, Caddy, Traefik
  - Security hardening guidelines and examples
  - Database backup and restore procedures
  - Monitoring and troubleshooting guides

### Changed
- Updated .gitignore to exclude .claude/ development folder
- Enhanced project documentation structure for better discoverability

### Documentation
This release focuses on making ShellPoint production-ready with comprehensive documentation covering:
- Complete API reference (REST + WebSocket)
- System architecture and design patterns
- Multi-platform deployment strategies
- Security best practices and compliance
- Contributing workflow and code standards
- Over 3000 lines of professional documentation

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

### Version 1.2.0 - Productivity Features Release

ShellPoint 1.2.0 introduces powerful productivity features that enhance workflow efficiency:

- **Code Snippets Management**: Save, organize, and execute reusable scripts and commands directly in terminals. Perfect for repetitive tasks, complex commands, and deployment scripts.

- **Split Screen Mode**: Work with multiple SSH sessions simultaneously in a split-screen layout. Automatic intelligent layout selection (2 or 4 terminals) with draggable separators for customization.

- **Enhanced Terminal Experience**: Quick snippet execution via play button on each tab, smart tab management with activity tracking, and seamless split-mode integration.

This release focuses on developer productivity, enabling faster workflows and better multitasking capabilities for DevOps professionals and system administrators.

**Key Highlights:**
- ~780 lines of new code across frontend and backend
- 4 new REST API endpoints for snippet management
- Real-time snippet execution in terminals
- Intelligent split-screen layouts with draggable separators
- Material Design UI components with smooth animations

**Docker Image:** `ghcr.io/cognitiolabs/shellpoint:1.2.0`

### Version 1.1.0 - Documentation Release

ShellPoint 1.1.0 focuses on providing comprehensive, production-ready documentation. This release includes:

- **Complete API Documentation**: REST endpoints and WebSocket protocol with examples
- **Architecture Guide**: Technical deep-dive into system design and technology stack
- **Deployment Documentation**: Docker, Kubernetes, and cloud platform guides
- **Security Policy**: Vulnerability reporting and security best practices
- **Contributing Guidelines**: Development setup, coding standards, and workflow
- **GitHub Templates**: Standardized templates for issues and pull requests

**Docker Image:** `ghcr.io/cognitiolabs/shellpoint:1.1.0`

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
