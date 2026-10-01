import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readApiResponse} from '../src/api.js';
test('plain-text hosting 404 produces a helpful service error', async () => {
  await assert.rejects(readApiResponse(new Response('The page could not be found', {status: 404})), /refund service is unavailable.*404/);
});
test('JSON success and validation errors retain the API contract', async () => {
  assert.deepEqual(await readApiResponse(new Response('{"verdict":"Approved"}')), {verdict: 'Approved'});
  await assert.rejects(readApiResponse(new Response('{"error":"Check your input"}', {status: 400})), /Check your input/);
});
test('HTML gateway errors and plain-text rate limits are readable', async () => {
  await assert.rejects(readApiResponse(new Response('<html>Bad gateway</html>', {status: 502})), /refund service is unavailable/);
  await assert.rejects(readApiResponse(new Response('Too many requests', {status: 429})), /wait a minute/);
});
