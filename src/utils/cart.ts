// Cart utilities
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

const CART_KEY = 'nordleaf_cart';

export function getCart(): Cart {
  if (typeof window === 'undefined') {
    return { items: [], total: 0 };
  }
  
  try {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : { items: [], total: 0 };
  } catch {
    return { items: [], total: 0 };
  }
}

export function saveCart(cart: Cart): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    // Dispatch custom event to notify cart updates
    window.dispatchEvent(new Event('cart-updated'));
  }
}

export function addToCart(product: {
  id: string;
  name: string;
  price: number;
  image: string;
}): void {
  const cart = getCart();
  const existingItem = cart.items.find((item) => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.items.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image,
    });
  }

  cart.total = calculateTotal(cart.items);
  saveCart(cart);
}

export function removeFromCart(productId: string): void {
  const cart = getCart();
  cart.items = cart.items.filter((item) => item.id !== productId);
  cart.total = calculateTotal(cart.items);
  saveCart(cart);
}

export function updateQuantity(productId: string, quantity: number): void {
  const cart = getCart();
  const item = cart.items.find((item) => item.id === productId);

  if (item) {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      item.quantity = quantity;
      cart.total = calculateTotal(cart.items);
      saveCart(cart);
    }
  }
}

export function clearCart(): void {
  const emptyCart: Cart = { items: [], total: 0 };
  saveCart(emptyCart);
}

export function calculateTotal(items: CartItem[]): number {
  return parseFloat(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)
  );
}

export function getCartCount(): number {
  const cart = getCart();
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}
