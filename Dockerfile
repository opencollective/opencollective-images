FROM node:24@sha256:14078204b6bb268c107ceff6d3c43f45a888105e5c2b18b14c32b3409d93a1b0

WORKDIR /usr/src/images

COPY package*.json .npmrc ./

RUN npm ci

COPY . .

RUN npm run build

ARG PORT=3001
ENV PORT=$PORT

ENV NODE_ENV=production

EXPOSE $PORT

CMD [ "npm", "run", "start" ]
