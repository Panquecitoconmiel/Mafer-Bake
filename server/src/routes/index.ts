import { Router } from "express";
import multer from "multer";
import * as A from "../controllers/admin.controller.js";
import * as auth from "../controllers/auth.controller.js";
import * as shop from "../controllers/shop.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/security.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

export const api = Router();

api.get("/health", shop.health);
api.get("/store", shop.storeInfo);

// ── Autenticación ──
api.post("/auth/register", authLimiter, auth.register);
api.post("/auth/login", authLimiter, auth.login);
api.post("/auth/logout", auth.logout);
api.get("/auth/me", auth.me);
api.post("/auth/forgot-password", authLimiter, auth.forgotPassword);
api.post("/auth/reset-password", authLimiter, auth.resetPassword);
api.post("/auth/verify-email", authLimiter, auth.verifyEmail);
api.post("/auth/resend-verification", authLimiter, requireAuth, auth.resendVerification);

// ── Cuenta del cliente ──
api.patch("/account/profile", requireAuth, auth.updateProfile);
api.post("/account/password", requireAuth, authLimiter, auth.changePassword);
api.get("/account/addresses", requireAuth, auth.listAddresses);
api.post("/account/addresses", requireAuth, auth.saveAddress);
api.put("/account/addresses/:id", requireAuth, auth.saveAddress);
api.delete("/account/addresses/:id", requireAuth, auth.deleteAddress);
api.get("/account/favorites", requireAuth, auth.listFavorites);
api.put("/account/favorites/:productId", requireAuth, auth.addFavorite);
api.delete("/account/favorites/:productId", requireAuth, auth.removeFavorite);

// ── Catálogo ──
api.get("/products", shop.listProducts);
api.get("/products/:slug", shop.getProduct);
api.get("/categories", shop.listCategories);
api.get("/availability", shop.availability);

// ── Carrito (invitado o cliente) ──
api.get("/cart", shop.getCart);
api.post("/cart/items", shop.addCartItem);
api.patch("/cart/items/:id", shop.updateCartItem);
api.delete("/cart/items/:id", shop.removeCartItem);

// ── Pedidos ──
api.post("/orders/quote", requireAuth, shop.quoteOrder);
api.post("/orders", requireAuth, shop.createOrder);
api.get("/orders", requireAuth, shop.listOrders);
api.get("/orders/:id", requireAuth, shop.getOrder);
api.post("/orders/:id/cancel", requireAuth, shop.cancelOrder);

// ── Pagos ── (el webhook se monta aparte con cuerpo sin procesar, ver app.ts)
api.post("/payments/checkout-session", requireAuth, shop.createCheckoutSession);
api.post("/payments/sync/:orderId", requireAuth, shop.syncOrderPayment);
api.get("/payments/:id", requireAuth, shop.getPayment);

// ── Administración (todas protegidas por rol en el servidor) ──
const admin = Router();
admin.use(requireAdmin);
admin.get("/dashboard", A.dashboard);
admin.get("/categories", A.listCategories);
admin.post("/categories", A.createCategory);
admin.put("/categories/:id", A.updateCategory);
admin.delete("/categories/:id", A.deleteCategory);
admin.get("/products", A.listProducts);
admin.post("/products", A.createProduct);
admin.get("/products/:id", A.getProduct);
admin.put("/products/:id", A.updateProduct);
admin.patch("/products/:id/status", A.setProductStatus);
admin.delete("/products/:id", A.deleteProduct);
admin.post("/uploads", upload.single("image"), A.uploadImage);
admin.get("/inventory", A.listInventory);
admin.get("/inventory/movements", A.listMovements);
admin.post("/inventory/:id/adjust", A.adjustInventory);
admin.get("/orders", A.listOrders);
admin.get("/orders/:id", A.getOrder);
admin.patch("/orders/:id/status", A.updateOrderStatus);
admin.patch("/orders/:id/notes", A.updateOrderNotes);
admin.get("/customers", A.listCustomers);
admin.get("/customers/:id", A.getCustomer);
admin.patch("/customers/:id/active", A.setCustomerActive);
admin.get("/payments", A.listPayments);
admin.post("/payments/:id/refunds", A.refundPayment);
admin.get("/coupons", A.listCoupons);
admin.post("/coupons", A.createCoupon);
admin.put("/coupons/:id", A.updateCoupon);
admin.get("/settings", A.getSettingsAdmin);
admin.put("/settings", A.saveSettings);
admin.get("/delivery", A.listSlots);
admin.post("/delivery/slots", A.createSlot);
admin.put("/delivery/slots/:id", A.updateSlot);
admin.post("/delivery/blocked-dates", A.addBlockedDate);
admin.delete("/delivery/blocked-dates/:id", A.removeBlockedDate);
admin.get("/audit", A.listAudit);
api.use("/admin", admin);
