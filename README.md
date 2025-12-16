☕ Coffee Beans – Artisan Coffee E-Commerce

Coffee Beans is a full-stack e-commerce platform for browsing and purchasing artisan coffee beans, featuring a complete Admin Panel to manage products, inventory, suppliers, purchases, sales, cashbox movements, users, and KPIs.

Tech stack: React + Vite (Frontend) · Node.js + Express (Backend) · PostgreSQL (Database) · Render/Vercel (Deployment) · MercadoPago Sandbox + Webhooks (Payments)

🧩 General Overview
Feature	Description
🏷️ Project Name	Coffee Beans
🛒 Type	E-commerce / Online Store
⚙️ Architecture	React Frontend + Express REST API + PostgreSQL
💾 Database	PostgreSQL (local + cloud)
🔐 Auth	JWT + Secure HTTPOnly Cookies
🚀 Deployment	Backend on Render, Frontend on Render/Vercel
💳 Payments	MercadoPago Sandbox + Webhooks
📊 Admin Panel	KPIs, analytics, and management tools
🎨 Frontend – React + Vite

Built with React + Vite and CSS Modules (coffee-themed, fully responsive). Includes a product catalog with images, persistent cart, login/register, and MercadoPago Sandbox checkout.

🛠️ Admin Panel (Tabs)

📊 Dashboard: real-time KPIs (sales, purchases, profit) and operational overview.
🧾 Registros: logs/history for auditing sales, purchases, and movements.
📦 Products: CRUD for products (origin, roast level, price, images).
🏷️ Inventory: stock control, min-stock alerts, and quantity updates.
👨‍🔧 Suppliers: supplier CRUD, meta/alias, linking suppliers to coffee types and purchases.
💰 Cashbox (Caja): live balance + movements (sales, purchases, supplier payments, adjustments).
👥 Users: user management and role control (Admin/Client).
