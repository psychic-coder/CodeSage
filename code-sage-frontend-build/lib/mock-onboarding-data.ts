export interface TimelineStep {
  id: string
  stepNumber: number
  functionName: string
  filePath: string
  description: string
  codeSnippet?: string
}

export interface OnboardingGuide {
  id: string
  title: string
  query: string
  description: string
  timelineSteps: TimelineStep[]
  gotchas: string[]
  relatedGuides: string[]
}

export const PRESET_QUESTIONS = [
  'How does authentication work?',
  'What are the performance bottlenecks?',
  'Show me the system architecture',
  'What testing patterns do we use?',
  'Where are the security vulnerabilities?',
]

export const ONBOARDING_GUIDES: Record<string, OnboardingGuide> = {
  'auth-flow': {
    id: 'auth-flow',
    title: 'Authentication Flow',
    query: 'How does authentication work?',
    description: 'Complete walkthrough of how user authentication is implemented in the codebase.',
    timelineSteps: [
      {
        id: 'step-1',
        stepNumber: 1,
        functionName: 'POST /api/auth/login',
        filePath: 'src/api/auth/route.ts',
        description: 'User submits login credentials. The route handler receives the request and validates input format.',
        codeSnippet: 'export async function POST(request: Request) {',
      },
      {
        id: 'step-2',
        stepNumber: 2,
        functionName: 'authenticateUser()',
        filePath: 'src/services/auth.service.ts',
        description: 'Validates credentials against the database using secure password hashing with bcrypt.',
        codeSnippet: 'const isValid = await comparePasswords(input, stored);',
      },
      {
        id: 'step-3',
        stepNumber: 3,
        functionName: 'generateJWT()',
        filePath: 'src/lib/jwt.ts',
        description: 'Creates a JWT token with user ID and expiry. Token is signed with secret key.',
        codeSnippet: 'const token = sign({ userId, exp }, SECRET);',
      },
      {
        id: 'step-4',
        stepNumber: 4,
        functionName: 'setAuthCookie()',
        filePath: 'src/utils/cookies.ts',
        description: 'Stores JWT in secure HttpOnly cookie to prevent XSS attacks.',
        codeSnippet: 'setCookie("auth_token", token, { httpOnly: true });',
      },
      {
        id: 'step-5',
        stepNumber: 5,
        functionName: 'middleware.auth()',
        filePath: 'src/middleware/auth.ts',
        description: 'Subsequent requests are intercepted by auth middleware which verifies the token.',
        codeSnippet: 'const token = request.cookies.get("auth_token");',
      },
    ],
    gotchas: [
      'Tokens are refreshed every 24 hours automatically',
      'HttpOnly cookies cannot be accessed by JavaScript - this is intentional for security',
      'Logout requires clearing both the cookie and invalidating the token in Redis',
      'Failed login attempts are rate-limited to 5 per minute per IP address',
      'Password resets expire after 1 hour and can only be used once',
    ],
    relatedGuides: ['security-best-practices', 'session-management'],
  },
  'performance-tips': {
    id: 'performance-tips',
    title: 'Performance Optimization',
    query: 'What are the performance bottlenecks?',
    description: 'Identify and optimize slow parts of the system.',
    timelineSteps: [
      {
        id: 'step-1',
        stepNumber: 1,
        functionName: 'Query Database',
        filePath: 'src/services/product.service.ts',
        description: 'Database queries are the primary bottleneck. Add pagination and caching.',
        codeSnippet: 'const products = await db.query(getPaginatedQuery, [limit, offset]);',
      },
      {
        id: 'step-2',
        stepNumber: 2,
        functionName: 'Cache Results',
        filePath: 'src/services/cache.service.ts',
        description: 'Results are cached in Redis for 5 minutes to reduce database load.',
        codeSnippet: 'await redis.setex(key, 300, JSON.stringify(data));',
      },
      {
        id: 'step-3',
        stepNumber: 3,
        functionName: 'Bundle Optimization',
        filePath: 'next.config.js',
        description: 'Enable Next.js bundle analysis and code splitting for client-side JS.',
        codeSnippet: 'bundleAnalyzer: { enabled: process.env.ANALYZE === "true" }',
      },
      {
        id: 'step-4',
        stepNumber: 4,
        functionName: 'Image Optimization',
        filePath: 'src/components/Gallery.tsx',
        description: 'Use Next.js Image component with lazy loading and responsive sizes.',
        codeSnippet: '<Image loading="lazy" sizes="(max-width: 768px) 100vw" />',
      },
      {
        id: 'step-5',
        stepNumber: 5,
        functionName: 'Monitor Metrics',
        filePath: 'src/utils/monitoring.ts',
        description: 'Track Web Vitals (LCP, INP, CLS) using performance observer.',
        codeSnippet: 'const observer = new PerformanceObserver(list => {...});',
      },
    ],
    gotchas: [
      'Caching can cause stale data - always invalidate on mutations',
      'Image optimization only works with Next.js Image component',
      'Bundle analysis shows compressed sizes - actual download is larger',
      'Rate limiting may prevent legitimate traffic spikes',
      'Database indexes are critical for query performance optimization',
    ],
    relatedGuides: ['caching-strategy', 'database-optimization'],
  },
  'architecture-overview': {
    id: 'architecture-overview',
    title: 'System Architecture',
    query: 'Show me the system architecture',
    description: 'High-level overview of how different components interact.',
    timelineSteps: [
      {
        id: 'step-1',
        stepNumber: 1,
        functionName: 'Client Layer',
        filePath: 'src/components/**',
        description: 'React components handle user interface and interactions using Next.js 16.',
        codeSnippet: 'export default function Component() { ... }',
      },
      {
        id: 'step-2',
        stepNumber: 2,
        functionName: 'API Routes',
        filePath: 'src/api/**',
        description: 'Server endpoints using Next.js route handlers for API requests.',
        codeSnippet: 'export async function POST(request: Request) { ... }',
      },
      {
        id: 'step-3',
        stepNumber: 3,
        functionName: 'Business Logic',
        filePath: 'src/services/**',
        description: 'Service layer contains all business logic, separate from HTTP concerns.',
        codeSnippet: 'export class UserService { ... }',
      },
      {
        id: 'step-4',
        stepNumber: 4,
        functionName: 'Data Access',
        filePath: 'src/db/**',
        description: 'Database layer with connection pooling and query optimization.',
        codeSnippet: 'const connection = await pool.getConnection();',
      },
      {
        id: 'step-5',
        stepNumber: 5,
        functionName: 'External Services',
        filePath: 'src/lib/**',
        description: 'Integrations with third-party services (Stripe, SendGrid, etc).',
        codeSnippet: 'const stripe = new Stripe(STRIPE_API_KEY);',
      },
    ],
    gotchas: [
      'Service layer is required - never call database directly from API routes',
      'Environment variables must be validated at startup',
      'Error handling must be consistent across all layers',
      'Database migrations are applied automatically on deployment',
      'External API keys should use short-lived credentials when possible',
    ],
    relatedGuides: ['auth-flow', 'performance-tips'],
  },
}
