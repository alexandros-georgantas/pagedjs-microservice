FROM node:20.0.0-alpine3.16

# Configuration for GS4JS
ENV GS4JS_HOME=/usr/lib
ENV CONNECTION_TIMEOUT=60000

RUN apk update && apk add --no-cache python3 bash coreutils unzip dumb-init ghostscript git ghostscript-dev make gcc g++ chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont 

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN mkdir -p /home/node/Downloads

WORKDIR /home/node/pagedjs

RUN chown -R node:node /home/node/pagedjs

USER node

COPY --chown=node:node package.json ./package.json
COPY --chown=node:node yarn.lock ./yarn.lock

RUN yarn

RUN yarn add ghostscript4js

COPY --chown=node:node . .

ENTRYPOINT ["dumb-init", "--"]

CMD ["sh", "./scripts/setupProdServer.sh"]
