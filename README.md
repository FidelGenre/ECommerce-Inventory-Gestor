☕ COFFEE BEANS – Artisan Coffee E-Commerce

Coffee Beans is a full-stack e-commerce platform where users can browse and purchase artisan coffee bean varieties.
It includes a fully featured Admin Panel to manage products, suppliers, inventory, purchases, sales, cashbox, and users — all in real time.

This project showcases a complete modern stack using:

React + Vite (frontend)

Node.js + Express (backend)

PostgreSQL (database)

Render for backend hosting

MercadoPago Sandbox for payments

🧩 GENERAL OVERVIEW
🏷️ Project Name: Coffee Beans
🛒 Type: E-commerce / Online Store
⚙️ Architecture: Frontend + REST API + PostgreSQL
💾 Database: PostgreSQL (local, Render, or Supabase)
🔐 Authentication: JWT via Secure HTTPOnly Cookies
🚀 Deployment: Backend on Render, Frontend on Render/Vercel
💳 Payments: MercadoPago Sandbox + Webhooks
📊 Admin Dashboard: Real-time KPIs and analytics
🎨 FRONTEND (React + Vite)

The frontend is built with React + Vite and styled using CSS Modules.
The UI is fully responsive and follows a warm coffee-themed design.

⭐ Main Features

⚛️ React + Vite

🎨 CSS Modules (Coffee-themed UI)

🛒 Persistent Shopping Cart

🔐 Login & Register with JWT (stored in cookies)

📦 Product listing with images

🧾 MercadoPago Sandbox Checkout

📱 Responsive layout

🛠️ Complete Admin Panel: Products, Inventory, Suppliers, Orders, Users

▶️ Run the Frontend
cd client
npm install
npm run dev


Default URL:
👉 http://localhost:5173

Frontend .env file

VITE_API_URL=http://localhost:5000

🧱 BACKEND (Node.js + Express)

The backend exposes a REST API used by both the storefront and the admin panel.
It handles authentication, inventory logic, purchases, sales, payments, and reporting.

📁 Backend Modules

/routes/auth.js – Login, Register, Roles

/routes/admin.js – Products, Suppliers, Inventory, Dashboard

/routes/orders.js – Orders and history

/routes/pay.js – MercadoPago integration + webhooks

/middlewares/auth.js – JWT auth + roleRequired

/db.js – PostgreSQL pool

/images – Static image hosting

⭐ Backend Features

✔️ Secure JWT Authentication (cookies: HTTPOnly, Secure, SameSite=None)

✔️ Role-based access (Admin / Client)

✔️ Full CRUD for products & suppliers

✔️ Inventory management with min stock alerts

✔️ Purchase tracking (supplier purchases)

✔️ Cashbox system with initial balance of 50M ARS

✔️ Dashboard KPIs:

Total sales (monthly)

Total purchases (monthly)

Net profit

Current cashbox balance

Best-selling product

Top 3 products of the month

✔️ Supplier payment workflow:

Automatically sums debts per supplier

Tracks quantities purchased

“Paid” button deducts debt from cashbox

✔️ MercadoPago Sandbox + redirect + notifications

✔️ CORS configuration compatible with mobile browsers

▶️ Run the Backend
cd server
npm install
npm run dev


Default URL:
👉 http://localhost:5000

🧰 DATABASE (PostgreSQL)

The database is designed for a real e-commerce workflow plus inventory and supplier management.

🗄️ Main Tables

users

beanstype (coffee types)

inventory

suppliers & suppliers_meta

orders & order_details

purchases

cashbox

Environment Variables
DATABASE_URL=postgres://user:pass@host:port/dbname
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
BASE_URL=http://localhost:5000
MP_PUBLIC_BASE_URL=http://localhost:5000


Supports:

Local PostgreSQL

Render PostgreSQL

Supabase PostgreSQL

💳 PAYMENTS (MercadoPago Sandbox)

Fully integrated payment system:

✔️ Payment preferences

✔️ Success / failure redirects

✔️ Test users (buyer/seller)

✔️ Webhooks for payment confirmation

✔️ Compatible with Render, local dev, and ngrok

🚀 DEPLOYMENT

Backend is deployed on Render, with:

CORS for both mobile + desktop

Secure cookies

Static image hosting (/images)

Frontend can be deployed on:

Render

Vercel

Netlify

🧭 HOW TO CLONE & RUN
git clone https://github.com/your-user/CoffeeBeans.git
cd CoffeeBeans

Backend
cd server
npm install
npm run dev

Frontend
cd client
npm install
npm run dev


Make sure .env matches your backend URL.

⚙️ QUICK SETUP SUMMARY

Clone the repository

Create PostgreSQL database

Configure .env (backend + frontend)

Run backend (npm run dev)

Run frontend (npm run dev)

Start exploring Coffee Beans ☕🚀
