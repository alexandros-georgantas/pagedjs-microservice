#!/bin/sh
./scripts/wait-for-it.sh $WAIT_SERVICE_PORT -- ./node_modules/.bin/pubsweet migrate && node ./server/startServer.js