// Per-port configuration registry (spec v0.2.59 port-generalization).
//
// The per-port default call (v0.2.53 contract, generalized here), the OPS
// component descriptor (v0.2.57, moved from engine code to data), and the
// input profile are data, not engine knowledge: each port's YAML carries
// them in its own file, the conversion script flows them into ports.json,
// and the consuming side registers them here once at load. Lookups by port
// id fail loudly - a missing section is a broken port file, never a silent
// fallback to another port's posture (the silent-failure defect class this
// pass repairs at all four sites).
//
// Registration is explicit so the module stays dependency-free and works in
// both runtimes: the web registers from the generated registry (ports.json)
// at App module scope; Node consumers (the core test suite, scripts) use
// registerPortDataFromYaml/loadAllPortData, which read the YAML directly.

import {
  CallInput,
  OpsComponentsSpec,
  PortDefaultCallSection,
  PortDefinition,
  PortInputProfile
} from './types';

interface RegisteredPortData {
  defaultCall: PortDefaultCallSection;
  opsSpeculative: OpsComponentsSpec;
  inputProfile: PortInputProfile;
  resetFields: string[];
}

const REGISTRY = new Map<string, RegisteredPortData>();

/**
 * Registers one port's configuration sections. Throws loudly on a port
 * with a missing or malformed section - a silent skip would leave the
 * port unpriceable at first use instead of at load.
 */
export function registerPortData(
  portId: string,
  sections: {
    defaultCall: PortDefaultCallSection;
    opsSpeculative: OpsComponentsSpec;
    inputProfile: PortInputProfile;
    resetFields?: string[];
  }
): void {
  if (!portId || typeof portId !== 'string') {
    throw new Error(`registerPortData: port id missing or invalid (${JSON.stringify(portId)})`);
  }
  if (!sections || typeof sections !== 'object') {
    throw new Error(`registerPortData('${portId}'): configuration sections object missing`);
  }
  const { defaultCall, opsSpeculative, inputProfile } = sections;
  // Port-specific reset fields (spec v0.2.60): optional only so synthetic
  // fixtures can exercise the loud-failure path; every real port file
  // declares them (a port with none still declares an empty list - the
  // authoring is explicit, never silent).
  const resetFields = sections.resetFields !== undefined ? sections.resetFields : undefined;
  if (!defaultCall || typeof defaultCall !== 'object') {
    throw new Error(`registerPortData('${portId}'): default_call section missing - every port must ship its per-port default call in its data file (spec v0.2.59)`);
  }
  // YAML null is the authoring form of "present but blank = not entered"
  // (the spec v0.2.28 blank contract). Normalize to undefined at
  // registration so the merged default call is byte-equivalent to the
  // code-authored defaults the section replaces: a pinned
  // expect(field).toBeUndefined() must never see YAML null.
  const normalizedDefaultCall: PortDefaultCallSection = {};
  for (const [field, value] of Object.entries(defaultCall)) {
    normalizedDefaultCall[field] = value === null ? undefined : value;
  }
  if (!opsSpeculative || typeof opsSpeculative !== 'object') {
    throw new Error(`registerPortData('${portId}'): ops_speculative section missing - every port must declare its OPS component posture (presence/currency/unit, no rates; spec v0.2.59)`);
  }
  for (const component of ['electricity', 'demand', 'connection', 'per_gt'] as const) {
    const spec = opsSpeculative[component];
    if (!spec || typeof spec !== 'object'
      || typeof spec.enabled !== 'boolean'
      || typeof spec.currency !== 'string'
      || typeof spec.unit !== 'string') {
      throw new Error(`registerPortData('${portId}'): ops_speculative.${component} descriptor malformed (needs enabled/currency/unit; spec v0.2.59)`);
    }
  }
  if (!inputProfile || !Array.isArray(inputProfile.sections)) {
    throw new Error(`registerPortData('${portId}'): input_profile section missing - every port must declare the input sections its workspace renders (spec v0.2.59)`);
  }
  if (inputProfile.fields !== undefined) {
    if (!Array.isArray(inputProfile.fields) || inputProfile.fields.some(f => typeof f !== 'string')) {
      throw new Error(`registerPortData('${portId}'): input_profile.fields malformed (must be a list of field ids; spec v0.2.59)`);
    }
  }
  for (const section of inputProfile.sections) {
    if (!section || typeof section.id !== 'string' || typeof section.heading !== 'string') {
      throw new Error(`registerPortData('${portId}'): input_profile section malformed (needs id and heading; spec v0.2.59)`);
    }
    if (section.operators !== undefined) {
      if (!Array.isArray(section.operators)) {
        throw new Error(`registerPortData('${portId}'): input_profile section '${section.id}' operators malformed (must be a list of {value, label}; spec v0.2.59)`);
      }
      for (const op of section.operators) {
        if (!op || typeof op.value !== 'string' || typeof op.label !== 'string') {
          throw new Error(`registerPortData('${portId}'): input_profile section '${section.id}' operator entry malformed (needs value and label; spec v0.2.59)`);
        }
      }
    }
  }
  if (resetFields !== undefined
    && (!Array.isArray(resetFields) || resetFields.some(f => typeof f !== 'string'))) {
    throw new Error(`registerPortData('${portId}'): input_profile.reset_fields malformed (must be a list of field ids; spec v0.2.60)`);
  }
  REGISTRY.set(portId, {
    defaultCall: normalizedDefaultCall,
    opsSpeculative,
    inputProfile,
    resetFields: resetFields ?? []
  });
}

