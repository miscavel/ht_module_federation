# Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Build with relative paths for remotes (to be served via gateway)
# We set the remotes to point to the gateway paths
ENV VITE_WMS_REMOTE=/wms/assets/remoteEntry.js
ENV VITE_ASRS_REMOTE=/asrs/assets/remoteEntry.js
RUN npm run build

# Production Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copy a basic nginx config for SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
