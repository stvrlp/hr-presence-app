import type { ActionType } from './types';

export interface LeaveTypeInfo {
  actionType: ActionType;
  excelCode: string;
}

const LEAVE_TYPE_MAP: Record<string, LeaveTypeInfo> = {
  'Κανονική - Άδεια':                                                    { actionType: 'LEAVE',  excelCode: 'A'   },
  'Υπόλοιπο Κανονικής Προηγ. Έτους - Άδεια':                            { actionType: 'LEAVE',  excelCode: 'A'   },
  'Απουσία - Α':                                                          { actionType: 'ABSENT', excelCode: 'A'   },
  'Άδεια φροντιστή - Ειδική άδεια':                                      { actionType: 'LEAVE',  excelCode: 'ΕΑΧ' },
  'Γονική Άδεια (αρ.28 Ν.4808/2021) - Ειδική άδεια':                    { actionType: 'LEAVE',  excelCode: 'ΕΑΧ' },
  'Λόγω ασθένειας παιδιού ή άλλου εξαρτώμενου μέλους - Ειδική άδεια':  { actionType: 'LEAVE',  excelCode: 'ΕΑΧ' },
  'Μεταπτυχιακή - Ειδική άδεια':                                         { actionType: 'LEAVE',  excelCode: 'ΕΑΧ' },
  'Σπουδαστική - Ειδική άδεια':                                          { actionType: 'LEAVE',  excelCode: 'ΕΑΧ' },
  'Αιμοδοσίας - Ειδική άδεια':                                           { actionType: 'LEAVE',  excelCode: 'ΕΑ'  },
  'Γυναικολογικού Ελέγχου - Ειδική άδεια':                               { actionType: 'LEAVE',  excelCode: 'ΕΑ'  },
  'Θανάτου Συγγενούς - Ειδική άδεια':                                    { actionType: 'LEAVE',  excelCode: 'ΕΑ'  },
  'Μονογονεϊκή - Ειδική άδεια':                                          { actionType: 'LEAVE',  excelCode: 'ΕΑ'  },
  'Παράσταση σε δίκη - Ειδική άδεια':                                    { actionType: 'LEAVE',  excelCode: 'ΕΑ'  },
  'Πατρότητας (Γέννησης Τέκνων) - Ειδική άδεια':                        { actionType: 'LEAVE',  excelCode: 'ΕΑ'  },
  'Συμμετοχή σε δίκη - Ειδική άδεια':                                    { actionType: 'LEAVE',  excelCode: 'ΕΑ'  },
  'Σχολική - Ειδική άδεια':                                              { actionType: 'LEAVE',  excelCode: 'ΕΑ'  },
  'Φροντίδας Παιδιού -  Ειδική άδεια':                                   { actionType: 'LEAVE',  excelCode: 'ΕΑ'  },
  'Ασθένεια χωρίς ασφαλιστικά - Ασθένεια':                              { actionType: 'SICK',   excelCode: 'ΑΓΧ' },
};

export function resolveLeaveType(description: string): LeaveTypeInfo {
  return LEAVE_TYPE_MAP[description] ?? { actionType: 'ABSENT', excelCode: '0' };
}
