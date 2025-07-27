FROM node:20.19-alpine

WORKDIR /app

COPY . .

RUN apk add --no-cache bash
RUN chmod +x ./install.sh

RUN ./install.sh

RUN cd backend && npm rebuild better-sqlite3

RUN npm cache clean --force

EXPOSE 3000

CMD ["npm", "start", "--prefix", "./backend"]
