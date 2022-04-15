import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { Container } from 'typedi';
import Client from './Client';

// Import environment variables for bot.
dotenv.config();

// Initialize the Client using the IoC.
Container.get<Client>(Client);
