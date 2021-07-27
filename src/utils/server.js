import fs from 'fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import { connector, summarise } from 'swagger-routes-express';
import YAML from 'yamljs';
import * as OpenApiValidator from 'express-openapi-validator';
import morgan from 'morgan';
import cors from 'cors';
import passport from 'passport';
import * as api from '../api/controllers';
import * as db from '../db/db';
import { securityMiddleware } from './securityMiddleware';

import { strategy } from './passport';

strategy(passport);

// connect to DB
db.connect()
    .then(() => console.log('MongoDB connected'))
    .catch((error) => console.error(error));

// load API definition
const yamlSpecFile = './bin/api/apiV1.yaml';
const apiDefinition = YAML.load(yamlSpecFile);

const apiSummary = summarise(apiDefinition);
console.info(apiSummary);

const server = express();

// noinspection JSCheckFunctionSignatures
server.use(morgan('dev'));
// noinspection JSCheckFunctionSignatures
server.use(
    morgan('combined', {
        stream: fs.createWriteStream('./bin/access.log', { flags: 'a' }),
        skip(req, res) {
            return res.statusCode < 400;
        }
    })
);
server.use(express.urlencoded({ extended: true }));
server.use(express.json());
server.use(cookieParser());
// noinspection JSCheckFunctionSignatures
server.use(cors());
// noinspection JSCheckFunctionSignatures
server.use(passport.initialize());

// API Documentation
// noinspection JSCheckFunctionSignatures
server.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiDefinition, { explorer: false }));

// Automatic validation
const validatorOptions = {
    coerceTypes: false,
    apiSpec: yamlSpecFile,
    validateRequests: true,
    validateResponses: false
};
server.use(OpenApiValidator.middleware(validatorOptions));

// error customization, if request is invalid
server.use((err, req, res, next) => {
    res.status(err.status).json({
        error: {
            type: 'request_validation',
            message: err.message,
            errors: err.errors
        }
    });
    next();
});

// Automatic routing based on api definition
const connect = connector(api, apiDefinition, {
    onCreateRoute: (method, descriptor) => {
        console.log(
            `Method ${method} of endpoint ${descriptor[0]} linked to ${descriptor[1].name}`
        );
    },
    security: {
        subscriber: (req, res, next) => {
            securityMiddleware(req, res, next, passport, ['subscriber', 'admin']);
        },
        free: (req, res, next) => {
            securityMiddleware(req, res, next, passport, ['free', 'subscriber', 'admin']);
        }
    }
});

connect(server);

module.exports = server;
