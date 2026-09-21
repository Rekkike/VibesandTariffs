import React, { useState, useEffect } from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Button,
  Paper,
  Typography,
  Box,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Collapse,
  IconButton
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
// Import core types and functions
import {
  VesselInput,
  CallInput,
  CostCalculationInput,
  CostCalculationResult,
  PortDefinition,
  FeeResult,
  BillerBreakdown,
  QualityFlag,
  getNetTonnageClass,
  calculatePortCallCost
} from '@port-cost/core';

// Import the port data from canonical source (converted to JSON at build time)
import gothenburgData from './data/gothenburg_2026.json';


// Define types for our app state
interface AppState {
  vessel: VesselInput;
  call: CallInput;
  result: CostCalculationResult | null;
  isLoading: boolean;
  error: string | null;
  expandedBillers: Set<string>;
  expandedFees: Set<string>;
}

// Vessel presets
const VESSEL_PRESETS = {
  feeder: { gt: 8000, nt: 4400, loa_m: 150, beam_m: 25, draft_m: 8, teu_capacity: 800 },
  'feeder-max': { gt: 15000, nt: 8250, loa_m: 180, beam_m: 30, draft_m: 10, teu_capacity: 1200 },
  panamax: { gt: 55000, nt: 30250, loa_m: 290, beam_m: 32, draft_m: 12, teu_capacity: 4000 },
  'post-panamax': { gt: 100000, nt: 55000, loa_m: 340, beam_m: 45, draft_m: 14, teu_capacity: 8000 },
  'ultra-large': { gt: 215000, nt: 118250, loa_m: 400, beam_m: 60, draft_m: 16, teu_capacity: 20000 }
};

