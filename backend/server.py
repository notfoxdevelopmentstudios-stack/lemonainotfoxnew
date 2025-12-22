from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import json
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'notfox-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# OpenRouter Config
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# Create the main app
app = FastAPI(title="NotFox Development AI")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    username: str
    theme: str = "dark"
    subscription_tier: str = "free"
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ProjectCreate(BaseModel):
    name: str
    project_type: str = "roblox_game"

class ProjectResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    project_type: str
    user_id: str
    created_at: str
    updated_at: str

class MessageCreate(BaseModel):
    content: str
    project_id: str

class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    project_id: str
    role: str
    content: str
    created_at: str

class ChatRequest(BaseModel):
    project_id: str
    message: str
    model: str = "nex-agi/deepseek-v3.1-nex-n1:free"

class ThemeUpdate(BaseModel):
    theme: str

class SubscriptionCreate(BaseModel):
    plan: str  # weekly, monthly, yearly
    origin_url: str

class PaymentStatusResponse(BaseModel):
    status: str
    payment_status: str
    amount_total: float
    currency: str

# ============= AUTH HELPERS =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============= AUTH ROUTES =============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "username": user_data.username,
        "password_hash": hash_password(user_data.password),
        "theme": "dark",
        "subscription_tier": "free",
        "chat_count_today": 0,
        "last_chat_reset": now,
        "created_at": now,
        "updated_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            username=user_data.username,
            theme="dark",
            subscription_tier="free",
            created_at=now
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            username=user["username"],
            theme=user.get("theme", "dark"),
            subscription_tier=user.get("subscription_tier", "free"),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        theme=user.get("theme", "dark"),
        subscription_tier=user.get("subscription_tier", "free"),
        created_at=user["created_at"]
    )

@api_router.put("/auth/theme")
async def update_theme(theme_data: ThemeUpdate, user: dict = Depends(get_current_user)):
    valid_themes = ["light", "dark", "gray", "system"]
    if theme_data.theme not in valid_themes:
        raise HTTPException(status_code=400, detail="Invalid theme")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"theme": theme_data.theme, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Theme updated", "theme": theme_data.theme}

