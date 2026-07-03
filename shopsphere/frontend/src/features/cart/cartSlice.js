import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";

function getGuestSessionId() {
  let id = sessionStorage.getItem("guest_session_id");
  if (!id) {
    id = "guest-" + crypto.randomUUID();
    sessionStorage.setItem("guest_session_id", id);
  }
  return id;
}

function guestHeaders() {
  const token = sessionStorage.getItem("access_token");
  if (token) return {};
  return { "X-Session-Id": getGuestSessionId() };
}

export const fetchCart = createAsyncThunk("cart/fetch", async () => {
  const { data } = await api.get("/cart", { headers: guestHeaders() });
  return data.data;
});

export const addToCart = createAsyncThunk(
  "cart/addItem",
  async ({ product_id, variant_id = null, quantity = 1 }) => {
    const { data } = await api.post(
      "/cart/items",
      { product_id, variant_id, quantity },
      { headers: guestHeaders() }
    );
    return data.data;
  }
);

export const updateCartItem = createAsyncThunk(
  "cart/updateItem",
  async ({ item_id, quantity }) => {
    await api.put(`/cart/items/${item_id}`, { quantity }, { headers: guestHeaders() });
    return { item_id, quantity };
  }
);

export const removeCartItem = createAsyncThunk(
  "cart/removeItem",
  async (item_id) => {
    await api.delete(`/cart/items/${item_id}`, { headers: guestHeaders() });
    return item_id;
  }
);

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: [], status: "idle" },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.items = action.payload.items || [];
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        const item = state.items.find((i) => i.id === action.payload.item_id);
        if (item) item.quantity = action.payload.quantity;
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.payload);
      });
  },
});

export default cartSlice.reducer;
