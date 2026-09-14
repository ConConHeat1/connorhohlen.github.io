import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {invitation, STORE_URL} from '../orbitshift/add/invite.mjs';
test('valid shared codes open the registered app scheme',()=>{
  assert.deepEqual(invitation('?code=abcd-2345'),{code:'ABCD2345',appURL:'orbitshift://add?code=ABCD2345'});
  assert.equal(STORE_URL,'https://apps.apple.com/app/id6798365274');
});
test('invalid and injected invite codes cannot open another URL',()=>{
  for(const query of ['', '?code=DEMO5001','?code=javascript:alert(1)','?code=%3Cscript%3E','?code=ABCD2345%26target=bad']) assert.equal(invitation(query),null);
});
test('universal links are limited to the invitation path and the signed app',()=>{
  const config=JSON.parse(fs.readFileSync(new URL('../.well-known/apple-app-site-association',import.meta.url)));
  assert.deepEqual(config.applinks.details,[{appID:'HS397UNRRG.com.connorhohlen.orbitshift',paths:['/orbitshift/add/']}]);
});
