FROM node:20-alpine
WORKDIR /app
COPY package.json tsconfig.json tailwind.config.ts postcss.config.js next.config.mjs next-env.d.ts ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY types ./types
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "dev"]
