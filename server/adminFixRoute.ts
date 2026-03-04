// TEMPORARY ADMIN FIX ROUTE - DELETE AFTER USE
import express, { Request, Response } from "express";
import { db } from "./db";

const router = express.Router();

// Temporary route to grant admin access
router.get("/grant-clawd-admin", async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `UPDATE users SET role = 'admin' WHERE email = 'clawd@spyglassrealty.com' RETURNING id, email, role`
    );
    
    if (result.rows.length > 0) {
      res.json({ 
        success: true, 
        message: "Admin access granted",
        user: result.rows[0] 
      });
    } else {
      res.json({ 
        success: false, 
        message: "User not found" 
      });
    }
  } catch (err: any) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

export default router;