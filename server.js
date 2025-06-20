//For changing of quantity in cart
app.put("/cart/:cartId", async (req, res) => {
  const { cartId } = req.params;
  const { quantity } = req.body;

  // Log the request for debugging
  console.log(`[CART UPDATE] Request received - cartId=${cartId}, quantity=${quantity}`);
  
  try {
    console.log(`[CART UPDATE] Connecting to database...`);
    const pool = await sql.connect(config);
    console.log(`[CART UPDATE] Connected to database successfully`);

    // Check if the cart item exists in the cart_items table
    console.log(`[CART UPDATE] Checking if cart item ${cartId} exists...`);
    let oldRow;
    try {
      oldRow = await pool.request().input("cartItemId", sql.Int, cartId).query(`
          SELECT cart_item_id, cart_id, product_id, quantity, voucher_id, added_at
          FROM cart_items
          WHERE cart_item_id = @cartItemId
        `);
      console.log(`[CART UPDATE] Query result:`, oldRow.recordset);
    } catch (checkErr) {
      console.error(`[CART UPDATE] Error checking cart item existence:`, checkErr);
      return res.status(500).json({ error: `Database error checking cart item: ${checkErr.message}` });
    }

    if (oldRow.recordset.length === 0) {
      console.log(`[CART UPDATE] Cart item ${cartId} not found`);
      return res.status(404).json({ error: "Cart item not found" });
    }

    if (quantity < 1) {
      // If new quantity is less than 1 — delete the cart item
      console.log(`[CART UPDATE] Deleting cart item ${cartId} due to quantity < 1`);
      try {
        const deleteResult = await pool.request().input("cartItemId", sql.Int, cartId).query(`
          DELETE FROM cart_items
          WHERE cart_item_id = @cartItemId
        `);
        console.log(`[CART UPDATE] Delete result:`, deleteResult.rowsAffected);
        return res.json({ success: true, message: "Item removed from cart" });
      } catch (deleteErr) {
        console.error(`[CART UPDATE] Error deleting cart item:`, deleteErr);
        return res.status(500).json({ error: `Failed to delete cart item: ${deleteErr.message}` });
      }
    }

    // Else update the quantity
    console.log(`[CART UPDATE] Updating cart item ${cartId} to quantity ${quantity}`);
    try {
      // Log the cart item we're updating
      console.log(`[CART UPDATE] Current item data:`, oldRow.recordset[0]);
      
      // Simple update query that works with the actual database schema
      // Don't reference updated_at as it doesn't exist in the table
      const updateQuery = `
        UPDATE cart_items
        SET quantity = @quantity
        WHERE cart_item_id = @cartItemId
      `;
      console.log(`[CART UPDATE] Executing SQL Query: ${updateQuery}`);
      
      const updateResult = await pool
        .request()
        .input("cartItemId", sql.Int, cartId)
        .input("quantity", sql.Int, quantity)
        .query(updateQuery);
        
      console.log(`[CART UPDATE] Update result:`, updateResult.rowsAffected);

      // Return success with some additional information
      return res.json({ 
        success: true, 
        message: "Quantity updated successfully",
        updated: {
          cart_item_id: cartId,
          quantity: quantity
        }
      });
    } catch (updateErr) {
      console.error(`[CART UPDATE] Error updating cart item:`, updateErr);
      return res.status(500).json({ error: `Failed to update cart quantity: ${updateErr.message}` });
    }
  } catch (err) {
    console.error(`[CART UPDATE] General error:`, err);
    res.status(500).json({ error: `Internal server error: ${err.message}` });
  }
}); 