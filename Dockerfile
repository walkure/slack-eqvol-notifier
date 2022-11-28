FROM node:18-slim  as node_modules

WORKDIR /app

COPY package*.json ./
RUN npm install

FROM gcr.io/distroless/nodejs18-debian11:nonroot

COPY --chown=nonroot:nonroot --from=node_modules /app/node_modules /app/node_modules
COPY --chown=nonroot:nonroot jmapull.js jmaparser.js /app/
ENV NODE_ENV=production
ENV NODE_CONFIG_DIR=/config
ENV TZ=Asia/Tokyo

WORKDIR /app
USER nonroot
CMD [ "./jmapull.js" ]
