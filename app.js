import {courseHandicapFromRanges,strokesForSI,stableford,roundTotals,basicRoundAnalysis} from './domain.js';
import * as data from './data.js';

const SUPABASE_URL='https://ynlncjnjnbujzfjsfdwb.supabase.co';
const SUPABASE_KEY='sb_publishable_HAoj39uJYpVDDgJuuJctOA_KHIuL27v';
import {createBoundsSupabase} from './supabase-rest.js?v=1.15.16';

let sb=null;