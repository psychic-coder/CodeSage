export type ImprovementCategory = 'security' | 'performance' | 'refactoring' | 'critical'
export type EffortLevel = 'low' | 'medium' | 'high'

export interface Improvement {
  id: string
  category: ImprovementCategory
  title: string
  description: string
  effort: EffortLevel
  estimatedHours: number
  affectedFiles: string[]
  codeSnippet: string
  currentCode: string
  improvementCode: string
  impact: string
}

export interface Recommendation {
  id: string
  title: string
  description: string
  complexity: 'Low' | 'High'
  filesToCreate: string[]
  filesToModify: string[]
}

export const IMPROVEMENTS: Improvement[] = [
  {
    id: '1',
    category: 'security',
    title: 'Add SQL Injection Prevention',
    description: 'Implement parameterized queries to prevent SQL injection attacks in database queries.',
    effort: 'medium',
    estimatedHours: 4,
    affectedFiles: ['src/db/queries.ts', 'src/api/users/route.ts'],
    codeSnippet: 'db.query("SELECT * FROM users WHERE id = " + userId)',
    currentCode: `// Vulnerable to SQL injection
const user = await db.query("SELECT * FROM users WHERE id = " + userId);`,
    improvementCode: `// Safe with parameterized queries
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);`,
    impact: 'Eliminates SQL injection vulnerabilities'
  },
  {
    id: '2',
    category: 'performance',
    title: 'Implement Database Query Caching',
    description: 'Add caching layer to reduce database load for frequently accessed queries.',
    effort: 'high',
    estimatedHours: 6,
    affectedFiles: ['src/db/cache.ts', 'src/services/user.service.ts'],
    codeSnippet: 'await database.query(getUserQuery)',
    currentCode: `// Query hits database every time
export async function getUser(id: string) {
  return await database.query(getUserQuery, [id]);
}`,
    improvementCode: `// With caching
export async function getUser(id: string) {
  const cached = await cache.get(\`user:\${id}\`);
  if (cached) return cached;
  const user = await database.query(getUserQuery, [id]);
  await cache.set(\`user:\${id}\`, user, 3600);
  return user;
}`,
    impact: '40-60% reduction in database load'
  },
  {
    id: '3',
    category: 'refactoring',
    title: 'Extract API Route Handlers',
    description: 'Break down monolithic route handlers into smaller, testable utility functions.',
    effort: 'medium',
    estimatedHours: 3,
    affectedFiles: ['src/api/products/route.ts', 'src/handlers/product.handler.ts'],
    codeSnippet: 'POST /api/products - 250 lines',
    currentCode: `// 250-line monolithic handler
export async function POST(request: Request) {
  // validation, business logic, error handling all in one function
}`,
    improvementCode: `// Extracted handlers
export async function POST(request: Request) {
  const data = await validateProductRequest(request);
  const result = await createProductHandler(data);
  return Response.json(result);
}`,
    impact: 'Improved testability and maintainability'
  },
  {
    id: '4',
    category: 'critical',
    title: 'Fix Unhandled Promise Rejection',
    description: 'Add error handling to async operation that can crash the server.',
    effort: 'low',
    estimatedHours: 1,
    affectedFiles: ['src/services/email.service.ts'],
    codeSnippet: 'sendEmail(user.email).then(...)',
    currentCode: `// Unhandled rejection
sendEmail(user.email)
  .then(result => logger.log(result))
  .catch(err => console.log(err)); // Not properly handled`,
    improvementCode: `// Properly handled
try {
  const result = await sendEmail(user.email);
  logger.log(result);
} catch (error) {
  logger.error('Email send failed:', error);
  // Alert monitoring service
}`,
    impact: 'Prevents server crashes from email failures'
  },
  {
    id: '5',
    category: 'performance',
    title: 'Enable Response Compression',
    description: 'Implement gzip compression for API responses to reduce bandwidth usage.',
    effort: 'low',
    estimatedHours: 1,
    affectedFiles: ['src/middleware/compression.ts', 'next.config.js'],
    codeSnippet: 'app.use(compression())',
    currentCode: `// No compression
app.use(cors());
app.use(json());`,
    improvementCode: `// With compression
import compression from 'compression';
app.use(compression());
app.use(cors());
app.use(json());`,
    impact: '60-70% reduction in response size'
  },
  {
    id: '6',
    category: 'security',
    title: 'Implement Rate Limiting',
    description: 'Add rate limiting to API endpoints to prevent brute force attacks.',
    effort: 'medium',
    estimatedHours: 3,
    affectedFiles: ['src/middleware/rateLimit.ts', 'src/api/auth/route.ts'],
    codeSnippet: 'export async function POST(req: Request)',
    currentCode: `// No rate limiting
export async function POST(req: Request) {
  const user = await authenticateUser(req);
  return Response.json({ user });
}`,
    improvementCode: `// With rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5 // 5 requests per 15 minutes
});

export const middleware = [limiter];
export async function POST(req: Request) {
  const user = await authenticateUser(req);
  return Response.json({ user });
}`,
    impact: 'Prevents brute force attacks'
  },
  {
    id: '7',
    category: 'refactoring',
    title: 'Remove Dead Code Branches',
    description: 'Clean up unused imports, variables, and legacy code paths.',
    effort: 'low',
    estimatedHours: 2,
    affectedFiles: ['src/utils/legacy.ts', 'src/components/Form.tsx'],
    codeSnippet: 'Unused code in 4 files',
    currentCode: `// Legacy code
const OLD_API_ENDPOINT = 'https://old.api.com';
function deprecatedFunction() {
  // Not called anywhere
}`,
    improvementCode: `// Cleaned up
// Remove unused constants and functions
// Result: Smaller bundle size`,
    impact: '8% reduction in bundle size'
  },
  {
    id: '8',
    category: 'critical',
    title: 'Update Vulnerable Dependencies',
    description: 'Update packages with known security vulnerabilities to latest versions.',
    effort: 'medium',
    estimatedHours: 2,
    affectedFiles: ['package.json', 'package-lock.json'],
    codeSnippet: 'dependencies with known CVEs',
    currentCode: `// Vulnerable versions
"express": "4.17.1",  // CVE-2022-24999
"lodash": "4.17.19"   // CVE-2021-23337`,
    improvementCode: `// Updated versions
"express": "4.18.2",  // Fixed
"lodash": "4.17.21"   // Fixed`,
    impact: 'Eliminates 2 critical vulnerabilities'
  },
  {
    id: '9',
    category: 'performance',
    title: 'Optimize Image Delivery',
    description: 'Implement lazy loading and responsive images for better performance.',
    effort: 'high',
    estimatedHours: 5,
    affectedFiles: ['src/components/Gallery.tsx', 'src/hooks/useImages.ts'],
    codeSnippet: '<img src={imageUrl} />',
    currentCode: `// All images loaded eagerly
export function Gallery({ images }) {
  return (
    <div>
      {images.map(img => (
        <img key={img.id} src={img.url} alt={img.alt} />
      ))}
    </div>
  );
}`,
    improvementCode: `// Lazy loading with Next.js Image
import Image from 'next/image';

export function Gallery({ images }) {
  return (
    <div>
      {images.map(img => (
        <Image 
          key={img.id} 
          src={img.url} 
          alt={img.alt}
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      ))}
    </div>
  );
}`,
    impact: 'Improves LCP by 35%'
  },
]

