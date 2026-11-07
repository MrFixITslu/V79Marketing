import Database from 'better-sqlite3';
import {productionStore} from '../src/lib/productionStore.js';
import {brandSchema} from '../src/lib/productionContract.js';
const file=process.env.DATABASE_PATH||'';
const key=process.env.V79_MARKETING_PRODUCTION_AUDIT_KEY||'';
if(!file.startsWith('/tmp/')||key.length<32||process.env.V79_STUDIO_PUBLISH_ENABLED!=='0')
  throw Error('Isolated local end-to-end test requires synthetic /tmp database and publisher lock');
const db=new Database(file);
try{
  const now=new Date().toISOString();
  db.prepare(`INSERT OR IGNORE INTO businesses(id,name,slug,industry,description,created_at)
    VALUES (?,?,?,?,?,?)`)
    .run('synthetic-studio-business','Synthetic Studio Test','synthetic-studio-test',
      'Document workflows','Synthetic approved service demonstration',now);
  db.prepare(`INSERT OR IGNORE INTO users
    (id,email,password_hash,name,role,business_id,hub_user_id,created_at)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run('synthetic-studio-owner','studio-flow@example.invalid','DISABLED',
      'Synthetic Studio Owner','BUSINESS_OWNER','synthetic-studio-business','synthetic-hub-owner',now);
  const brand=brandSchema.parse({
    name:'Synthetic Studio Test',tagline:'Document workflow demonstrations',
    audience:'Caribbean small businesses',tone:'Clear and professional',
    website:'https://example.invalid',cta:'See the approved demonstration',
    linkTracking:'plain',primaryColor:'#0b1f33',accentColor:'#0e8f88',
    logoPng:null,mailingAddress:null,
    facts:[{id:'document-workflow',service:'Document workflow',
      statement:'Synthetic Studio Test demonstrates document indexing workflows.'}],
  });
  const store=productionStore(db,key);
  store.transact('synthetic-studio-business',s=>{
    s.ownerLocalUserId='synthetic-studio-owner';
    s.ownerHubUserId='synthetic-hub-owner';
    s.brand=brand;s.paused=true;
  });
  console.log('SYNTHETIC_STUDIO_BRAND_SETUP=PASS_NO_EXTERNAL_CALLS');
}finally{db.close();}
