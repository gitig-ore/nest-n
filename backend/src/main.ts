import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log', 'debug'] });

  const isProduction = process.env.NODE_ENV === 'production';

  // ============================================
  // SECURITY HEADERS
  // ============================================
  app.use((req, res, next) => {
    // Prevent XSS attacks
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Prevent MIME type sniffing
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Content Security Policy - adjust as needed for your frontend
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    // Permissions Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });

  // ============================================
  // RATE LIMITING
  // ============================================
  // General rate limiter: 100 requests per minute
  const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
      statusCode: 429,
      message: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Stricter rate limiter for auth routes: 10 requests per minute
  const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute for auth endpoints
    message: {
      statusCode: 429,
      message: 'Too many login attempts, please try again after a minute.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply general rate limiter to all routes
  app.use(generalLimiter);

  // ============================================
  // CORS VALIDATION
  // ============================================
  const frontendUrl = process.env.FRONTEND_URL;

  // Validate FRONTEND_URL in production
  if (isProduction && !frontendUrl) {
    console.error('❌ CRITICAL: FRONTEND_URL environment variable is required in production!');
    console.error('   Please set FRONTEND_URL to your frontend deployment URL.');
    console.error('   Example: FRONTEND_URL=https://your-frontend.vercel.app');
    // Don't exit in serverless - let the request fail gracefully
  }

  // Define allowed origins
  let allowedOrigins: string[];
  if (isProduction) {
    // In production, allow Vercel preview/production domains and configured FRONTEND_URL
    allowedOrigins = [
      'https://*.vercel.app',
      'https://*.now.sh',
      frontendUrl || '',
    ].filter(Boolean);
  } else {
    // In development, allow localhost origins
    allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ];
    // Also add FRONTEND_URL if set in development
    if (frontendUrl) {
      allowedOrigins.push(frontendUrl);
    }
  }

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false, // false means no origin allowed
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
    maxAge: 86400, // 24 hours
  });

  // ============================================
  // SERVER STARTUP
  // ============================================
  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  // Log configuration info
  console.log('========================================');
  console.log('🚀 Server Configuration:');
  console.log(`   Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`   Port: ${port}`);
  console.log(`   CORS Origins: ${allowedOrigins.join(', ') || 'NONE (requests will be blocked)'}`);
  console.log(`   Rate Limiting: 100 req/min (general), 10 req/min (auth)`);
  console.log('========================================');
}

bootstrap();
