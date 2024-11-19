#!/bin/bash

# Install backend dependencies
cd adeo-request-system-backend
npm install bcryptjs@2.4.3 \
  body-parser@1.20.3 \
  compression@1.7.5 \
  cookie-parser@1.4.7 \
  cors@2.8.5 \
  dotenv@16.4.5 \
  express@4.21.1 \
  express-rate-limit@7.4.1 \
  express-session@1.18.1 \
  express-validator@7.2.0 \
  helmet@8.0.0 \
  jsonwebtoken@9.0.2 \
  mongoose@8.8.1 \
  morgan@1.10.0 \
  multer@1.4.5-lts.1 \
  node-cache@5.1.2 \
  openai@4.20.1 \
  winston@3.17.0 \
  winston-daily-rotate-file@5.0.0

# Install backend dev dependencies
npm install --save-dev jest@29.7.0 nodemon@3.0.2

# Install frontend dependencies
cd ../adeo-request-system-frontend
npm install @hookform/resolvers@3.9.1 \
  @radix-ui/react-dropdown-menu@2.1.2 \
  @radix-ui/react-label@2.1.0 \
  @radix-ui/react-scroll-area@1.2.1 \
  @radix-ui/react-select@2.1.2 \
  @radix-ui/react-slot@1.1.0 \
  @tanstack/react-query@5.60.5 \
  axios@1.7.7 \
  class-variance-authority@0.7.0 \
  clsx@2.1.1 \
  date-fns@4.1.0 \
  lucide-react@0.460.0 \
  react@18.3.1 \
  react-dom@18.3.1 \
  react-router-dom@6.28.0 \
  tailwind-merge@2.5.4 \
  tailwindcss-animate@1.0.7 \
  zod@3.23.8 \
  zustand@5.0.1

# Install frontend dev dependencies
npm install --save-dev @eslint/js@9.13.0 \
  @types/react@18.3.12 \
  @types/react-dom@18.3.1 \
  @vitejs/plugin-react@4.3.3 \
  autoprefixer@10.4.20 \
  eslint@9.13.0 \
  eslint-plugin-react-hooks@5.0.0 \
  eslint-plugin-react-refresh@0.4.14 \
  globals@15.11.0 \
  postcss@8.4.49 \
  shadcn-ui@0.2.3 \
  tailwindcss@3.4.15 \
  typescript@5.6.2 \
  typescript-eslint@8.11.0 \
  vite@5.4.10

# Make the script executable
chmod +x install-requirements.sh
