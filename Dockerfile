# FROM node:12-stretch
FROM pagedmedia/pagedjs-cli

USER root

WORKDIR /home/node/pagedjs

RUN chown -R node:node /home/node/pagedjs

COPY package.json ./package.json
COPY yarn.lock ./yarn.lock

RUN yarn


COPY --chown=node:node . .

RUN chmod +x ./scripts/wait-for-it.sh

USER node

ENTRYPOINT . scripts/startServer.sh
