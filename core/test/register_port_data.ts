// Test-seam registration (spec v0.2.59): the per-port configuration
// sections (default_call, ops_speculative, input_profile) are data now.
// Jest runs core tests against the src/ files with core/data on disk, so
// the setup registers every port YAML's sections once per test process,
// exactly as the web registers from the generated registry at App module
// scope. Tests that need a clean registry (the loud-failure pins) use the
// exported __clearPortDataRegistry and re-register inside the test.
import { loadAllPortData } from '../src/port_data_fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');
loadAllPortData(DATA_DIR);
