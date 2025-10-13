# Contributing to ShellPoint

Thank you for your interest in contributing to ShellPoint! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and professional in all interactions.

### Expected Behavior

- Be respectful and considerate
- Use welcoming and inclusive language
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

---

## How Can I Contribute?

### Reporting Bugs

Before submitting a bug report:
1. Check the [existing issues](https://github.com/cognitiolabs/shellpoint/issues)
2. Try the latest version to see if the issue persists
3. Collect information about your environment

**Good Bug Report Includes:**
- Clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots (if applicable)
- Environment details (OS, Node.js version, Docker version)
- Error messages and logs

**Bug Report Template:**
```markdown
**Description:**
[Clear description of the bug]

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Environment:**
- OS: [e.g., Ubuntu 22.04]
- Node.js: [e.g., 20.10.0]
- ShellPoint Version: [e.g., 1.0.0]
- Deployment: [Docker/Native/Cloud]

**Logs:**
```
[Paste relevant logs here]
```

**Screenshots:**
[If applicable]
```

### Suggesting Features

We love feature suggestions! Please:

1. Check if the feature is already requested
2. Clearly describe the feature and its benefits
3. Provide use cases and examples
4. Consider implementation complexity

**Feature Request Template:**
```markdown
**Feature Description:**
[Clear description of the proposed feature]

**Use Case:**
[Why is this feature needed? What problem does it solve?]

**Proposed Solution:**
[How do you envision this working?]

**Alternatives Considered:**
[What other solutions did you consider?]

**Additional Context:**
[Any other context, screenshots, or examples]
```

### Code Contributions

We welcome code contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## Development Setup

### Prerequisites

- Node.js >= 20.x
- npm >= 9.x
- Git
- Docker (optional, for container testing)

### Local Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR-USERNAME/shellpoint.git
cd shellpoint

# 2. Add upstream remote
git remote add upstream https://github.com/cognitiolabs/shellpoint.git

# 3. Install dependencies
npm install

# 4. Create environment file
cp .env.example .env

# 5. Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" > .jwt_secret
# Copy output to .env as JWT_SECRET

# 6. Start development server
npm run dev
```

### Project Structure

```
shellpoint/
├── server.js              # Backend server (Express + WebSocket + SSH)
├── public/
│   ├── index.html        # Frontend UI
│   ├── app.js            # Client-side JavaScript
│   └── style.css         # Additional styles
├── docs/                 # Documentation
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── SECURITY.md
│   ├── CONTRIBUTING.md
│   └── knowledge-base.md
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
├── package.json          # Dependencies
├── Dockerfile            # Container image
├── docker-compose.yml    # Docker orchestration
├── LICENSE               # MIT License
├── README.md             # Main documentation
└── CHANGELOG.md          # Version history
```

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/my-new-feature

# Make changes and test
npm run dev

# Commit changes (see commit guidelines below)
git add .
git commit -m "feat: add new feature"

# Keep branch updated
git fetch upstream
git rebase upstream/main

# Push to your fork
git push origin feature/my-new-feature

# Open pull request on GitHub
```

---

## Coding Standards

### JavaScript Style Guide

We follow a simple, readable coding style:

**General Principles:**
- Keep functions small and focused
- Use descriptive variable names
- Comment complex logic
- Avoid deep nesting (max 3 levels)
- Prefer readability over cleverness

**Code Examples:**

```javascript
// ✅ Good
async function createConnection(userId, connectionData) {
  // Validate required fields
  if (!connectionData.name || !connectionData.host) {
    throw new Error('Name and host are required');
  }

  // Create connection in database
  const connection = db.prepare(`
    INSERT INTO connections (user_id, name, host, port, username)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, connectionData.name, connectionData.host,
         connectionData.port || 22, connectionData.username);

  return connection;
}

// ❌ Bad
function c(u,d){if(!d.n||!d.h)throw new Error('err');return db.prepare('INSERT INTO connections (user_id, name, host, port, username) VALUES (?, ?, ?, ?, ?)').run(u,d.n,d.h,d.p||22,d.u);}
```

**Naming Conventions:**
- `camelCase` for variables and functions
- `PascalCase` for classes
- `UPPER_CASE` for constants
- Descriptive names (avoid single letters except loop counters)

**Error Handling:**
```javascript
// ✅ Always handle errors
try {
  const result = await someAsyncOperation();
  return result;
} catch (err) {
  console.error('Error in someAsyncOperation:', err);
  throw err; // or handle gracefully
}

// ❌ Never swallow errors silently
try {
  await someAsyncOperation();
} catch (err) {
  // Silent failure - bad!
}
```

**Security Considerations:**
```javascript
// ✅ Always use prepared statements
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

// ❌ Never concatenate user input in SQL
const user = db.prepare(`SELECT * FROM users WHERE id = ${userId}`).get();
```

### Frontend Standards

**HTML:**
- Semantic HTML5 elements
- Accessibility attributes (aria-\*)
- Proper form validation

**CSS:**
- Tailwind CSS utility classes preferred
- Custom CSS in `style.css` only when needed
- Mobile-first responsive design

**JavaScript:**
- Vanilla JS (no framework)
- ES6+ features (async/await, arrow functions, etc.)
- Clear separation of concerns

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature change)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `security`: Security improvements

**Examples:**

```bash
# Feature
git commit -m "feat(auth): add two-factor authentication support"

