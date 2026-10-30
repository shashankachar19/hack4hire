export interface ConsumablePart {
  id: string
  name: string
  category: string
  price: number
}

export const COMMON_PARTS: ConsumablePart[] = [
  { id: 'p1', name: 'High-Pressure Teflon Thread Tape', category: 'Plumbing', price: 40 },
  { id: 'p2', name: '0.5 HP Heavy Duty O-Ring Washer Seal', category: 'Plumbing', price: 80 },
  { id: 'p3', name: 'Brass Ceramic Disc Cartridge Valve', category: 'Plumbing', price: 180 },
  { id: 'p4', name: 'PVC Flexible Drain Waste Pipe (1.5m)', category: 'Plumbing', price: 120 },
  { id: 'e1', name: '16A Modular Flame-Retardant Switch', category: 'Electrical', price: 150 },
  { id: 'e2', name: 'FR PVC Heavy Insulation Tape Roll', category: 'Electrical', price: 30 },
  { id: 'e3', name: '32A Double-Pole Residual MCB Breaker', category: 'Electrical', price: 280 },
  { id: 'g1', name: 'Heavy Duty Anchor Plugs & Screws Set', category: 'General', price: 60 },
]

