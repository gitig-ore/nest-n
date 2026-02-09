const { NestFactory } = require('@nestjs/core');
const express = require('express');
const serverless = require('aws-serverless-express');
const { AppModule } = require('../dist/app.module');

async function createApp() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });
  
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
