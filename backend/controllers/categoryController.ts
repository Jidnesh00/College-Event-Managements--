import { Request, Response } from 'express';
import { query, execute } from '../config/db.js';

export async function getAllCategories(req: Request, res: Response) {
  try {
    const categories = await query(`
      SELECT 
        c.*,
        COUNT(e.id) AS event_count
      FROM categories c
      LEFT JOIN events e ON e.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    return res.json({ success: true, categories });
  } catch (error: any) {
    console.error('[Categories Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve categories.' });
  }
}

export async function createCategory(req: Request, res: Response) {
  try {
    const { name, description = '' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const existing = await query('SELECT id FROM categories WHERE LOWER(name) = ?', [name.trim().toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Category with this name already exists.' });
    }

    const result = await execute('INSERT INTO categories (name, description) VALUES (?, ?)', [
      name.trim(),
      description.trim()
    ]);

    const created = await query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    return res.status(201).json({ success: true, message: 'Category created.', category: created[0] });
  } catch (error: any) {
    console.error('[Create Category Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to create category.' });
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, description = '' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const existing = await query('SELECT id FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    await execute('UPDATE categories SET name = ?, description = ? WHERE id = ?', [
      name.trim(),
      description.trim(),
      id
    ]);

    const updated = await query('SELECT * FROM categories WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Category updated.', category: updated[0] });
  } catch (error: any) {
    console.error('[Update Category Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update category.' });
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const eventCount = await query('SELECT COUNT(*) as count FROM events WHERE category_id = ?', [id]);
    if (eventCount[0]?.count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${eventCount[0].count} events are linked to it. Reassign or delete those events first.`
      });
    }

    await execute('DELETE FROM categories WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Category removed successfully.' });
  } catch (error: any) {
    console.error('[Delete Category Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
}
