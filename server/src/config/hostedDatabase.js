import bcrypt from 'bcryptjs';
import postgres from 'postgres';

let hosted;
const schema = [
  `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'admin',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS buildings (id SERIAL PRIMARY KEY,name TEXT NOT NULL UNIQUE,address TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS equipment (id SERIAL PRIMARY KEY,building_id INTEGER NOT NULL REFERENCES buildings(id),name TEXT NOT NULL,type TEXT NOT NULL,location TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'operational',last_checked_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS sensor_readings (id SERIAL PRIMARY KEY,building_id INTEGER NOT NULL REFERENCES buildings(id),sensor_type TEXT NOT NULL,value DOUBLE PRECISION NOT NULL,unit TEXT NOT NULL,location TEXT NOT NULL,recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS maintenance_requests (id SERIAL PRIMARY KEY,equipment_id INTEGER NOT NULL REFERENCES equipment(id),title TEXT NOT NULL,description TEXT NOT NULL,priority TEXT NOT NULL DEFAULT 'medium',status TEXT NOT NULL DEFAULT 'open',requested_by TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),completed_at TIMESTAMPTZ,resolution_notes TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status)`,
  `CREATE INDEX IF NOT EXISTS idx_readings_recorded ON sensor_readings(recorded_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status)`,
];
function pgQuery(text){let index=0;return text.replace(/\?/g,()=>`$${++index}`).replace(/COLLATE NOCASE/gi,'').replace(/CURRENT_TIMESTAMP/g,'NOW()').replace(/datetime\('now', \$\d+\)/g,'NOW()');}
export async function getHostedDatabase(){
  if(hosted)return hosted;
  const connectionString=process.env.POSTGRES_URL||process.env.DATABASE_URL||process.env.NETLIFY_DB_URL;
  if(!connectionString)throw new Error('A hosted database connection is not configured.');
  const sql=postgres(connectionString,{prepare:false});
  hosted={exec:async text=>{for(const statement of text.split(';').map(s=>s.trim()).filter(Boolean))await sql.unsafe(statement)},get:async(text,...params)=>(await sql.unsafe(pgQuery(text),params))[0],all:async(text,...params)=>await sql.unsafe(pgQuery(text),params),run:async(text,...params)=>{const query=pgQuery(text);const rows=await sql.unsafe(/^INSERT/i.test(query)?query+' RETURNING id':query,params);return{lastID:Number(rows[0]?.id||0),changes:rows.count??rows.length}}};
  for(const statement of schema)await sql.unsafe(statement); await seed(hosted); return hosted;
}
async function seed(db){
  const count=await db.get('SELECT COUNT(*)::int AS total FROM buildings'); if(count.total)return;
  const email=process.env.ADMIN_EMAIL||'admin@smartcampus.local',password=process.env.ADMIN_PASSWORD||'ChangeMe123!';
  await db.run('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)','Campus Administrator',email,await bcrypt.hash(password,12));
  await db.run('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)','Student User',process.env.STUDENT_EMAIL||'student@smartcampus.local',await bcrypt.hash(process.env.STUDENT_PASSWORD||'Student123!',12),'student');
  const building=await db.run('INSERT INTO buildings(name,address) VALUES(?,?)','Innovation Centre','Smart Campus');
  for(const item of [['Main Air Handling Unit','HVAC','Roof plant room','operational'],['Passenger Lift 1','Lift','North lobby','warning'],['Solar Inverter A','Energy','Roof','operational'],['Water Circulation Pump','Pump','Ground floor','offline'],['Server Room Cooling','HVAC','Second floor','operational']])await db.run('INSERT INTO equipment(building_id,name,type,location,status,last_checked_at) VALUES(?,?,?,?,?,NOW())',building.lastID,...item);
  for(const item of [['temperature',22.4,'°C','Innovation Lab'],['humidity',46,'%','Innovation Lab'],['air quality',418,'ppm','First floor'],['energy',38.7,'kW','Whole building']])await db.run('INSERT INTO sensor_readings(building_id,sensor_type,value,unit,location) VALUES(?,?,?,?,?)',building.lastID,...item);
  await db.run('INSERT INTO maintenance_requests(equipment_id,title,description,priority,status,requested_by) VALUES(?,?,?,?,?,?)',2,'Inspect lift vibration','Unusual vibration reported during travel.','medium','open','Facilities Team');
}
