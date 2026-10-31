// ============================================================================
// DispatchGrid — Technician Controller (Module A)
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/db';
import { createTechnicianSchema, updateTechnicianSchema } from '../utils/validation';
import { ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { saveTechContact, getTechContact } from '../utils/techContacts';

const router = Router();

function deserializeTechnician(tech: any): any {
  const contact = getTechContact(tech.id);
  return {
    ...tech,
    skills: typeof tech.skills === 'string' ? JSON.parse(tech.skills) : tech.skills,
    serviceZones: typeof tech.serviceZones === 'string' ? JSON.parse(tech.serviceZones) : tech.serviceZones,
    email: contact.email,
    phone: contact.phone,
  };
}

// POST / — Create a new technician
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createTechnicianSchema.parse(req.body);
    const technician = await prisma.technician.create({
      data: {
        name: data.name,
        skills: JSON.stringify(data.skills),
        serviceZones: JSON.stringify(data.serviceZones),
        shiftStart: data.shiftStart,
        shiftEnd: data.shiftEnd,
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });

    // Save contact info for live job email alerts
    saveTechContact(technician.id, {
      name: data.name,
      email: (req.body as any).email,
      phone: (req.body as any).phone,
    });

    res.status(201).json({ success: true, data: deserializeTechnician(technician) } as ApiResponse);
  } catch (err) { next(err); }
});

// GET / — List all technicians with optional filters
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { skill, zone, available } = req.query;
    const where: any = {};
    if (available === 'true') where.isAvailable = true;
    else if (available === 'false') where.isAvailable = false;
    if (typeof skill === 'string') where.skills = { contains: `"${skill}"` };
    if (typeof zone === 'string') where.serviceZones = { contains: `"${zone}"` };

    const technicians = await prisma.technician.findMany({ where, orderBy: { name: 'asc' } });
    res.json({ success: true, data: technicians.map(deserializeTechnician) } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /:id — Get a single technician with current assignments
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const technician = await prisma.technician.findUnique({
      where: { id },
      include: {
        assignments: {
          include: { job: true },
          orderBy: { scheduledStart: 'asc' },
        },
      },
    });
    if (!technician) {
      throw new AppError(404, 'NOT_FOUND', `Technician with ID '${id}' not found`);
    }
    const deserialized = deserializeTechnician(technician);
    deserialized.assignments = ((technician as any).assignments || []).map((a: any) => ({
      ...a,
      job: a.job ? {
        ...a.job,
        requiredSkills: typeof a.job.requiredSkills === 'string' ? JSON.parse(a.job.requiredSkills) : a.job.requiredSkills,
      } : a.job,
    }));
    res.json({ success: true, data: deserialized } as ApiResponse);
  } catch (err) { next(err); }
});

// PATCH /:id — Update technician fields
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = updateTechnicianSchema.parse(req.body);
    const existing = await prisma.technician.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', `Technician with ID '${id}' not found`);
    }
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.skills !== undefined) updateData.skills = JSON.stringify(data.skills);
    if (data.serviceZones !== undefined) updateData.serviceZones = JSON.stringify(data.serviceZones);
    if (data.shiftStart !== undefined) updateData.shiftStart = data.shiftStart;
    if (data.shiftEnd !== undefined) updateData.shiftEnd = data.shiftEnd;
    if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;

    const technician = await prisma.technician.update({
      where: { id },
      data: updateData,
    });
    res.json({ success: true, data: deserializeTechnician(technician) } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
