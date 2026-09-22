# Port Call Cost Analyzer

A web application that estimates the total publicly-known cost of a container vessel call at a port, with every figure traceable to a source tariff.

## Architecture

This application follows a **data-driven architecture** where:

- **Ports are data, not code**
- A single generic rule-evaluation engine processes all port fee structures
- Each port's fee structure is expressed as a structured YAML data file
- Adding a port or updating a tariff **never requires a code change**

### Core Components

1. **`/core`** - Core engine and data models
   - `src/types.ts` - TypeScript type definitions for all data structures
   - `src/engine.ts` - Rule evaluation engine
   - `src/loader.ts` - Data loader with validation
   - `data/` - Port definition files (YAML)

2. **`/web`** - Web UI (React + TypeScript)
   - Single-page form for vessel and call parameters
   - Itemized, expandable cost result display
   - Progressive disclosure (details collapsed by default)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd port-call-cost-analyzer

# Install dependencies
npm install

# Build the core module
npm run build:core

# Start the web application
npm run dev
```

The application will be available at `http://localhost:3000`


## Architecture Decision Records (ADR)

### ADR-001: Never install dependencies at root level

**Status**: Accepted

**Context**: This is a monorepo with npm workspaces (`core` and `web`). The `web` app depends on `@types/react-dom` which contains DOM type definitions (e.g., `Animatable`, `CSSStyleDeclaration`, `IntersectionObserver`, `ResizeObserver`) that require browser globals. The `core` module is a Node.js library that must NOT have access to DOM types.

**Decision**: Workflow and local development must install dependencies directly in each workspace, never at the root level.

**Consequences**:
- GitHub Actions workflow must use `cd core && npm install` and `cd web && npm install` separately
- Running `npm install` at root will install `@types/react-dom` which will break the core build
- This applies to both CI/CD and local development

**Example of correct workflow step**:
```yaml
- name: Install and build core
  run: cd core && npm install && npm run build

- name: Install web dependencies  
  run: cd web && npm install
```

**Example of INCORRECT workflow step** (will break core build):
```yaml
- name: Install root dependencies
  run: npm install  # DON'T DO THIS - installs DOM types at root
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests with watch mode
npm run test:watch
```

## Data Model

### Port Definition (YAML)

```yaml
metadata:
  id: gothenburg
  name: Port of Gothenburg
  country: Sweden
  currency: SEK
  validity_start: "2026-01-01"
  validity_end: "2026-12-31"

billers:
  - id: port_of_gothenburg
    name: Port of Gothenburg
    currency: SEK

fee_rules:
  - id: port_gothenburg_container_vessel_dues
    fee_family: port_dues
    biller: Port of Gothenburg
    name: Container Vessel Dues
    description: "Progressive dues based on vessel GT"
    rate_structure:
      type: progressive
      basis: gt
      bands:
        - min: 0
          max: 20000
          rate: 1.96
        - min: 20000
          max: 40000
          rate: 1.71
        - min: 40000
          max: 60000
          rate: 1.15
        - min: 60000
          max: null
          rate: 0.80
    minimum: 500
    source_reference:
      document_name: "Port Tariff 2026"
      document_url: "https://www.portofgothenburg.com/en/shipping/port-dues"
      document_issued: "2025-12-01"
      page: 5
      clause: "Section 2.1"
      verified_on: "2025-12-15"
      verified_by: "Port Cost Analyzer Team"
```

### Supported Rate Structures

1. **`flat`** - Single amount
   ```yaml
   rate_structure:
     type: flat
     amount: 1000
   ```

2. **`banded`** - Value falls in one band, that band's rate applies to all
   ```yaml
   rate_structure:
     type: banded
     basis: gt
     bands:
       - min: 0
         max: 10000
         rate: 1.0
       - min: 10000
         max: null
         rate: 0.5
   ```

3. **`progressive`** - Value split across bands, each portion charged at its own rate
   ```yaml
   rate_structure:
     type: progressive
     basis: gt
     bands:
       - min: 0
         max: 20000
         rate: 2.0
       - min: 20000
         max: 40000
         rate: 1.5
       - min: 40000
         max: null
         rate: 1.0
   ```

4. **`per_commenced_day`** - Charged per commenced day (each day or part thereof)
   ```yaml
   rate_structure:
     type: per_commenced_day
     daily_rate: 45
     basis: lay_up_days
     free_days: 0
   ```

5. **`per_unit`** - Amount times a quantity of units
   ```yaml
   rate_structure:
     type: per_unit
     unit_rate: 377
     unit_type: container_le20ft
   ```

6. **`banded_by_time`** - Escalating daily rates with free time (ladder semantics, spec v0.2.33: each day charges exactly once at the first band covering that day number; days below a band minimum — including zero — charge zero)
   ```yaml
   rate_structure:
     type: banded_by_time
     basis: storage_days_export
     bands:
       - min_days: 0
         max_days: 6
         daily_rate: 0
       - min_days: 7
         max_days: 9
         daily_rate: 133
       - min_days: 10
         max_days: null
         daily_rate: 346
   ```

### Adjustments (Discounts/Surcharges)

```yaml
fee_rules:
  - id: env_discount
    fee_family: environmental_surcharge
    biller: Port of Gothenburg
    name: Environmental Discount
    rate_structure:
      type: flat
      amount: 0
    adjustments:
      - type: discount
        percentage: 10
        condition: "esi_score >= 30 || csi_class == '4'"
        description: "ESI/CSI discount"
        stacking_order: 1
    source_reference: {...}
```

### Applicable Conditions

