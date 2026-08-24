# TraderOS

TradeFlow / Buildr / SiteSupply OS

🏗 1. SYSTEM ARCHITECTURE

🔧 Tech Stack (fast + scalable)

Backend

Supabase (Postgres + RLS + Auth)

 Edge Functions (for pricing, dispatch)

 Storage (photos/videos)

Frontend

(web app / dashboard)

(mobile apps)

Maps & Routing

 Google Maps API 

👥 2. USER ROLES

roles = ['customer', 'trade', 'driver', 'admin']

🧩 3. CORE DATABASE SCHEMA (Supabase)

👤 users

id (uuid)
role (enum)
name
email
phone
rating
created_at

🏗 jobs

id
customer_id
title
description
address
lat
lng
budget
status (posted, quoted, active, completed)
created_at

💬 job_media

id
job_id
url
type (image/video)
timestamp
geo_lat
geo_lng

💰 quotes

id
job_id
trade_id
price
labour_cost
materials_estimate
notes
status (pending, accepted, rejected)

👷 job_assignments

id
job_id
trade_id
accepted_at
status

🧱 material_orders

id
job_id
trade_id
merchant_name
pickup_address
delivery_address
status (pending, ready, collected, delivered)
total_value
created_at

📦 order_items

id
order_id
name
quantity
price

🚚 deliveries

id
order_id
driver_id
vehicle_type
distance_miles
urgency_level
manpower_required
price
status (assigned, picked_up, delivered)

🚐 drivers

id
user_id
vehicle_type
capacity
verified
rating

📊 rate_cards (CSV driven)

id
vehicle_type
base_fee
per_mile_rate
weight_multiplier
urgency_multiplier
manpower_cost
wait_time_rate

🧾 invoices (basic MVP)

id
job_id
trade_id
amount
status
created_at

🧮 4. DELIVERY PRICING ENGINE (CORE LOGIC)

Edge Function (pseudo)

def calculate_delivery(data):
    base = get_base_fee(data.vehicle_type)
    distance_cost = data.miles * per_mile_rate
    
    subtotal = base + distance_cost
    
    subtotal *= weight_multiplier
    subtotal *= urgency_multiplier
    
    manpower_cost = data.manpower * manpower_fee
    
    total = subtotal + manpower_cost
    
    return round(total, 2)

CSV Example (uploadable)

vehicle_type,base_fee,per_mile,urgency_multiplier,manpower_fee
car,8,1.2,1.2,5
small_van,15,1.5,1.5,10
luton,35,2.5,2.0,20

👉 Admin uploads → auto updates pricing

🔄 5. CORE USER FLOWS

🧑‍💼 CUSTOMER FLOW

 Post job

 Upload images/videos

 Receive quotes

 Accept trade

 Track job progress

👷 TRADE FLOW

 Receive lead

 Submit quote

 Job accepted → “Active Job”

Inside job:

 Order materials

 Request delivery

 Upload work proof

 Generate invoice

🧱 MATERIAL ORDER FLOW

 Trade selects:

 Merchant (manual MVP)

 Items

 Chooses:

 Merchant delivery OR

 “Urgent delivery”

🚚 DELIVERY FLOW

 Trade clicks “Request Delivery”

 System:

 Calculates price

 Finds drivers

 Broadcast job:

 Closest drivers

 Matching vehicle

 Driver accepts

 Pickup → Deliver → Proof

🚐 DRIVER FLOW

 See available jobs

 Accept job

 Navigate to merchant

 Collect materials

 Deliver to site

 Upload proof (photo/signature)

📱 6. UI / SCREEN STRUCTURE

👷 TRADE APP

Dashboard

 Active jobs

 Pending quotes

Jobs Screen

 Job details

 Tabs:

 Materials

 Deliveries

 Media

 Invoice

Materials Screen

 Add items

 Select merchant

 Request delivery

Delivery Screen

 Price preview

 Request driver

🚚 DRIVER APP

 Available jobs list

 Job details

 Navigation

 Upload proof

🧑 CUSTOMER APP

 Post job

 View quotes

 Chat

 Track job

🧑‍💻 ADMIN DASHBOARD

 Users

 Jobs

 Deliveries

 Rate cards upload

 Analytics

🔌 7. PAYMENTS STRUCTURE (YOUR MODEL)

💳 Flow

Materials

 Paid direct to merchant

 Outside platform OR via redirect

Delivery

 Paid to YOU

 You:

 Split with driver

 Keep margin

🚀 8. DISPATCH LOGIC

Driver Matching

drivers = find_nearby_drivers(location)

filtered = [
  d for d in drivers
  if d.vehicle_type >= required_vehicle
]

sorted = sort_by(distance, rating)

send_job(filtered[:5])

🧠 9. MVP FEATURES SUMMARY

✅ Included

 Marketplace (jobs + quotes)

 Material ordering (manual)

 Delivery network

 Pricing engine (CSV)

 Photo/video proof use @project:49b2924d-63b4-4d55-9f82-352c0081f357:"BASIC CAM" 

 Basic invoicing

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://jobflow-tradehub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/27b4c132-3281-4ca4-a913-7ce0f7915510).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
