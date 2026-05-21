import * as Sentry from "@sentry/node"
Sentry.init({
  // Fine to leave public for now
  dsn: "https://a7fc08692f0434823506a293d12cadf2@o4511425017151488.ingest.us.sentry.io/4511429738627072",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { Container } from 'typedi';
import Client from './Client';

// Import environment variables for bot.
dotenv.config();

// Initialize the Client using the IoC.
Container.get<Client>(Client);
