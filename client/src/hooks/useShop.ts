import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const setCart = (cart: Cart) => qc.setQueryData(["cart"], cart);
  const onError = (e: unknown) => {
    notify(errorMessage(e), "error");
    qc.invalidateQueries({ queryKey: ["cart"] });
  };

  const addMutation = useMutation({
    mutationFn: (body: { productId: string; variantId?: string | null; quantity: number; selections: Selections }) => api.addToCart(body),
    onSuccess: (cart) => {
      setCart(cart);
      notify("¡Listo! Agregamos el producto a tu carrito.");
    },
    onError,
  });
  type AddBody = Parameters<typeof addMutation.mutate>[0];
  type AddOptions = Parameters<typeof addMutation.mutate>[1];
  /** Para comprar hay que iniciar sesión: si no hay sesión, se lleva al inicio de sesión y luego regresa aquí. */
  const add = {
    isPending: addMutation.isPending,
    mutate: (body: AddBody, options?: AddOptions) => {
      if (loading) return;
      if (!user) {
        notify("Inicia sesión o crea tu cuenta para comprar.", "info");
        navigate(`/ingresar?volver=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      addMutation.mutate(body, options);
    },
  };
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
