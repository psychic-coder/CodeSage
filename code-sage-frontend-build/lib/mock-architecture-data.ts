export const mockArchitectureData = {
  healthScore: 7.8,
  pattern: 'Microservices',
  scalability: 'Horizontal',
  issues: [
    {
      id: 1,
      severity: 'critical',
      title: 'Circular Dependency Detected',
      location: 'src/api/handlers → src/services/auth → src/api/handlers',
      description: 'A circular dependency has been detected in your codebase. This creates tight coupling and makes the code harder to test and maintain.',
      code: `// src/api/handlers/user.ts
import { authService } from '../services/auth';

export const getUserById = (id: string) => {
  return authService.validateUser(id);
};

// src/services/auth.ts
import { getUserHandler } from '../api/handlers';

export const validateUser = async (id: string) => {
  return await getUserHandler(id);
};`,
      fix: 'Extract the shared logic into a separate utility module that both can import from without creating a cycle.',
    },
    {
      id: 2,
      severity: 'high',
      title: 'God File: database.ts',
      location: 'src/lib/database.ts (2.4k lines)',
      description: 'This file has exceeded 2000 lines and handles database operations, migrations, caching, and utilities. It should be split into focused modules.',
      code: `// src/lib/database.ts (2,400 lines)
export const initializeDatabase = () => { /* ... */ }
export const runMigrations = () => { /* ... */ }
export const setupCache = () => { /* ... */ }
export const queryUsers = () => { /* ... */ }
export const queryPosts = () => { /* ... */ }
// ... 50+ more functions`,
      fix: 'Create separate modules: database/connection.ts, database/migrations.ts, database/cache.ts, and database/queries/',
    },
    {
      id: 3,
      severity: 'high',
      title: 'High Coupling: API Layer',
      location: 'src/api/routes/auth.ts',
      description: 'The authentication routes module imports from 12 different services, creating tight coupling. Changes to any service may break this route.',
      code: `// src/api/routes/auth.ts
import { userService } from '../../services/users';
import { emailService } from '../../services/email';
import { logService } from '../../services/logging';
import { cacheService } from '../../services/cache';
import { metricsService } from '../../services/metrics';
// ... 7 more imports`,
      fix: 'Create a facade or orchestrator service that handles these dependencies, reducing direct coupling.',
    },
    {
      id: 4,
      severity: 'medium',
      title: 'Missing Error Handling',
      location: 'src/services/payment.ts:42-58',
      description: 'The payment processing function lacks proper error handling for network failures and timeouts.',
      code: `export const processPayment = async (amount: number) => {
  const response = await fetch('https://payment-api.com/charge', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
  
  return response.json();
};`,
      fix: 'Add try-catch blocks, timeout handling, and retry logic with exponential backoff.',
    },
    {
      id: 5,
      severity: 'low',
      title: 'Unused Import',
      location: 'src/components/Dashboard.tsx:1-15',
      description: 'The Component class from React is imported but not used in this file.',
      code: `import React, { Component } from 'react';
import { useEffect } from 'react';

export const Dashboard = () => {
  useEffect(() => {
    // ...
  }, []);
  
  return <div>Dashboard</div>;
};`,
      fix: 'Remove the unused Component import from React.',
    },
    {
      id: 6,
      severity: 'medium',
      title: 'N+1 Query Problem',
      location: 'src/services/userService.ts:23-35',
      description: 'Fetching users inside a loop causes N+1 queries. Should use batch fetching or SQL JOIN.',
      code: `export const getUsersWithPosts = async (userIds: string[]) => {
  const results = [];
  for (const id of userIds) {
    const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    const posts = await db.query('SELECT * FROM posts WHERE userId = ?', [id]);
    results.push({ ...user, posts });
  }
  return results;
};`,
      fix: 'Use batch queries or a single JOIN query to fetch all users and their posts at once.',
    },
  ],
  godFiles: [
    {
      id: 1,
      name: 'src/lib/database.ts',
      inDegree: 23,
      outDegree: 8,
      lines: 2340,
    },
    {
      id: 2,
      name: 'src/api/index.ts',
      inDegree: 18,
      outDegree: 42,
      lines: 1850,
    },
    {
      id: 3,
      name: 'src/services/auth.ts',
      inDegree: 15,
      outDegree: 12,
      lines: 1620,
    },
    {
      id: 4,
      name: 'src/types/index.ts',
      inDegree: 67,
      outDegree: 0,
      lines: 1200,
    },
    {
      id: 5,
      name: 'src/utils/helpers.ts',
      inDegree: 42,
      outDegree: 3,
      lines: 950,
    },
  ],
  cycles: [
    {
      id: 1,
      severity: 'critical',
      nodes: [
        'src/api/handlers',
        'src/services/auth',
        'src/api/handlers',
      ],
      length: 3,
    },
    {
      id: 2,
      severity: 'high',
      nodes: [
        'src/models/User',
        'src/models/Post',
        'src/models/Comment',
        'src/models/User',
      ],
      length: 4,
    },
  ],
  externalDependencies: [
    { name: 'express', version: '^4.18.0', type: 'production', vulnerabilities: 0 },
    { name: 'postgres', version: '^14.2', type: 'production', vulnerabilities: 0 },
    { name: 'lodash', version: '^4.17.21', type: 'production', vulnerabilities: 1 },
    { name: 'jest', version: '^29.0.0', type: 'dev', vulnerabilities: 0 },
    { name: 'typescript', version: '^4.9.0', type: 'dev', vulnerabilities: 0 },
  ],
};
