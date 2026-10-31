import fs from 'fs';
import path from 'path';

const CONTACTS_FILE = path.join(__dirname, '../../technician_contacts.json');

export interface TechContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

function loadAllContacts(): Record<string, TechContact> {
  try {
    if (fs.existsSync(CONTACTS_FILE)) {
      const raw = fs.readFileSync(CONTACTS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // fallback empty
  }
  return {};
}

function saveAllContacts(data: Record<string, TechContact>) {
  try {
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err: any) {
    console.error('[TECH CONTACTS] Failed to save contact to disk:', err.message);
  }
}

export function saveTechContact(id: string, contact: { name?: string; email?: string; phone?: string }) {
  const current = loadAllContacts();
  current[id] = {
    id,
    name: contact.name || current[id]?.name || 'Technician Partner',
    email: contact.email || current[id]?.email || process.env.GMAIL_USER || '4mh23is094@gmail.com',
    phone: contact.phone || current[id]?.phone || '+91 9066272484',
  };
  saveAllContacts(current);
}

export function getTechContact(id: string): TechContact {
  const current = loadAllContacts();
  if (current[id]) {
    return current[id];
  }
  return {
    id,
    name: 'Technician Partner',
    email: process.env.GMAIL_USER || '4mh23is094@gmail.com',
    phone: '+91 9066272484',
  };
}