```yaml
fee_rules:
  - id: waste_fee_eu
    fee_family: waste
    biller: Port of Gothenburg
    name: Waste Fee - EU
    rate_structure: {...}
    applicable_conditions:
      flag_state: EU
    source_reference: {...}
```

## Quality Flags

The system automatically generates quality flags when:

- **`estimated_nt`** - Net Tonnage is estimated from GT (0.55 × GT)
- **`missing_optional_param`** - A required parameter for a fee rule is missing
- **`fallback_value`** - A fallback value is used (e.g., highest band when value exceeds all bands)

Quality flags are displayed in the UI and included in the calculation results.

## Current Implementation

### Ports Implemented

- **Gothenburg 2026** (Pilot)
  - Port of Gothenburg (port authority)
  - Sjöfartsverket (Swedish Maritime Administration)
  - APM Terminals Gothenburg (terminal operator)

### Planned Ports

- Hamburg
- Helsingborg
- Gävle
- Gdansk
- Bremerhaven
- Aarhus

## Adding a New Port

1. Create a new YAML file in `/core/data/` (e.g., `hamburg_2026.yaml`)
2. Define the port metadata, billers, and fee rules
3. Ensure every fee rule has a complete `source_reference`
4. Run the validation: `npm run test`
5. The port will be automatically loaded and available in the UI

**No code changes required!**

## Validation Rules

The loader enforces the following validation rules:

1. **Source Reference** - Every fee rule MUST have a complete source reference with all fields:
   - `document_name`
   - `document_url`
   - `document_issued`
   - `page`
   - `clause`
   - `verified_on`
   - `verified_by`

2. **Rate Structures**
   - No gaps between bands in banded/progressive structures
   - No overlapping bands
   - All required fields present
   - No negative rates

3. **Port Definition**
   - Must have metadata with all required fields
   - Must have at least one biller
   - Must have at least one fee rule
   - No duplicate rule IDs

## Vessel Presets

The UI provides quick preset buttons for common vessel types:

- **Feeder** - ~8,000 GT
- **Feeder-Max** - ~15,000 GT
- **Panamax** - ~55,000 GT
- **Post-Panamax** - ~100,000 GT
- **Ultra-Large** - ~215,000 GT

## Input Model

### Vessel Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gt` | number | Yes | Gross Tonnage |
| `nt` | number | No | Net Tonnage (estimated as 0.55 × GT if missing) |
| `loa_m` | number | No | Length Overall (meters) |
| `beam_m` | number | No | Beam (meters) |
| `draft_m` | number | No | Draft (meters) |
| `teu_capacity` | number | No | TEU Capacity |
| `name` | string | No | Vessel Name |
| `imo` | string | No | IMO Number |

### Call Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `port_id` | string | Yes | Port identifier |
| `date` | string | Yes | Call date (ISO format) |
| `containers_loaded_le20ft` | number | Yes | Containers loaded ≤20ft |
| `containers_loaded_gt20ft` | number | Yes | Containers loaded >20ft |
| `containers_discharged_le20ft` | number | Yes | Containers discharged ≤20ft |
| `containers_discharged_gt20ft` | number | Yes | Containers discharged >20ft |
| `calls_this_month` | number | Yes | Number of calls this month |
| `flag_state` | string | Yes | Flag state ('EU' or 'non-EU') |
| `esi_score` | number | No | Environmental Ship Index score |
| `csi_class` | string | No | Clean Shipping Index class (A-E) |
| `fossil_free_fuel_percentage` | number | No | Percentage of fossil-free fuel |
| `ops_usage` | boolean | Yes | Onshore Power Supply usage |
| `lay_up_days` | number | No | Lay-up days |
| `storage_days_export` | number | No | Storage days for export units |
| `storage_days_import` | number | No | Storage days for import units |
| `reefer_units` | number | No | Reefer unit count |
| `oog_units` | number | No | Out of Gauge unit count |
| `dangerous_goods_units` | number | No | Dangerous goods unit count |
| `pilotage_required` | boolean | Yes | Pilotage required |
| `pilotage_hours` | number | No | Pilotage hours |
| `pilotage_extra_pilot` | boolean | No | Extra pilot required |
| `pilotage_ordering_lead_time_hours` | number | No | Lead time for pilotage ordering |

## Output Model

### Cost Calculation Result

```typescript
{
  port_id: string;
  port_name: string;
  currency: string; // Always SEK for current implementation
  date: string;
  vessel_summary: {
    gt: number;
    nt: number;
    loa_m?: number;
    estimated_nt?: boolean;
  };
  billers: [
    {
      biller: string;
      currency: string;
      fees: [
        {
          fee_rule_id: string;
          fee_family: string;
          biller: string;
          amount: number;
          currency: string;
          rate_applied: string;
          band_or_basis: string;
          source_reference: SourceReference;
          adjustments_applied: Adjustment[];
          quality_flags: QualityFlag[];
        }
      ];
      subtotal: number;
    }
  ];
  total: number;
  quality_flags: QualityFlag[];
  calculation_timestamp: string;
}
```

## Technology Stack

- **Core Engine**: TypeScript
- **Web UI**: React + TypeScript + Material-UI
- **Data Format**: YAML (for authoring) / JSON (for loading)
- **Build Tool**: npm workspaces
- **Testing**: Jest

## Deployment

The application can be deployed to Fly.io or any platform that supports Node.js applications.

### Fly.io Deployment

```bash
# Build the application
npm run build

# Deploy to Fly.io
fly launch
fly deploy
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add your feature'`)
6. Push to the branch (`git push origin feature/your-feature`)
7. Open a Pull Request

## License

This project is proprietary. All rights reserved.

## Contact

For questions or support, please contact the development team.
