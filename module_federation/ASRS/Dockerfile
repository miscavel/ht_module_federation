# Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# ASRS needs Core and WMS remotes
ENV VITE_CORE_REMOTE=/assets/remoteEntry.js
ENV VITE_WMS_REMOTE=/wms/assets/remoteEntry.js
RUN npm run build

# Production Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
