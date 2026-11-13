"use server";
import { getCurrentUser } from "@/server/auth/session";
import { addToCart, cartCount, setCartCoupon, setCartQuantity, getCartView } from "@/server/services/cart";
import { toActionError, type ActionResult } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";
import { requestMeta } from "@/server/http";
import { COUPON_ERROR_MESSAGES } from "@/lib/pricing";

export async function addToCartAction(variantId: string, quantity: number): Promise<ActionResult<{ count: number }>> {
  try {
    const { ip } = await requestMeta();
    await enforceRateLimit(`cart:${ip}`, 120, 60);
    const u = await getCurrentUser();
    await addToCart(variantId, quantity, u?.id ?? null);
    return { ok: true, data: { count: await cartCount() } };
  } catch (e) {
    return toActionError(e);
  }
}

export async function setQuantityAction(variantId: string, quantity: number): Promise<ActionResult> {
  try {
    await setCartQuantity(variantId, quantity);
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

export async function applyCouponAction(code: string): Promise<ActionResult> {
  try {
    const { ip } = await requestMeta();
    await enforceRateLimit(`coupon:${ip}`, 15, 600, "Muitas tentativas de cupom. Aguarde alguns minutos.");
    if (!code.trim()) return { ok: false, error: "Digite o código do cupom." };
    await setCartCoupon(code);
    const u = await getCurrentUser();
    const view = await getCartView(u?.email ?? null, u?.id ?? null);
    if (view?.pricing?.couponError) {
      await setCartCoupon(null);
      return { ok: false, error: COUPON_ERROR_MESSAGES[view.pricing.couponError] };
    }
    return { ok: true, message: "Cupom aplicado!" };
  } catch (e) {
    return toActionError(e);
  }
}

export async function removeCouponAction(): Promise<ActionResult> {
  try {
    await setCartCoupon(null);
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}
