FROM node:20-alpine
WORKDIR /app
ENV npm_config_fetch_retries=5 \
	npm_config_fetch_retry_factor=2 \
	npm_config_fetch_retry_mintimeout=20000 \
	npm_config_fetch_retry_maxtimeout=120000

COPY package.json package-lock.json tsconfig.json tailwind.config.ts postcss.config.js next.config.mjs next-env.d.ts ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY types ./types
RUN npm install --no-audit --no-fund --prefer-offline
EXPOSE 3000
CMD ["npm", "run", "dev"]