# ============= PROJECT ROUTES =============

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(project_data: ProjectCreate, user: dict = Depends(get_current_user)):
    project_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    project_doc = {
        "id": project_id,
        "name": project_data.name,
        "project_type": project_data.project_type,
        "user_id": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.projects.insert_one(project_doc)
    
    return ProjectResponse(**project_doc)

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(user: dict = Depends(get_current_user)):
    projects = await db.projects.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return projects

@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one(
        {"id": project_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    result = await db.projects.delete_one({"id": project_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete associated messages
    await db.messages.delete_many({"project_id": project_id})
    
    return {"message": "Project deleted"}

# ============= CHAT/MESSAGE ROUTES =============

@api_router.get("/messages/{project_id}", response_model=List[MessageResponse])
async def get_messages(project_id: str, user: dict = Depends(get_current_user)):
    # Verify project ownership
    project = await db.projects.find_one({"id": project_id, "user_id": user["id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    messages = await db.messages.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    return messages

@api_router.post("/chat")
async def chat(chat_request: ChatRequest, user: dict = Depends(get_current_user)):
    # Verify project ownership
    project = await db.projects.find_one({"id": chat_request.project_id, "user_id": user["id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check rate limits for free users
    if user.get("subscription_tier", "free") == "free":
        last_reset = user.get("last_chat_reset", "")
        chat_count = user.get("chat_count_today", 0)
        
        if last_reset:
            last_reset_dt = datetime.fromisoformat(last_reset.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) - last_reset_dt > timedelta(hours=24):
                chat_count = 0
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {"chat_count_today": 0, "last_chat_reset": datetime.now(timezone.utc).isoformat()}}
                )
        
        if chat_count >= 10:
            raise HTTPException(
                status_code=429, 
                detail="Daily chat limit reached. Upgrade to premium for unlimited chats."
            )
    
    # Save user message
    user_msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_message_doc = {
        "id": user_msg_id,
        "project_id": chat_request.project_id,
        "role": "user",
        "content": chat_request.message,
        "created_at": now
    }
    await db.messages.insert_one(user_message_doc)
    
    # Get conversation history
    history = await db.messages.find(
        {"project_id": chat_request.project_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    
    messages = [
        {
            "role": "system",
            "content": """You are NotFox AI, a specialized assistant for Roblox game development. 
You help developers create Lua/Luau scripts, game mechanics, UI systems, and more.
When providing code, always use proper Lua syntax highlighting.
Be concise and helpful. Format code in markdown code blocks with 'lua' language tag."""
        }
    ]
    
    for msg in history:
        messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })
    
    # Call OpenRouter API
    try:
        async with httpx.AsyncClient(timeout=60.0) as http_client:
            response = await http_client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://notfox.ai",
                    "X-Title": "NotFox Development AI"
                },
                json={
                    "model": chat_request.model,
                    "messages": messages
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail=f"AI service error: {response.text}")
            
            data = response.json()
            ai_content = data["choices"][0]["message"]["content"]
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timeout")
    except Exception as e:
        logging.error(f"OpenRouter error: {e}")
        raise HTTPException(status_code=500, detail="AI service unavailable")
    
    # Save AI response
    ai_msg_id = str(uuid.uuid4())
    ai_message_doc = {
        "id": ai_msg_id,
        "project_id": chat_request.project_id,
        "role": "assistant",
        "content": ai_content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(ai_message_doc)
    
    # Update chat count for free users
    if user.get("subscription_tier", "free") == "free":
        await db.users.update_one(
            {"id": user["id"]},
            {"$inc": {"chat_count_today": 1}}
        )
    
    return {
        "user_message": MessageResponse(**user_message_doc),
        "ai_message": MessageResponse(**ai_message_doc)
    }

# ============= SUBSCRIPTION/PAYMENT ROUTES =============

SUBSCRIPTION_PLANS = {
    "weekly": {"amount": 4.99, "name": "Weekly Premium", "features": ["Unlimited chats", "Priority support"]},
    "monthly": {"amount": 14.99, "name": "Monthly Premium", "features": ["Unlimited chats", "Priority support", "Advanced models"]},
    "yearly": {"amount": 99.99, "name": "Yearly Premium", "features": ["Unlimited chats", "Priority support", "Advanced models", "2 months free"]}
}

@api_router.post("/payments/checkout")
async def create_checkout(sub_data: SubscriptionCreate, user: dict = Depends(get_current_user)):
    if sub_data.plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    plan = SUBSCRIPTION_PLANS[sub_data.plan]
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        
        webhook_url = f"{sub_data.origin_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        success_url = f"{sub_data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{sub_data.origin_url}/pricing"
        
        checkout_request = CheckoutSessionRequest(
            amount=plan["amount"],
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user["id"],
                "plan": sub_data.plan,
                "email": user["email"]
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        transaction_id = str(uuid.uuid4())
        await db.payment_transactions.insert_one({
            "id": transaction_id,
            "user_id": user["id"],
            "session_id": session.session_id,
            "plan": sub_data.plan,
            "amount": plan["amount"],
            "currency": "usd",
            "status": "pending",
            "payment_status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"url": session.url, "session_id": session.session_id}
        
    except Exception as e:
        logging.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail="Payment service error")

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction and user if paid
        if status.payment_status == "paid":
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction and transaction.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"status": "completed", "payment_status": "paid"}}
                )
                
                # Upgrade user subscription
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {"subscription_tier": "premium", "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total / 100,
            "currency": status.currency
        }
        
    except Exception as e:
        logging.error(f"Payment status error: {e}")
        raise HTTPException(status_code=500, detail="Payment status check failed")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            user_id = webhook_response.metadata.get("user_id")
            if user_id:
                await db.users.update_one(
                    {"id": user_id},
                    {"$set": {"subscription_tier": "premium"}}
                )
                
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {"status": "completed", "payment_status": "paid"}}
                )
        
        return {"received": True}
        
    except Exception as e:
        logging.error(f"Webhook error: {e}")
        return {"received": True}

@api_router.get("/subscription/plans")
async def get_plans():
    return SUBSCRIPTION_PLANS

# ============= PLUGIN STATUS (Mock) =============

@api_router.get("/plugin/status")
async def get_plugin_status(user: dict = Depends(get_current_user)):
    # Mock plugin status - in real implementation this would check actual plugin connection
    return {
        "connected": False,
        "last_synced": None,
        "message": "Plugin not connected"
    }

# ============= BASE ROUTES =============

@api_router.get("/")
async def root():
    return {"message": "NotFox Development AI API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
