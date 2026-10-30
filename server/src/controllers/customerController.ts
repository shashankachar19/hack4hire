// ============================================================================
// DispatchGrid — Customer Controller (Module H)
// REST controller for customer accounts, profile persistence, and booking history.
//
// Endpoints:
//   POST   /              Register or update customer profile (Upsert by phone)
//   GET    /              List customers (supports ?phone=... or ?email=...)
//   GET    /:id           Get customer profile with full DB booking history
//   PATCH  /:id           Update customer profile
//   DELETE /:id           Remove customer profile
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/db';
import { createCustomerSchema, updateCustomerSchema } from '../utils/validation';
import { ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { sendWelcomeEmail } from '../services/emailService';

const router = Router();

// ============================================================================
// POST / — Register or Upsert Customer
// ============================================================================
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createCustomerSchema.parse(req.body);

    // Upsert customer by unique phone number
    const customer = await prisma.customer.upsert({
      where: { phone: data.phone },
      update: {
        name: data.name,
        email: data.email,
        address: data.address,
        age: data.age,
      },
      create: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        age: data.age,
      },
    });

    // Send welcome email if customer has email address
    if (customer.email) {
      sendWelcomeEmail({
        to: customer.email,
        name: customer.name,
        address: customer.address || undefined,
        phone: customer.phone,
      }).catch((e) => console.error('[CUSTOMER] Welcome email error:', e.message));
    }

    const response: ApiResponse = {
      success: true,
      data: customer,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// GET / — List or Search Customers
// ============================================================================
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, email } = req.query;
    const where: any = {};
    if (typeof phone === 'string') where.phone = phone;
    if (typeof email === 'string') where.email = email;

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { jobs: true },
        },
      },
    });

    const response: ApiResponse = {
      success: true,
      data: customers,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// GET /:id — Get Customer by ID with Bookings
// ============================================================================
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        jobs: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignments: {
              include: {
                technician: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new AppError(404, 'NOT_FOUND', `Customer with ID '${id}' not found`);
    }

    const response: ApiResponse = {
      success: true,
      data: customer,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// PATCH /:id — Update Customer Profile
// ============================================================================
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = updateCustomerSchema.parse(req.body);
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `Customer with ID '${id}' not found`);
    }

    const updated = await prisma.customer.update({
      where: { id },
      data,
    });

    const response: ApiResponse = {
      success: true,
      data: updated,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
