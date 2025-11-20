☕ Coffee Beans – Artisan Coffee E-Commerce

Coffee Beans is a full-stack e-commerce platform for browsing and purchasing artisan coffee beans.
It includes a fully featured Admin Panel to manage products, suppliers, inventory, purchases, sales, cashbox, and users.

This project demonstrates a real modern full-stack application using:

React + Vite (Frontend)

Node.js + Express (Backend)

PostgreSQL (Database)

Render / Vercel (Deployment)

MercadoPago Sandbox (Payments)

🧩 General Overview
Feature	Description
🏷️ Project Name	Coffee Beans
🛒 Type	E-commerce / Online Store
⚙️ Architecture	React Frontend + Express API + PostgreSQL
💾 Database	PostgreSQL
🔐 Auth	JWT + Secure HTTPOnly Cookies
🚀 Deployment	Backend on Render, Frontend on Render/Vercel
💳 Payments	MercadoPago Sandbox + Webhooks
📊 Admin Dashboard	Real-time KPIs & analytics
🎨 Frontend – React + Vite

The frontend is built with React + Vite and styled using CSS Modules, featuring a warm coffee-themed UI and a fully responsive layout.

🌟 Main Features

⚛️ React + Vite

🎨 CSS Modules (Coffee-themed UI)

🛒 Persistent Shopping Cart

🔐 Login & Register with JWT

📦 Product catalog with images

💳 MercadoPago Sandbox checkout

📱 Fully responsive

🛠️ Complete Admin Panel (Products, Inventory, Suppliers, Users, Dashboard)

🧱 Backend – Node.js + Express

The backend provides a clean REST API used by the storefront and admin panel.

🌟 Main Features

🔐 JWT authentication via HTTPOnly cookies

👤 Role-based access (Admin / Client)

📦 Products & inventory management

🧾 Purchases linked to suppliers

💰 Cashbox system with real-time balance

📊 Dashboard

👨‍🔧 Supplier system with:

💳 MercadoPago integration (sandbox)

📡 Webhooks for payment notifications

🌐 CORS configured for mobile & desktop

🧰 Database – PostgreSQL

Coffee Beans uses PostgreSQL both locally and in cloud environments (Render / Supabase).

🗄️ Main Tables

User & Authentication

app_user → System users (admin / client)

☕ Products & Coffee Types

beanstype → Coffee types (name, origin, roast level, price, image, etc.)

beanstype_supplier → Many-to-many relationship between coffee types and suppliers

📦 Inventory System

inventory → Main inventory (stock in kilos or units)

bags_inventory → Inventory for packaged coffee bags

inventory_bags → Relationship between general inventory and bag items

🧾 Orders & Sales

orders → Customer orders

order_items → Items inside each order

sales → Final confirmed sales records

👨‍🔧 Suppliers

suppliers → Suppliers (name, category, etc.)

suppliers_meta → Additional supplier data (email, phone, alias, etc.)

💸 Purchases (Stock Inwards)

purchases → Purchases made from suppliers

purchase_items → Detailed items inside each purchase (quantity, unit cost)

💰 Cashbox

cashbox → Current cashbox balance

cashbox_movements → All financial movements (sales, purchases, payments, adjustments)

💳 Payments / MercadoPago

mp_events → Events received from the MercadoPago webhook

processed_payments → Successfully processed payments

processed_webhooks → Stored webhooks to avoid duplicate processing

💳 Payments – MercadoPago Sandbox

The project includes full support for MercadoPago test payments:

✔️ Payment preferences

✔️ Redirect (success / failure)

✔️ Test users (seller & buyer)

✔️ Webhooks

✔️ ngrok support in development

🚀 Deployment
🌐 Backend (Render)

Static images served from /images

CORS configured for mobile + desktop

Secure cookies enabled (trust proxy)

🌐 Frontend (Vercel / Render)

Build with Vite

Environment variables for API URL

🧭 How to Clone & Run
git clone https://github.com/YOUR-USER/CoffeeBeans.git
cd CoffeeBeans

▶️ Backend
cd server
npm install
npm run dev

.env (Backend)
DATABASE_URL=postgres://user:pass@host:port/dbname
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
BASE_URL=http://localhost:5000
MP_PUBLIC_BASE_URL=http://localhost:5000

▶️ Frontend
cd client
npm install
npm run dev

Default URL: http://localhost:5173

.env (Frontend)
VITE_API_URL=http://localhost:5000
