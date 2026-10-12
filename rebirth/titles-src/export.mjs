// Writes titles.json (every row, including not-yet-released ones) for build_titles.py.
import fs from 'node:fs';
import {ALL_TITLES} from '../titles-data.mjs';
fs.writeFileSync(new URL('./titles.json',import.meta.url),JSON.stringify(ALL_TITLES.map(({id,name,category,grade,rank,order})=>({id,name,category,grade,rank,order}))));
console.log('titles',ALL_TITLES.length);