/**
 * Registers every section of a loaded port definition. The port object is
 * the single source of truth once loaded; this is the Node-side and
 * test-side convenience over registerPortData.
 */
export function registerPortDefinition(port: PortDefinition): void {
  if (!port || !port.metadata || !port.metadata.id) {
    throw new Error('registerPortDefinition: port definition or metadata.id missing');
  }
  registerPortData(port.metadata.id, {
    defaultCall: port.default_call!,
    opsSpeculative: port.ops_speculative!,
    inputProfile: port.input_profile!,
    resetFields: port.input_profile?.reset_fields
  });
}

/**
 * Per-port default-call overrides (spec v0.2.59). Throws loudly when the
 * port has no section - never silently prices a port without its
 * list-price defaults.
 */
export function portDefaultCall(portId: string): PortDefaultCallSection {
  const entry = REGISTRY.get(portId);
  if (!entry) {
    throw new Error(
      `portDefaultCall: no per-port default-call data registered for '${portId}' - ` +
      `the port's data file must carry its default_call section (spec v0.2.59); ` +
      `a missing section is a broken port file, never a silent empty default`
    );
  }
  return entry.defaultCall;
}

/**
 * Per-port OPS component descriptor (spec v0.2.57, data-authored at
 * v0.2.59). Throws loudly when the port has no descriptor - the old
 * named-port fallback (Helsingborg's all-four-open posture) silently
 * rendered input boxes a port's tariff contradicts; it is removed.
 */
export function portOpsComponents(portId: string): OpsComponentsSpec {
  const entry = REGISTRY.get(portId);
  if (!entry) {
    throw new Error(
      `portOpsComponents: no OPS component descriptor registered for '${portId}' - ` +
      `the port's data file must declare its ops_speculative section ` +
      `(presence/currency/unit, no rates; spec v0.2.59); the named-port ` +
      `fallback is removed: an unknown port fails loudly, never silently ` +
      `receiving another port's OPS posture`
    );
  }
  return entry.opsSpeculative;
}

/**
 * Per-port input profile (spec v0.2.59). Throws loudly when the port has
 * no profile - a workspace must never silently render a wrong port's
 * input sections.
 */
export function portInputProfile(portId: string): PortInputProfile {
  const entry = REGISTRY.get(portId);
  if (!entry) {
    throw new Error(
      `portInputProfile: no input profile registered for '${portId}' - ` +
      `the port's data file must carry its input_profile section (spec v0.2.59)`
    );
  }
  return entry.inputProfile;
}

/**
 * The union of every registered port's port-specific reset fields (spec
 * v0.2.60): the call inputs a port switch resets to their default. Derived
 * from the registry - never a hand-kept array - so a new port's reset
 * fields ship with its authoring.
 */
export function allPortResetFields(): string[] {
  const union: string[] = [];
  for (const entry of REGISTRY.values()) {
    for (const field of entry.resetFields) {
      if (!union.includes(field)) union.push(field);
    }
  }
  return union;
}

/**
 * One port's declared port-specific reset fields (spec v0.2.60). Throws
 * loudly when the port is unregistered - never silently resets nothing.
 */
export function portResetFields(portId: string): string[] {
  const entry = REGISTRY.get(portId);
  if (!entry) {
    throw new Error(
      `portResetFields: no port data registered for '${portId}' - ` +
      `the port's data file must carry its input_profile section with its ` +
      `reset_fields (spec v0.2.60)`
    );
  }
  return [...entry.resetFields];
}

/**
 * Whether a port's data has been registered (test/diagnostic use).
 */
export function isPortDataRegistered(portId: string): boolean {
  return REGISTRY.has(portId);
}

/**
 * The registered port ids (test/diagnostic use; registry order).
 */
export function registeredPortIds(): string[] {
  return Array.from(REGISTRY.keys());
}

/**
 * Clears the registry (test isolation only).
 */
export function __clearPortDataRegistry(): void {
  REGISTRY.clear();
}
