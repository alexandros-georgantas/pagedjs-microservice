#!/bin/sh
set -x
./scripts/wait-for-it.sh $WAIT_SERVICE_PORT -- ./node_modules/.bin/pubsweet migrate && ./node_modules/.bin/pubsweet start:server 