export const RECOMMENDATIONS: Recommendation[] = [
  {
    id: '1',
    title: 'Create Service Layer',
    description: 'Extract business logic from route handlers into reusable service classes.',
    complexity: 'High',
    filesToCreate: ['src/services/user.service.ts', 'src/services/product.service.ts', 'src/services/order.service.ts'],
    filesToModify: ['src/api/users/route.ts', 'src/api/products/route.ts']
  },
  {
    id: '2',
    title: 'Add Comprehensive Error Handling',
    description: 'Implement global error handling with proper logging and monitoring.',
    complexity: 'Medium',
    filesToCreate: ['src/utils/errorHandler.ts', 'src/middleware/errorMiddleware.ts'],
    filesToModify: ['src/api/middleware.ts']
  },
  {
    id: '3',
    title: 'Implement Feature Flags',
    description: 'Add feature flag system for controlled rollout of new features.',
    complexity: 'High',
    filesToCreate: ['src/features/flags.ts', 'src/hooks/useFeatureFlag.ts'],
    filesToModify: ['src/middleware.ts', 'src/components/*.tsx']
  },
  {
    id: '4',
    title: 'Add Integration Tests',
    description: 'Create comprehensive integration test suite for API endpoints.',
    complexity: 'High',
    filesToCreate: ['tests/integration/api.test.ts', 'tests/integration/auth.test.ts', 'tests/setup.ts'],
    filesToModify: ['package.json']
  },
]

export const STATS = {
  security: IMPROVEMENTS.filter(i => i.category === 'security').length,
  performance: IMPROVEMENTS.filter(i => i.category === 'performance').length,
  refactoring: IMPROVEMENTS.filter(i => i.category === 'refactoring').length,
  critical: IMPROVEMENTS.filter(i => i.category === 'critical').length,
}
