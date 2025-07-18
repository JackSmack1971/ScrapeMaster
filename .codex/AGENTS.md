# Global Development Preferences for Codex

## Personal Coding Standards

### Code Quality Preferences
- Always use TypeScript in strict mode with explicit types (avoid `any`)
- Prefer functional programming patterns and immutable data structures
- Maximum function length: 50 lines, complexity score: 8
- Use descriptive variable names and comprehensive JSDoc documentation
- Implement error boundaries and graceful error handling

### Testing Philosophy
- Write tests first (TDD approach when possible)
- Aim for 90%+ code coverage with meaningful tests, not just coverage metrics
- Focus on integration tests for complex workflows
- Use descriptive test names that explain the business scenario
- Mock external dependencies appropriately

### Security Mindset
- Validate all inputs at application boundaries
- Never commit secrets, API keys, or sensitive configuration
- Use environment variables for configuration
- Implement rate limiting and input sanitization by default
- Follow OWASP security guidelines

### Performance Considerations
- Profile before optimizing, measure actual impact
- Prefer lazy loading and code splitting for large applications
- Optimize database queries with proper indexing
- Monitor memory usage and prevent leaks
- Cache appropriately but invalidate correctly

### Communication Preferences
- Provide detailed commit messages with context and reasoning
- Include relevant issue numbers and break down large changes
- Document architectural decisions and trade-offs
- Explain complex algorithms and business logic
- Create comprehensive PR descriptions with testing instructions

### Development Environment
- Use consistent formatting (Prettier) and linting (ESLint)
- Prefer package managers with lock files (npm with package-lock.json)
- Use exact dependency versions for production deployments
- Configure IDE with TypeScript strict checking enabled
- Set up pre-commit hooks for quality gates

## Work Style Preferences
- Break large tasks into smaller, reviewable chunks
- Prioritize readability and maintainability over cleverness
- Document unusual or complex solutions thoroughly
- Consider backward compatibility and migration paths
- Plan for error recovery and system resilience