# Bug fix
git commit -m "fix(terminal): resolve resize issue on mobile devices"

# Documentation
git commit -m "docs(api): update API documentation with new endpoints"

# Security
git commit -m "security(auth): implement rate limiting on login endpoint"

# Breaking change
git commit -m "feat(api)!: change JWT token expiration from 7 to 1 day

BREAKING CHANGE: JWT tokens now expire after 1 day instead of 7 days.
Users will need to re-authenticate more frequently."
```

### Commit Best Practices

- One logical change per commit
- Write clear, descriptive messages
- Reference issues when applicable (#123)
- Keep subject line under 50 characters
- Capitalize subject line
- No period at the end of subject line
- Use imperative mood ("add" not "added")

---

## Pull Request Process

### Before Submitting

1. ✅ Test your changes locally
2. ✅ Update documentation if needed
3. ✅ Add yourself to CHANGELOG.md (if significant contribution)
4. ✅ Ensure code follows style guidelines
5. ✅ Rebase on latest main branch
6. ✅ Write clear commit messages

### Pull Request Template

```markdown
## Description
[Clear description of changes]

## Motivation
[Why is this change needed?]

## Changes Made
- [ ] Feature A added
- [ ] Bug B fixed
- [ ] Documentation updated

## Testing
[How was this tested?]

## Screenshots
[If applicable]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review performed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated (if applicable)
- [ ] CHANGELOG.md updated

## Related Issues
Closes #123
```

### Review Process

1. Maintainer reviews code within 3-5 days
2. Feedback provided via comments
3. Address feedback and push updates
4. Once approved, PR will be merged
5. Your contribution will be acknowledged

### Merge Criteria

✅ Pull request will be merged if:
- Passes all checks
- Code quality is maintained
- Documentation is updated
- No merge conflicts
- Approved by maintainer

---

## Testing

### Manual Testing

```bash
# Start development server
npm run dev

# Test different scenarios:
# 1. Register new user
# 2. Create SSH connection
# 3. Open terminal session
# 4. Test terminal input/output
# 5. Test connection CRUD operations
# 6. Test SSH key management
# 7. Test profile updates
# 8. Test logout
```

### Docker Testing

```bash
# Build image
docker build -t shellpoint:test .

# Run container
docker run -d --name shellpoint-test \
  -p 8080:8080 \
  -e JWT_SECRET="test-secret-key" \
  shellpoint:test

# Test application
curl http://localhost:8080

# Clean up
docker stop shellpoint-test
docker rm shellpoint-test
```

### Testing Checklist

- [ ] Authentication (register, login, logout)
- [ ] SSH connections (create, edit, delete, connect)
- [ ] SSH keys (add, delete, use in connection)
- [ ] Terminal (input, output, resize, themes)
- [ ] Profile management (update username, email, password, theme)
- [ ] Multiple tabs (create, switch, close)
- [ ] Error handling (invalid input, network errors)
- [ ] Security (XSS, CSRF, SQL injection attempts)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Browser compatibility (Chrome, Firefox, Safari, Edge)

---

## Documentation

### What to Document

- New features (usage, examples)
- API changes (endpoints, parameters, responses)
- Configuration options
- Breaking changes
- Migration guides (if applicable)

### Documentation Files

- **README.md**: User-facing documentation
- **docs/API.md**: API reference
- **docs/ARCHITECTURE.md**: Technical architecture
- **docs/DEPLOYMENT.md**: Deployment guides
- **docs/SECURITY.md**: Security policy
- **docs/CONTRIBUTING.md**: This file
- **docs/knowledge-base.md**: Developer notes
- **CHANGELOG.md**: Version history

### Documentation Style

- Clear and concise
- Use examples and code snippets
- Include diagrams where helpful
- Update existing docs when changing features
- Proofread before submitting

---

## Community

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: General questions, ideas
- **Email**: info@cognitiolabs.eu
- **Website**: https://cognitiolabs.eu

### Getting Help

- Check [documentation](../README.md)
- Search [existing issues](https://github.com/cognitiolabs/shellpoint/issues)
- Ask in [GitHub Discussions](https://github.com/cognitiolabs/shellpoint/discussions)
- Email: info@cognitiolabs.eu

### Recognition

Contributors will be:
- Listed in CHANGELOG.md
- Acknowledged in release notes
- Added to GitHub contributors list

---

## License

By contributing to ShellPoint, you agree that your contributions will be licensed under the [MIT License](../LICENSE).

---

## Questions?

If you have questions about contributing, please:
- Open a [GitHub Discussion](https://github.com/cognitiolabs/shellpoint/discussions)
- Email us at info@cognitiolabs.eu

Thank you for contributing to ShellPoint! 🚀

---

*CognitioLabs - https://cognitiolabs.eu*
