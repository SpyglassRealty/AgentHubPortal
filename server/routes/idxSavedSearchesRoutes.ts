import { Request, Response } from 'express';
import { db } from '../db';
import { idxSavedSearches } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';

export default function idxSavedSearchesRoutes(app: any, isAuthenticated: any) {
  
  // GET /api/admin/idx-saved-searches - List all saved searches (auth required)
  app.get('/api/admin/idx-saved-searches', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const searches = await db.select().from(idxSavedSearches).orderBy(desc(idxSavedSearches.createdAt));
      res.json(searches);
    } catch (error) {
      console.error('[IDX Saved Searches] Error fetching searches:', error);
      res.status(500).json({ error: 'Failed to fetch saved searches' });
    }
  });

  // POST /api/admin/idx-saved-searches - Create new saved search (auth required)
  app.post('/api/admin/idx-saved-searches', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { name, slug, pageTitle, metaDescription, filters, status } = req.body;
      
      if (!name || !slug) {
        return res.status(400).json({ error: 'Name and slug are required' });
      }

      const newSearch = await db.insert(idxSavedSearches).values({
        name,
        slug,
        pageTitle: pageTitle || null,
        metaDescription: metaDescription || null,
        filters: filters || {},
        status: status || 'draft'
      }).returning();

      res.json(newSearch[0]);
    } catch (error: any) {
      console.error('[IDX Saved Searches] Error creating search:', error);
      
      // Handle unique constraint violation for slug
      if (error.code === '23505' && error.constraint === 'idx_saved_searches_slug_unique') {
        return res.status(409).json({ error: 'Slug already exists' });
      }
      
      res.status(500).json({ error: 'Failed to create saved search' });
    }
  });

  // PUT /api/admin/idx-saved-searches/:id - Update saved search (auth required)
  app.put('/api/admin/idx-saved-searches/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { name, slug, pageTitle, metaDescription, filters, status } = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      const updatedSearch = await db.update(idxSavedSearches)
        .set({
          name: name || undefined,
          slug: slug || undefined,
          pageTitle: pageTitle !== undefined ? pageTitle : undefined,
          metaDescription: metaDescription !== undefined ? metaDescription : undefined,
          filters: filters !== undefined ? filters : undefined,
          status: status || undefined,
          updatedAt: new Date()
        })
        .where(eq(idxSavedSearches.id, id))
        .returning();

      if (updatedSearch.length === 0) {
        return res.status(404).json({ error: 'Saved search not found' });
      }

      res.json(updatedSearch[0]);
    } catch (error: any) {
      console.error('[IDX Saved Searches] Error updating search:', error);
      
      // Handle unique constraint violation for slug
      if (error.code === '23505' && error.constraint === 'idx_saved_searches_slug_unique') {
        return res.status(409).json({ error: 'Slug already exists' });
      }
      
      res.status(500).json({ error: 'Failed to update saved search' });
    }
  });

  // DELETE /api/admin/idx-saved-searches/:id - Delete saved search (auth required)
  app.delete('/api/admin/idx-saved-searches/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      const deletedSearch = await db.delete(idxSavedSearches)
        .where(eq(idxSavedSearches.id, id))
        .returning();

      if (deletedSearch.length === 0) {
        return res.status(404).json({ error: 'Saved search not found' });
      }

      res.json({ message: 'Saved search deleted successfully' });
    } catch (error) {
      console.error('[IDX Saved Searches] Error deleting search:', error);
      res.status(500).json({ error: 'Failed to delete saved search' });
    }
  });

  // GET /api/public/idx-saved-searches/:slug - Get public saved search by slug (NO auth)
  app.get('/api/public/idx-saved-searches/:slug', async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      
      const search = await db.select().from(idxSavedSearches)
        .where(eq(idxSavedSearches.slug, slug))
        .limit(1);

      if (search.length === 0) {
        return res.status(404).json({ error: 'Saved search not found' });
      }

      // Only return published searches for public access
      if (search[0].status !== 'published') {
        return res.status(404).json({ error: 'Saved search not found' });
      }

      res.json(search[0]);
    } catch (error) {
      console.error('[IDX Saved Searches] Error fetching public search:', error);
      res.status(500).json({ error: 'Failed to fetch saved search' });
    }
  });
}