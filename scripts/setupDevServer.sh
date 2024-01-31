#!/bin/sh
# This is run through docker. Its CWD will be the root folder.
node_modules/.bin/pubsweet migrate
node ./scripts/runners/createClientRunner.js

exec "$@"
