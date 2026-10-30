// ============================================================================
// DispatchGrid — Seed Script
// Generates: 20 technicians, 100 jobs, impossible scenarios, disruption triggers
// 
// Run with: pnpm db:seed (or npx tsx src/seed.ts)
// ============================================================================

import prisma from './utils/db';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Service zones — think of a city divided into 5 zones
const ZONES = ['zone-north', 'zone-south', 'zone-east', 'zone-west', 'zone-central'];

// Skills available in the system
const ALL_SKILLS = [
  'plumbing', 'electrical', 'hvac', 'carpentry', 'painting',
  'appliance-repair', 'locksmith', 'roofing', 'landscaping', 'pest-control',
];

// Base date for scheduling — tomorrow
const BASE_DATE = new Date();
BASE_DATE.setDate(BASE_DATE.getDate() + 1);
BASE_DATE.setHours(0, 0, 0, 0);

// ============================================================================
// HELPER FUNCTIONS (deterministic — seeded by index)
// ============================================================================

function makeDate(hours: number, minutes: number = 0): Date {
  const d = new Date(BASE_DATE);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/** Get zone center coordinates (roughly modeled on a city grid) */
function getZoneCenter(zone: string): { lat: number; lng: number } {
  const centers: Record<string, { lat: number; lng: number }> = {
    'zone-north':   { lat: 12.98, lng: 77.58 },  // Bangalore-ish coordinates
    'zone-south':   { lat: 12.92, lng: 77.58 },
    'zone-east':    { lat: 12.95, lng: 77.62 },
    'zone-west':    { lat: 12.95, lng: 77.54 },
    'zone-central': { lat: 12.95, lng: 77.58 },
  };
  return centers[zone] || centers['zone-central'];
}

/** Generate a location within a zone (deterministic offset based on index) */
function getLocationInZone(zone: string, index: number): { latitude: number; longitude: number } {
  const center = getZoneCenter(zone);
  // Small deterministic offsets within ~2km radius
  const latOffset = ((index * 7 + 3) % 20 - 10) * 0.002;
  const lngOffset = ((index * 11 + 5) % 20 - 10) * 0.002;
  return {
    latitude: center.lat + latOffset,
    longitude: center.lng + lngOffset,
  };
}

// ============================================================================
// TECHNICIAN GENERATION
// ============================================================================

interface TechSeed {
  name: string;
  skills: string[];
  serviceZones: string[];
  shiftStart: string;
  shiftEnd: string;
  latitude: number;
  longitude: number;
  isAvailable: boolean;
}

function generateTechnicians(): TechSeed[] {
  const technicians: TechSeed[] = [
    // --- Generalists (cover multiple skills and zones) ---
    { name: 'Alex Martinez',     skills: ['plumbing', 'electrical', 'hvac'],                serviceZones: ['zone-north', 'zone-central'],  shiftStart: '08:00', shiftEnd: '17:00', ...getLocationInZone('zone-north', 0),    isAvailable: true },
    { name: 'Priya Sharma',      skills: ['electrical', 'hvac', 'appliance-repair'],         serviceZones: ['zone-south', 'zone-central'],  shiftStart: '08:00', shiftEnd: '17:00', ...getLocationInZone('zone-south', 1),    isAvailable: true },
    { name: 'James Wilson',      skills: ['plumbing', 'carpentry', 'painting'],              serviceZones: ['zone-east', 'zone-central'],   shiftStart: '08:00', shiftEnd: '17:00', ...getLocationInZone('zone-east', 2),     isAvailable: true },
    { name: 'Fatima Al-Hassan',  skills: ['hvac', 'electrical', 'plumbing'],                 serviceZones: ['zone-west', 'zone-central'],   shiftStart: '08:00', shiftEnd: '17:00', ...getLocationInZone('zone-west', 3),     isAvailable: true },

    // --- Specialists (with realistic secondary zones) ---
    { name: 'Carlos Rodriguez',  skills: ['plumbing', 'electrical'],                         serviceZones: ['zone-north', 'zone-west'],     shiftStart: '07:00', shiftEnd: '16:00', ...getLocationInZone('zone-north', 4),    isAvailable: true },
    { name: 'Sarah Chen',        skills: ['electrical', 'appliance-repair', 'hvac'],          serviceZones: ['zone-south', 'zone-east'],     shiftStart: '08:00', shiftEnd: '17:00', ...getLocationInZone('zone-south', 5),    isAvailable: true },
    { name: 'David Kim',         skills: ['hvac', 'electrical'],                              serviceZones: ['zone-east', 'zone-central'],   shiftStart: '08:00', shiftEnd: '17:00', ...getLocationInZone('zone-east', 6),     isAvailable: true },
    { name: 'Maria Lopez',       skills: ['carpentry', 'painting', 'plumbing'],               serviceZones: ['zone-west', 'zone-north'],     shiftStart: '08:00', shiftEnd: '17:00', ...getLocationInZone('zone-west', 7),     isAvailable: true },
    { name: 'Ahmed Hassan',      skills: ['locksmith', 'carpentry'],                         serviceZones: ['zone-central', 'zone-south'],  shiftStart: '07:00', shiftEnd: '16:00', ...getLocationInZone('zone-central', 8),  isAvailable: true },
    { name: 'Emily Brown',       skills: ['pest-control', 'landscaping', 'painting'],         serviceZones: ['zone-north', 'zone-east'],     shiftStart: '08:00', shiftEnd: '17:00', ...getLocationInZone('zone-north', 9),    isAvailable: true },

    // --- Extended shift techs (evening/late shifts) ---
    { name: 'Ryan O\'Brien',     skills: ['plumbing', 'electrical', 'hvac'],                  serviceZones: ['zone-south', 'zone-east'],     shiftStart: '10:00', shiftEnd: '19:00', ...getLocationInZone('zone-south', 10),   isAvailable: true },
    { name: 'Lisa Nguyen',       skills: ['hvac', 'appliance-repair', 'electrical'],          serviceZones: ['zone-north', 'zone-west'],     shiftStart: '09:00', shiftEnd: '18:00', ...getLocationInZone('zone-west', 11),    isAvailable: true },

    // --- Multi-zone mobile techs ---
    { name: 'Tom Anderson',      skills: ['roofing', 'carpentry', 'painting'],                serviceZones: ['zone-north', 'zone-south', 'zone-central'],    shiftStart: '07:00', shiftEnd: '16:00', ...getLocationInZone('zone-central', 12), isAvailable: true },
    { name: 'Nina Patel',        skills: ['plumbing', 'electrical', 'locksmith'],             serviceZones: ['zone-east', 'zone-west', 'zone-central'],      shiftStart: '08:00', shiftEnd: '17:00', ...getLocationInZone('zone-central', 13), isAvailable: true },
    { name: 'Chris Taylor',      skills: ['electrical', 'hvac', 'carpentry'],                 serviceZones: ['zone-north', 'zone-south'],                    shiftStart: '08:00', shiftEnd: '17:00', ...getLocationInZone('zone-north', 14),   isAvailable: true },

    // --- Highly skilled senior techs ---
    { name: 'Dr. Mike Johnson',  skills: ['plumbing', 'electrical', 'hvac', 'carpentry', 'appliance-repair'], serviceZones: ['zone-central', 'zone-east'], shiftStart: '08:00', shiftEnd: '17:00', ...getLocationInZone('zone-central', 15), isAvailable: true },
    { name: 'Sandra Williams',   skills: ['electrical', 'hvac', 'appliance-repair', 'locksmith'],             serviceZones: ['zone-south', 'zone-central'], shiftStart: '08:00', shiftEnd: '17:00', ...getLocationInZone('zone-south', 16), isAvailable: true },

    // --- Mobile support techs ---
    { name: 'Kevin Park',        skills: ['plumbing', 'carpentry', 'painting'],               serviceZones: ['zone-east', 'zone-central'],   shiftStart: '08:00', shiftEnd: '17:00', ...getLocationInZone('zone-east', 17),    isAvailable: true },
    { name: 'Rachel Green',      skills: ['painting', 'landscaping', 'carpentry'],             serviceZones: ['zone-west', 'zone-north'],     shiftStart: '08:00', shiftEnd: '16:00', ...getLocationInZone('zone-west', 18),    isAvailable: true },

    // --- Tech who will be "dropped out" for disruption scenario ---
    { name: 'Mark Stevens',      skills: ['plumbing', 'electrical', 'hvac'],                  serviceZones: ['zone-north', 'zone-central'],  shiftStart: '08:00', shiftEnd: '17:00', ...getLocationInZone('zone-north', 19),   isAvailable: true },
  ];

  return technicians;
}

// ============================================================================
// JOB GENERATION
// ============================================================================

interface JobSeed {
  title: string;
  description: string;
  priority: string;
  durationMinutes: number;
  requiredSkills: string[];
  serviceZone: string;
  latitude: number;
  longitude: number;
  windowStart: Date;
  windowEnd: Date;
  slaDeadline: Date;
  status: string;
}

function generateJobs(): JobSeed[] {
  const jobs: JobSeed[] = [];

  // ==========================================================================
  // BATCH 1: 78 FEASIBLE JOBS (spread across zones, staggered times)
  // Designed to assign cleanly across 20 technicians during their daily shifts.
  // ==========================================================================
  const feasibleTemplates = [
    { title: 'Fix leaking bathroom faucet',    skills: ['plumbing'],         duration: 35, priority: 'MEDIUM' },
    { title: 'Install ceiling fan & switch',   skills: ['electrical'],       duration: 40, priority: 'MEDIUM' },
    { title: 'AC periodic maintenance check',  skills: ['hvac'],             duration: 45, priority: 'HIGH' },
    { title: 'Repair kitchen cabinet hinges',  skills: ['carpentry'],        duration: 35, priority: 'LOW' },
    { title: 'Touch-up hallway wall paint',    skills: ['painting'],         duration: 45, priority: 'LOW' },
    { title: 'Diagnose dishwasher drainage',   skills: ['appliance-repair'], duration: 40, priority: 'MEDIUM' },
    { title: 'Fix electric water heater',      skills: ['electrical'],       duration: 45, priority: 'HIGH' },
    { title: 'Clear blocked kitchen sink pipe',skills: ['plumbing'],         duration: 30, priority: 'CRITICAL' },
    { title: 'Thermostat sensor wiring fix',   skills: ['hvac'],             duration: 35, priority: 'MEDIUM' },
    { title: 'Emergency pipe burst clamp',     skills: ['plumbing'],         duration: 30, priority: 'CRITICAL' },
    { title: 'Replace faulty circuit breaker', skills: ['electrical'],       duration: 40, priority: 'HIGH' },
    { title: 'Refrigerator compressor check',  skills: ['appliance-repair'], duration: 40, priority: 'HIGH' },
  ];

  // Widely available skills in each zone so workforce capacity is well utilized
  const zoneSkillsMap: Record<string, string[][]> = {
    'zone-north':   [['plumbing'], ['electrical'], ['hvac'], ['carpentry']],
    'zone-south':   [['electrical'], ['hvac'], ['appliance-repair'], ['plumbing']],
    'zone-east':    [['plumbing'], ['carpentry'], ['painting'], ['hvac'], ['electrical']],
    'zone-west':    [['hvac'], ['electrical'], ['plumbing'], ['carpentry'], ['painting']],
    'zone-central': [['plumbing'], ['electrical'], ['hvac'], ['carpentry'], ['appliance-repair']],
  };

  for (let i = 0; i < 78; i++) {
    const template = feasibleTemplates[i % feasibleTemplates.length];
    const zone = ZONES[i % ZONES.length]; // perfectly balanced across 5 zones
    const location = getLocationInZone(zone, i + 100);

    const availableSkillSets = zoneSkillsMap[zone] || [['plumbing'], ['electrical']];
    const skills = availableSkillSets[i % availableSkillSets.length];

    // Stagger across 7 balanced daily intervals (8:00, 9:15, 10:30, 11:45, 13:00, 14:15, 15:30)
    // 78 jobs / 7 slots ≈ 11 jobs per slot. With 20 on-duty technicians, this assigns ~76-78 jobs!
    const slotIdx = i % 7;
    const startHourVal = 8 + slotIdx * 1.25;
    const startHourInt = Math.floor(startHourVal);
    const startMin = Math.round((startHourVal - startHourInt) * 60);

    jobs.push({
      title: `${template.title} #${i + 1}`,
      description: `Service request in ${zone}`,
      priority: template.priority,
      durationMinutes: template.duration,
      requiredSkills: skills,
      serviceZone: zone,
      latitude: location.latitude,
      longitude: location.longitude,
      windowStart: makeDate(startHourInt, startMin),
      windowEnd: makeDate(startHourInt + 3, startMin),
      slaDeadline: makeDate(startHourInt + 6, startMin),
      status: 'PENDING',
    });
  }

  // ==========================================================================
  // BATCH 2: 14 INFEASIBLE JOBS (Capacity/Shift Conflicts requiring Overtime)
  // Technicians have the skills and zone, but cannot fit without overtime
  // or due to competing simultaneous requests during peak windows.
  // ==========================================================================

  // 2a. 5 Competing HVAC jobs crammed into narrow window in zone-central
  for (let i = 0; i < 5; i++) {
    const location = getLocationInZone('zone-central', i + 300);
    jobs.push({
      title: `Competing HVAC Service #${i + 79}`,
      description: `High-demand HVAC service during morning heat wave peak`,
      priority: i === 0 ? 'CRITICAL' : 'HIGH',
      durationMinutes: 90,
      requiredSkills: ['hvac'],
      serviceZone: 'zone-central',
      latitude: location.latitude,
      longitude: location.longitude,
      windowStart: makeDate(10),
      windowEnd: makeDate(11), // 1-hour window competing with earlier jobs
      slaDeadline: makeDate(12, 30),
      status: 'PENDING',
    });
  }

  // 2b. 5 Competing Electrical jobs crammed into narrow window in zone-north
  for (let i = 0; i < 5; i++) {
    const location = getLocationInZone('zone-north', i + 350);
    jobs.push({
      title: `Competing Power Outage Diagnostics #${i + 84}`,
      description: `Simultaneous electrical emergency during peak surge`,
      priority: i === 0 ? 'CRITICAL' : 'HIGH',
      durationMinutes: 90,
      requiredSkills: ['electrical'],
      serviceZone: 'zone-north',
      latitude: location.latitude,
      longitude: location.longitude,
      windowStart: makeDate(13),
      windowEnd: makeDate(14),
      slaDeadline: makeDate(15, 30),
      status: 'PENDING',
    });
  }

  // 2c. 4 Late afternoon jobs that exceed normal shift end (requires Overtime)
  const lateZones = ['zone-north', 'zone-south', 'zone-east', 'zone-west'];
  for (let i = 0; i < 4; i++) {
    const zone = lateZones[i];
    const location = getLocationInZone(zone, i + 400);
    jobs.push({
      title: `Late Evening Emergency #${i + 89}`,
      description: `Job requested at 16:30 needing 60 min — exceeds standard 17:00 shift end`,
      priority: 'HIGH',
      durationMinutes: 60,
      requiredSkills: ['plumbing'],
      serviceZone: zone,
      latitude: location.latitude,
      longitude: location.longitude,
      windowStart: makeDate(16, 30),
      windowEnd: makeDate(17, 0),
      slaDeadline: makeDate(18, 30),
      status: 'PENDING',
    });
  }

  // ==========================================================================
  // BATCH 3: 8 IMPOSSIBLE JOBS (Structural Skill/Zone Mismatch)
  // No technician in the system possesses these skills or serves these zones.
  // ==========================================================================
  jobs.push({
    title: 'IMPOSSIBLE: Underwater welding in zone-north',
    description: 'Requires underwater-welding skill — not possessed by any technician',
    priority: 'HIGH',
    durationMinutes: 120,
    requiredSkills: ['underwater-welding'],
    serviceZone: 'zone-north',
    latitude: 12.98, longitude: 77.58,
    windowStart: makeDate(8),
    windowEnd: makeDate(16),
    slaDeadline: makeDate(17),
    status: 'PENDING',
  });

  jobs.push({
    title: 'IMPOSSIBLE: Solar panel install in zone-south',
    description: 'Requires solar-installation skill — not possessed by any technician',
    priority: 'MEDIUM',
    durationMinutes: 180,
    requiredSkills: ['solar-installation'],
    serviceZone: 'zone-south',
    latitude: 12.92, longitude: 77.58,
    windowStart: makeDate(8),
    windowEnd: makeDate(14),
    slaDeadline: makeDate(17),
    status: 'PENDING',
  });

  jobs.push({
    title: 'IMPOSSIBLE: Elevator technician in zone-east',
    description: 'Requires elevator-tech skill — not possessed by any technician',
    priority: 'CRITICAL',
    durationMinutes: 240,
    requiredSkills: ['elevator-tech'],
    serviceZone: 'zone-east',
    latitude: 12.95, longitude: 77.62,
    windowStart: makeDate(8),
    windowEnd: makeDate(12),
    slaDeadline: makeDate(14),
    status: 'PENDING',
  });

  jobs.push({
    title: 'IMPOSSIBLE: High-voltage substation certification in zone-west',
    description: 'Requires substation-certified skill — not possessed by any technician',
    priority: 'HIGH',
    durationMinutes: 120,
    requiredSkills: ['substation-certified'],
    serviceZone: 'zone-west',
    latitude: 12.95, longitude: 77.54,
    windowStart: makeDate(8),
    windowEnd: makeDate(16),
    slaDeadline: makeDate(17),
    status: 'PENDING',
  });

  jobs.push({
    title: 'IMPOSSIBLE: Bio-hazard sanitation in zone-central',
    description: 'Requires bio-hazard skill — not possessed by any technician',
    priority: 'CRITICAL',
    durationMinutes: 90,
    requiredSkills: ['bio-hazard'],
    serviceZone: 'zone-central',
    latitude: 12.95, longitude: 77.58,
    windowStart: makeDate(9),
    windowEnd: makeDate(13),
    slaDeadline: makeDate(15),
    status: 'PENDING',
  });

  jobs.push({
    title: 'IMPOSSIBLE: Smart-grid fiber splicing in zone-north',
    description: 'Requires fiber-splicing skill — not possessed by any technician',
    priority: 'MEDIUM',
    durationMinutes: 90,
    requiredSkills: ['fiber-splicing'],
    serviceZone: 'zone-north',
    latitude: 12.98, longitude: 77.58,
    windowStart: makeDate(8),
    windowEnd: makeDate(14),
    slaDeadline: makeDate(16),
    status: 'PENDING',
  });

  jobs.push({
    title: 'IMPOSSIBLE: Industrial chiller overhaul in zone-west',
    description: 'Requires industrial-chiller skill — not possessed by any technician',
    priority: 'HIGH',
    durationMinutes: 150,
    requiredSkills: ['industrial-chiller'],
    serviceZone: 'zone-west',
    latitude: 12.95, longitude: 77.54,
    windowStart: makeDate(8),
    windowEnd: makeDate(14),
    slaDeadline: makeDate(16),
    status: 'PENDING',
  });

  jobs.push({
    title: 'IMPOSSIBLE: Roofing in zone-south with pest-control',
    description: 'Requires both roofing and pest-control — no technician has both',
    priority: 'HIGH',
    durationMinutes: 120,
    requiredSkills: ['roofing', 'pest-control'],
    serviceZone: 'zone-south',
    latitude: 12.92, longitude: 77.58,
    windowStart: makeDate(8),
    windowEnd: makeDate(16),
    slaDeadline: makeDate(17),
    status: 'PENDING',
  });

  return jobs;
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

export async function seed() {
  console.log('[SEED] Starting DispatchGrid seed...\n');

  // Clear existing data
  console.log('[CLEAR] Clearing existing data...');
  await prisma.runDetail.deleteMany();
  await prisma.scheduleRun.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.job.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.idempotencyKey.deleteMany();

  // Seed default customers
  console.log('[CUSTOMER] Creating default customer accounts...');
  const sampleCustomers = [
    {
      name: 'Rahul Sharma',
      phone: '+91 98765 43210',
      email: 'rahul.sharma@example.com',
      address: 'Flat 402, Tower B, Prestige Falcon City, Konanakunte',
      age: 29,
    },
    {
      name: 'Ananya Iyer',
      phone: '+91 98450 11223',
      email: 'ananya.iyer@example.com',
      address: 'Villa 14, Palm Meadows, Whitefield',
      age: 34,
    },
  ];
  for (const c of sampleCustomers) {
    await prisma.customer.create({ data: c });
  }

  // Seed technicians
  console.log('[FLEET] Creating 20 technicians...');
  const techSeeds = generateTechnicians();
  const technicians = [];
  for (const tech of techSeeds) {
    const created = await prisma.technician.create({
      data: {
        name: tech.name,
        skills: JSON.stringify(tech.skills),
        serviceZones: JSON.stringify(tech.serviceZones),
        shiftStart: tech.shiftStart,
        shiftEnd: tech.shiftEnd,
        latitude: tech.latitude,
        longitude: tech.longitude,
        isAvailable: tech.isAvailable,
      },
    });
    technicians.push(created);
    console.log(`   [OK] ${tech.name} — Skills: [${tech.skills.join(', ')}] | Zones: [${tech.serviceZones.join(', ')}] | Shift: ${tech.shiftStart}-${tech.shiftEnd}`);
  }

  // Seed jobs
  console.log('\n[JOBS] Creating 100 jobs...');
  const jobSeeds = generateJobs();
  const createdJobs = [];
  for (const job of jobSeeds) {
    const created = await prisma.job.create({
      data: {
        title: job.title,
        description: job.description,
        priority: job.priority,
        durationMinutes: job.durationMinutes,
        requiredSkills: JSON.stringify(job.requiredSkills),
        serviceZone: job.serviceZone,
        latitude: job.latitude,
        longitude: job.longitude,
        windowStart: job.windowStart,
        windowEnd: job.windowEnd,
        slaDeadline: job.slaDeadline,
        status: job.status,
      },
    });
    createdJobs.push(created);
  }

  // Summary
  const priorityCounts = jobSeeds.reduce((acc, j) => {
    acc[j.priority] = (acc[j.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const zoneCounts = jobSeeds.reduce((acc, j) => {
    acc[j.serviceZone] = (acc[j.serviceZone] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`\n[SUMMARY] Seed Summary:`);
  console.log(`   Technicians: ${technicians.length}`);
  console.log(`   Jobs: ${createdJobs.length}`);
  console.log(`   By Priority: ${JSON.stringify(priorityCounts)}`);
  console.log(`   By Zone: ${JSON.stringify(zoneCounts)}`);
  console.log(`   Impossible jobs: 8 (underwater-welding, solar-install, elevator-tech, substation-cert, bio-hazard, fiber-splicing, industrial-chiller, roofing+pest combo)`);
  console.log(`   Infeasible/Overtime jobs: 14 (competing HVAC, peak electrical, late evening emergency requiring overtime)`);
  console.log(`\n[DISRUPTION] Disruption scenario ready:`);
  console.log(`   - Tech "Mark Stevens" (ID: ${technicians[19].id}) can be dropped out`);
  console.log(`   - He has plumbing, electrical, hvac skills in zone-north/central`);
  console.log(`   - Dropping him will force re-optimization of his assigned jobs`);
  console.log(`\n[OK] Seed complete!`);
}

// Auto-run only if called directly as a CLI script
if (process.argv[1]?.includes('seed')) {
  seed()
    .catch((e) => {
      console.error('[ERROR] Seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}


