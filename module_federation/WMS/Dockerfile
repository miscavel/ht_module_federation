# Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# WMS needs Core remote
ENV VITE_CORE_REMOTE=/assets/remoteEntry.js
# Note: In a real scenario, WMS might need to access Core assets. 
# Since Core is the host, WMS usually doesn't "load" Core, but consumes shared deps.
# However, if WMS imports from Core, it needs the URL.
# We assume Core is at root /
RUN npm run build

# Production Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
