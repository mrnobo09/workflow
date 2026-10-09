// The only list of worker trades. Models, validation, the LLM prompt, and the
// UI (through GET /specialties) all read from here.
export const SPECIALTY_DEFINITIONS = {
    electrician: {
        label: "Electrician",
        trade: "electrical",
        covers: "wiring, outlets, switches, light fixtures, breakers, power outages",
    },
    plumber: {
        label: "Plumber",
        trade: "plumbing",
        covers: "leaks, taps, toilets, drains, pipes, water heaters",
    },
    hvac: {
        label: "HVAC technician",
        trade: "HVAC",
        covers: "air conditioning, heating, furnaces, ventilation, thermostats",
    },
    carpenter: {
        label: "Carpenter",
        trade: "carpentry",
        covers: "doors, hinges, cabinets, shelves, trim, wooden floors and stairs",
    },
    roofer: {
        label: "Roofer",
        trade: "roofing",
        covers: "roof leaks, shingles, gutters, flashing",
    },
    painter: {
        label: "Painter",
        trade: "painting",
        covers: "interior and exterior painting, wall and ceiling touch-ups",
    },
    locksmith: {
        label: "Locksmith",
        trade: "lock",
        covers: "locks, keys, lockouts, access hardware",
    },
    appliance_technician: {
        label: "Appliance technician",
        trade: "appliance",
        covers: "fridges, ovens, stoves, washers, dryers, dishwashers",
    },
    pest_control: {
        label: "Pest control",
        trade: "pest control",
        covers: "insects, rodents, wildlife",
    },
    landscaper: {
        label: "Landscaper",
        trade: "landscaping",
        covers: "lawns, trees, grounds, snow removal",
    },
    cleaner: {
        label: "Cleaner",
        trade: "cleaning",
        covers: "cleaning, spills, trash, deep cleans",
    },
    general_maintenance: {
        label: "General maintenance",
        trade: "general maintenance",
        covers: "anything that does not clearly fit another specialty",
    },
} as const satisfies Record<string, { label: string; trade: string; covers: string }>;

export type Specialty = keyof typeof SPECIALTY_DEFINITIONS;

export const SPECIALTIES = Object.keys(SPECIALTY_DEFINITIONS) as Specialty[];

export const FALLBACK_SPECIALTY: Specialty = "general_maintenance";

export function isSpecialty(value: unknown): value is Specialty {
    return typeof value === "string" && Object.hasOwn(SPECIALTY_DEFINITIONS, value);
}

export function specialtyLabel(value: string) {
    return isSpecialty(value) ? SPECIALTY_DEFINITIONS[value].label : value;
}

/** Noun for messages, e.g. "New plumbing job". */
export function tradeName(value: string) {
    return isSpecialty(value) ? SPECIALTY_DEFINITIONS[value].trade : value;
}
