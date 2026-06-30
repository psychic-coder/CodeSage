FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/nginx.conf
# Verify config is valid at build time
RUN nginx -t
EXPOSE 80 443
