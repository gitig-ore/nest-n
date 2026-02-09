const { NestFactory } = require('@nestjs/core');
const express = require('express');
const serverless = require('aws-serverless-express');
const { AppModule } = require('../dist/app.module');

async function createApp() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });
  
  const isProduction = process.env.NODE_ENV === 'production';
  const frontendUrl = process.env.FRONTEND_URL || '';
  
  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', `default-src 'self'; connect-src 'self' https://*.vercel.app ${frontendUrl}`);
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });
  
  let allowedOrigins;
  if (isProduction) {
    allowedOrigins = [
      'https://*.vercel.app',
      'https://*.now.sh',
      frontendUrl || '',
    ].filter(Boolean);
  } else {
    allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  }
  
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });
  
  return app;
}

let cachedServer;

async function bootstrap() {
  if (!cachedServer) {
    const app = await createApp();
    await app.init();
    cachedServer = serverless.createServer(app.getHttpAdapter().getInstance());
  }
  return cachedServer;
}

// For local testing
if (require.main === module) {
  const app = require('express')();
  bootstrap().then((server) => {
    serverless.proxy(server, cachedServer, 3001, 'localhost');
  });
}

// For Vercel Serverless Function
module.exports = async (req, res) => {
  cachedServer = await bootstrap();
  serverless.proxy(cachedServer, req, res, 'Lambda');
};
