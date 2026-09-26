FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_RUVENTU_ADMIN_USERNAME
ARG VITE_RUVENTU_ADMIN_PASSWORD
ENV VITE_RUVENTU_ADMIN_USERNAME=$VITE_RUVENTU_ADMIN_USERNAME
ENV VITE_RUVENTU_ADMIN_PASSWORD=$VITE_RUVENTU_ADMIN_PASSWORD
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
