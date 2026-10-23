import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../context/ToastContext";
import { api, ApiError } from "../services/api";
import type { Cart, Selections } from "../types";

export const useStore = () => useQuery({ queryKey: ["store"], queryFn: api.store, staleTime: 10 * 60_000 });
export const useCategories = () => useQuery({ queryKey: ["categories"], queryFn: api.categories, staleTime: 10 * 60_000 });
export const useCart = () => useQuery({ queryKey: ["cart"], queryFn: api.cart });

export const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : "Ocurrió un error inesperado.");

export function useCartActions() {
  const qc = useQueryClient();
  const notify = useToast();
  const setCart = (cart: Cart) => qc.setQueryData(["cart"], cart);
  const onError = (e: unknown) => {
    notify(errorMessage(e), "error");
    qc.invalidateQueries({ queryKey: ["cart"] });
  };

  const add = useMutation({
    mutationFn: (body: { productId: string; variantId?: string | null; quantity: number; selections: Selections }) => api.addToCart(body),
    onSuccess: (cart) => {
      setCart(cart);
      notify("¡Listo! Agregamos el producto a tu carrito.");
    },
    onError,
  });
  const update = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => api.updateCartItem(id, quantity),
    onSuccess: setCart,
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.removeCartItem(id),
    onSuccess: (cart) => {
      setCart(cart);
      notify("Artículo eliminado del carrito.");
    },
    onError,
  });
  return { add, update, remove };
}
