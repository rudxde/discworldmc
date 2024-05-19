FROM node:22-alpine as base
WORKDIR /app
COPY ./package.json .
COPY ./package-lock.json .
RUN npm ci --only=production --ignore-scripts

FROM --platform=$BUILDPLATFORM base as build
COPY tsconfig.json .
RUN npm ci
COPY ./src ./src
RUN npm run build

FROM base
WORKDIR /app
COPY ./package.json .
COPY ./package-lock.json .
RUN npm ci --only=production --ignore-scripts
COPY --from=build /app/dist/ /app/dist/
COPY ./i18n/ /app/i18n/
ARG TAG
RUN npm version 0.0.0-${TAG} --no-git-tag-version
RUN echo ${TAG} > /version
ENTRYPOINT node --enable-source-maps /app/dist/main.js
