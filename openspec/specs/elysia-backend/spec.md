## ADDED Requirements

### Requirement: Elysia HTTP server for orchestrator
The orchestrator SHALL use Elysia as the HTTP framework, replacing the raw Node.js `http.createServer` module.

#### Scenario: Health check endpoint responds
- **WHEN** a GET request is made to `/health`
- **THEN** the server responds with HTTP 200 and a JSON body containing `status: "healthy"`, `uptime` (seconds), and `timestamp` (ISO 8601)

#### Scenario: Unknown routes return 404
- **WHEN** a request is made to an undefined route
- **THEN** the server responds with HTTP 404 and a JSON body containing `error: "Not found"`

### Requirement: Elysia typed route definitions
The orchestrator's Elysia routes SHALL use Elysia's type system for request/response validation.

#### Scenario: Route handlers have inferred types
- **WHEN** a route handler is defined with Elysia's `t` schema validator
- **THEN** the request parameters and response body are type-checked at compile time

### Requirement: Elysia graceful shutdown
The orchestrator SHALL handle SIGTERM and SIGINT signals by stopping the Elysia server and feature watcher cleanly.

#### Scenario: SIGTERM triggers shutdown
- **WHEN** the process receives SIGTERM
- **THEN** the feature watcher stops polling, the Elysia server stops accepting connections, and the process exits with code 0

#### Scenario: Shutdown timeout forces exit
- **WHEN** graceful shutdown takes longer than 10 seconds
- **THEN** the process force-exits with code 1

### Requirement: Elysia middleware for logging
The orchestrator SHALL use Elysia middleware to log all incoming requests with method, path, status code, and response time.

#### Scenario: Request logged on completion
- **WHEN** any HTTP request completes
- **THEN** a log line is emitted with format `[orchestrator] {method} {path} {status} {duration}ms`
