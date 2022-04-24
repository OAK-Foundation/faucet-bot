FROM node:16-alpine

WORKDIR /app

COPY package*.json /app/

RUN npm ci

COPY . /app

ENTRYPOINT ["sh", "./entrypoint.sh"]