const App: React.FC = () => {
  // Load port data synchronously from JSON (converted at build time)
  // Validate port data has required fields
  const port: PortDefinition | null = (() => {
    try {
      if (!gothenburgData || !gothenburgData.fee_rules || !Array.isArray(gothenburgData.fee_rules)) {
        console.error(`Invalid port data: fee_rules is ${typeof gothenburgData?.fee_rules}`);
        return null;
      }
      return gothenburgData;
    } catch (err) {
      console.error('Port data validation failed:', err);
      return null;
    }
  })();
  
  // App state
  const [state, setState] = useState<AppState>({
    vessel: {
      gt: 55000,
      nt: 30250,
      loa_m: 290,
      beam_m: 32,
      draft_m: 12,
      teu_capacity: 4000
    },
    call: {
      port_id: 'gothenburg',
      date: new Date().toISOString().split('T')[0],
      containers_loaded_le20ft: 500,
      containers_loaded_gt20ft: 500,
      containers_discharged_le20ft: 500,
      containers_discharged_gt20ft: 500,
      calls_this_month: 1,
      flag_state: 'EU',
      esi_score: 40,
      csi_class: 'A',
      fossil_free_fuel_percentage: 0,
      ops_usage: false,
      lay_up_days: 0,
      storage_days_export: 5,
      storage_days_import: 3,
      reefer_units: 100,
      oog_units: 10,
      dangerous_goods_units: 20,
      pilotage_required: true,
      pilotage_hours: 4,
      pilotage_extra_pilot: false,
      pilotage_ordering_lead_time_hours: 2
    },
    result: null,
    isLoading: false,
    error: null,
    expandedBillers: new Set(),
    expandedFees: new Set()
  });

  // Calculate costs when inputs change
  useEffect(() => {
    if (!port) {
      // Port data failed to load, don't attempt calculation
      return;
    }
    
    const calculate = () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      try {
        const input: CostCalculationInput = {
          vessel: state.vessel,
          call: state.call
        };
        
        const result = calculatePortCallCost(port, input);
        setState(prev => ({ ...prev, result, isLoading: false }));
      } catch (err) {
        console.error('Calculation error:', err);
        setState(prev => ({ 
          ...prev, 
          error: `Calculation failed: ${err}`,
          isLoading: false 
        }));
      }
    };
    
    // Debounce the calculation slightly
    const timer = setTimeout(calculate, 500);
    return () => clearTimeout(timer);
  }, [state.vessel, state.call]);

  const handleVesselChange = (field: keyof VesselInput, value: number | undefined) => {
    setState(prev => ({
      ...prev,
      vessel: {
        ...prev.vessel,
        [field]: value
      }
    }));
  };

  const handleCallChange = (field: keyof CallInput, value: any) => {
    setState(prev => ({
      ...prev,
      call: {
        ...prev.call,
        [field]: value
      }
    }));
  };

  const applyPreset = (preset: keyof typeof VESSEL_PRESETS) => {
    const presetData = VESSEL_PRESETS[preset];
    setState(prev => ({
      ...prev,
      vessel: {
        ...prev.vessel,
        ...presetData
      }
    }));
  };

  const toggleBiller = (biller: string) => {
    setState(prev => {
      const newSet = new Set(prev.expandedBillers);
      if (newSet.has(biller)) {
        newSet.delete(biller);
      } else {
        newSet.add(biller);
      }
      return { ...prev, expandedBillers: newSet };
    });
  };

  const toggleFee = (feeId: string) => {
    setState(prev => {
      const newSet = new Set(prev.expandedFees);
      if (newSet.has(feeId)) {
        newSet.delete(feeId);
      } else {
        newSet.add(feeId);
      }
      return { ...prev, expandedFees: newSet };
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCsiClassColor = (csiClass: string | undefined) => {
    if (!csiClass) return '#999';
    const colors = { A: '#4caf50', B: '#8bc34a', C: '#ffeb3b', D: '#ff9800', E: '#f44336' };
    return colors[csiClass as keyof typeof colors] || '#999';
  };

  if (!port) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography variant="h6">Loading port data...</Typography>
      </Box>
    );
  }

  return (
    <Box className="container">
      {/* Header */}
      <Paper className="header" elevation={3}>
        <Typography variant="h1" component="h1">
          Port Call Cost Analyzer
        </Typography>
        <Typography variant="subtitle1">
          Gothenburg 2026 Pilot
        </Typography>
      </Paper>

      {/* Main Content */}
      <Grid container spacing={3} className="form-container">
        {/* Input Form */}
        <Grid item xs={12} md={6}>
          <Paper className="form-section" elevation={2}>
            <Typography variant="h5" component="h2">Vessel Details</Typography>
            
            <Box className="preset-buttons">
              {Object.entries(VESSEL_PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  variant="outlined"
                  className="preset-btn"
                  onClick={() => applyPreset(key as keyof typeof VESSEL_PRESETS)}
                  sx={{
                    borderColor: '#1976d2',
                    color: '#1976d2',
                    '&:hover': { borderColor: '#1976d2', backgroundColor: 'rgba(25, 118, 210, 0.04)' }
                  }}
                >
                  {key.replace('-', ' ').toUpperCase()}
                </Button>
              ))}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Gross Tonnage (GT)"
                  type="number"
                  value={state.vessel.gt}
                  onChange={(e) => handleVesselChange('gt', parseFloat(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Net Tonnage (NT)"
                  type="number"
                  value={state.vessel.nt || ''}
                  onChange={(e) => handleVesselChange('nt', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  helperText={!state.vessel.nt ? 'Will be estimated as 0.55 × GT' : ''}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="LOA (m)"
                  type="number"
                  value={state.vessel.loa_m || ''}
                  onChange={(e) => handleVesselChange('loa_m', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Beam (m)"
                  type="number"
                  value={state.vessel.beam_m || ''}
                  onChange={(e) => handleVesselChange('beam_m', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Draft (m)"
                  type="number"
                  value={state.vessel.draft_m || ''}
                  onChange={(e) => handleVesselChange('draft_m', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="TEU Capacity"
                  type="number"
                  value={state.vessel.teu_capacity || ''}
                  onChange={(e) => handleVesselChange('teu_capacity', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" component="h3" sx={{ mt: 3, mb: 2 }}>Call Details</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Date"
                  type="date"
                  value={state.call.date}
                  onChange={(e) => handleCallChange('date', e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Flag State</InputLabel>
                  <Select
                    value={state.call.flag_state}
                    onChange={(e) => handleCallChange('flag_state', e.target.value as 'EU' | 'non-EU')}
                    label="Flag State"
                  >
                    <MenuItem value="EU">EU</MenuItem>
                    <MenuItem value="non-EU">Non-EU</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="ESI Score"
                  type="number"
                  value={state.call.esi_score || ''}
                  onChange={(e) => handleCallChange('esi_score', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>CSI Class</InputLabel>
                  <Select
                    value={state.call.csi_class || ''}
                    onChange={(e) => handleCallChange('csi_class', e.target.value as string | undefined)}
                    label="CSI Class"
                  >
                    <MenuItem value="A">A</MenuItem>
                    <MenuItem value="B">B</MenuItem>
                    <MenuItem value="C">C</MenuItem>
                    <MenuItem value="D">D</MenuItem>
                    <MenuItem value="E">E (Not Registered)</MenuItem>
                    <MenuItem value="">None</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Fossil-Free Fuel %"
                  type="number"
                  value={state.call.fossil_free_fuel_percentage || ''}
                  onChange={(e) => handleCallChange('fossil_free_fuel_percentage', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Calls This Month"
                  type="number"
                  value={state.call.calls_this_month}
                  onChange={(e) => handleCallChange('calls_this_month', parseInt(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" component="h3" sx={{ mt: 3, mb: 2 }}>Cargo & Operations</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Containers Loaded ≤20ft"
                  type="number"
                  value={state.call.containers_loaded_le20ft}
                  onChange={(e) => handleCallChange('containers_loaded_le20ft', parseInt(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Containers Loaded >20ft"
                  type="number"
                  value={state.call.containers_loaded_gt20ft}
                  onChange={(e) => handleCallChange('containers_loaded_gt20ft', parseInt(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Containers Discharged ≤20ft"
                  type="number"
                  value={state.call.containers_discharged_le20ft}
                  onChange={(e) => handleCallChange('containers_discharged_le20ft', parseInt(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Containers Discharged >20ft"
                  type="number"
                  value={state.call.containers_discharged_gt20ft}
                  onChange={(e) => handleCallChange('containers_discharged_gt20ft', parseInt(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={state.call.ops_usage}
                      onChange={(e) => handleCallChange('ops_usage', e.target.checked)}
                    />
                  }
                  label="OPS Usage"
                />
              </Grid>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={state.call.pilotage_required}
                      onChange={(e) => handleCallChange('pilotage_required', e.target.checked)}
                    />
                  }
                  label="Pilotage Required"
                />
              </Grid>
              {state.call.pilotage_required && (
                <>
                  <Grid item xs={6}>
                    <TextField
                      label="Pilotage Hours"
                      type="number"
                      value={state.call.pilotage_hours || ''}
                      onChange={(e) => handleCallChange('pilotage_hours', parseFloat(e.target.value) || undefined)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={state.call.pilotage_extra_pilot || false}
                          onChange={(e) => handleCallChange('pilotage_extra_pilot', e.target.checked)}
                        />
                      }
                      label="Extra Pilot"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Pilotage Ordering Lead Time (hours)"
                      type="number"
                      value={state.call.pilotage_ordering_lead_time_hours || ''}
                      onChange={(e) => handleCallChange('pilotage_ordering_lead_time_hours', parseFloat(e.target.value) || undefined)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={6}>
                <TextField
                  label="Lay-up Days"
                  type="number"
                  value={state.call.lay_up_days || ''}
                  onChange={(e) => handleCallChange('lay_up_days', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Storage Days (Export)"
                  type="number"
                  value={state.call.storage_days_export || ''}
                  onChange={(e) => handleCallChange('storage_days_export', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Storage Days (Import)"
                  type="number"
                  value={state.call.storage_days_import || ''}
                  onChange={(e) => handleCallChange('storage_days_import', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Reefer Units"
                  type="number"
                  value={state.call.reefer_units || ''}
                  onChange={(e) => handleCallChange('reefer_units', parseInt(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="OOG Units"
                  type="number"
                  value={state.call.oog_units || ''}
                  onChange={(e) => handleCallChange('oog_units', parseInt(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Dangerous Goods Units"
                  type="number"
                  value={state.call.dangerous_goods_units || ''}
                  onChange={(e) => handleCallChange('dangerous_goods_units', parseInt(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Results */}
        <Grid item xs={12} md={6}>
          <Paper className="results-section" elevation={2}>
            <Typography variant="h5" component="h2">Cost Breakdown</Typography>
            
            {state.isLoading ? (
              <Typography>Calculating...</Typography>
            ) : state.error ? (
              <Typography color="error">{state.error}</Typography>
            ) : state.result ? (
              <Box>
                {/* Vessel Summary */}
                <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Vessel Summary</Typography>
                  <Typography>GT: {state.result.vessel_summary.gt.toLocaleString()}</Typography>
                  <Typography>NT: {state.result.vessel_summary.nt.toLocaleString()}
                    {state.result.vessel_summary.estimated_nt && (
                      <span className="status-badge status-warning" style={{ marginLeft: '10px' }}>
                        Estimated
                      </span>
                    )}
                  </Typography>
                  {state.result.vessel_summary.loa_m && (
                    <Typography>LOA: {state.result.vessel_summary.loa_m}m</Typography>
                  )}
                  <Typography sx={{ mt: 1, fontSize: '0.8rem', color: '#666' }}>
                    NT Class: {getNetTonnageClass(state.result.vessel_summary.nt)}
                    {state.call.csi_class && (
                      <span style={{
                        marginLeft: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: getCsiClassColor(state.call.csi_class),
                        color: 'white'
                      }}>
                        CSI: {state.call.csi_class}
                      </span>
                    )}
                  </Typography>
                </Box>

                {/* Billers */}
                {state.result.billers.map((biller: BillerBreakdown) => {
                  const isExpanded = state.expandedBillers.has(biller.biller);
                  
                  return (
                    <Box key={biller.biller} className="biller-section">
                      <Box 
                        className="biller-header"
                        onClick={() => toggleBiller(biller.biller)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <Typography variant="h6" className="biller-name">
                          {biller.biller}
                        </Typography>
                        <Typography variant="h6" className="biller-subtotal">
                          {formatCurrency(biller.subtotal)}
                        </Typography>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleBiller(biller.biller); }}>
                          {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </IconButton>
                      </Box>
                      
                      <Collapse in={isExpanded}>
                        {/* Group by fee family */}
                        <Box sx={{ pl: 2 }}>
                          {Object.entries(
                            biller.fees.reduce((acc, fee) => {
                              if (!acc[fee.fee_family]) {
                                acc[fee.fee_family] = [];
                              }
                              acc[fee.fee_family].push(fee);
                              return acc;
                            }, {} as Record<string, FeeResult[]>)
                          ).map(([feeFamily, fees]) => (
                            <Box key={feeFamily} className="fee-family-group">
                              <Typography 
                                variant="subtitle2" 
                                className="fee-family-header"
                                sx={{ fontWeight: 'bold', color: '#555' }}
                              >
                                {feeFamily.replace(/_/g, ' ')}
                              </Typography>
                              
                              {fees.map((fee: FeeResult) => {
                                const isExpanded = state.expandedFees.has(fee.fee_rule_id);
                                
                                return (
                                  <Box key={fee.fee_rule_id} sx={{ mb: 1 }}>
                                    <TableContainer>
                                      <Table size="small">
                                        <TableBody>
                                          <TableRow 
                                            className="expandable-row"
                                            onClick={() => toggleFee(fee.fee_rule_id)}
                                          >
                                            <TableCell>
                                              <Box display="flex" alignItems="center">
                                                {fee.fee_family}
                                                {fee.quality_flags.length > 0 && (
                                                  <span className="status-badge status-warning" style={{ marginLeft: '10px' }}>
                                                    {fee.quality_flags.length} flag{fee.quality_flags.length > 1 ? 's' : ''}
                                                  </span>
                                                )}
                                              </Box>
                                              <Box sx={{ fontSize: '0.8rem', color: '#666', mt: 0.5 }}>
                                                {fee.band_or_basis}
                                              </Box>
                                            </TableCell>
                                            <TableCell align="right" className="amount">
                                              {formatCurrency(fee.amount)}
                                            </TableCell>
                                            <TableCell align="right">
                                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleFee(fee.fee_rule_id); }}>
                                                {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                              </IconButton>
                                            </TableCell>
                                          </TableRow>
                                          
                                          <TableRow className="detail-row">
                                            <TableCell colSpan={3} style={{ padding: 0 }}>
                                              <Collapse in={isExpanded}>
                                                <Box sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
                                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                                    <strong>Rate Applied:</strong> {fee.rate_applied}
                                                  </Typography>
                                                  
                                                  {fee.adjustments_applied.length > 0 && (
                                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                                      <strong>Adjustments:</strong> 
                                                      {fee.adjustments_applied.map(a => `${a.type} ${a.percentage}%`).join(', ')}
                                                    </Typography>
                                                  )}
                                                  
                                                  <Typography variant="body2" className="source-ref">
                                                    Source: {fee.source_reference.document_name} 
                                                    (Page {fee.source_reference.page}, {fee.source_reference.clause}) - 
                                                    <a href={fee.source_reference.document_url} target="_blank" rel="noopener noreferrer">
                                                      View Document
                                                    </a>
                                                  </Typography>
                                                  
                                                  {fee.quality_flags.map((flag: QualityFlag, index: number) => (
                                                    <Typography 
                                                      key={index}
                                                      variant="body2" 
                                                      sx={{ 
                                                        mt: 1, 
                                                        p: 1, 
                                                        backgroundColor: flag.severity === 'error' ? '#ffebee' : flag.severity === 'warning' ? '#fff3cd' : '#e3f2fd',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem'
                                                      }}
                                                    >
                                                      [{flag.severity.toUpperCase()}] {flag.description}
                                                    </Typography>
                                                  ))}
                                                </Box>
                                              </Collapse>
                                            </TableCell>
                                          </TableRow>
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  </Box>
                                );
                              })}
                            </Box>
                          ))}
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}

                {/* Total */}
                <Box className="total-row" sx={{ mt: 3, p: 2, textAlign: 'right' }}>
                  <Typography variant="h5" component="div">
                    <strong>Total Cost: {formatCurrency(state.result.total)}</strong>
                  </Typography>
                </Box>

                {/* Quality Flags Summary */}
                {state.result.quality_flags.length > 0 && (
                  <Box className="quality-flags" sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      Quality Flags ({state.result.quality_flags.length})
                    </Typography>
                    <ul>
                      {state.result.quality_flags.map((flag: QualityFlag, index: number) => (
                        <li key={index}>
                          <span style={{
                            color: flag.severity === 'error' ? '#dc3545' : flag.severity === 'warning' ? '#856404' : '#0c5460'
                          }}>
                            [{flag.severity.toUpperCase()}] {flag.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}

                <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: '#666' }}>
                  Calculation performed: {new Date(state.result.calculation_timestamp).toLocaleString()}
                </Typography>
              </Box>
            ) : (
              <Typography>Enter vessel and call details to see cost breakdown</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default App;
