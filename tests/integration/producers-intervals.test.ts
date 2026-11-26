import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { buildCsv, createTestApp, writeTemporaryCsv, type TestApp } from '../helpers/test-app.js';

describe('GET /producers/intervals', () => {
  let testApp: TestApp;

  afterEach(() => {
    testApp.close();
  });

  it('returns the shortest and longest intervals for the provided dataset', async () => {
    testApp = await createTestApp();

    const response = await request(testApp.app).get('/producers/intervals');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({
      min: [{ producer: 'Joel Silver', interval: 1, previousWin: 1990, followingWin: 1991 }],
      max: [{ producer: 'Matthew Vaughn', interval: 13, previousWin: 2002, followingWin: 2015 }],
    });
  });

  it('returns every producer tied on the shortest and longest interval', async () => {
    const csvPath = await writeTemporaryCsv(
      buildCsv([
        '2000;Movie A;Studio;Producer One;yes',
        '2001;Movie B;Studio;Producer One;yes',
        '2010;Movie C;Studio;Producer Two;yes',
        '2011;Movie D;Studio;Producer Two;yes',
        '1980;Movie E;Studio;Producer Three;yes',
        '2000;Movie F;Studio;Producer Three;yes',
        '1990;Movie G;Studio;Producer Four;yes',
        '2010;Movie H;Studio;Producer Four;yes',
      ]),
    );
    testApp = await createTestApp(csvPath);

    const { body } = await request(testApp.app).get('/producers/intervals').expect(200);

    expect(body.min).toEqual([
      { producer: 'Producer One', interval: 1, previousWin: 2000, followingWin: 2001 },
      { producer: 'Producer Two', interval: 1, previousWin: 2010, followingWin: 2011 },
    ]);
    expect(body.max).toEqual([
      { producer: 'Producer Four', interval: 20, previousWin: 1990, followingWin: 2010 },
      { producer: 'Producer Three', interval: 20, previousWin: 1980, followingWin: 2000 },
    ]);
  });

  it('splits multi-producer cells so every co-producer is credited', async () => {
    const csvPath = await writeTemporaryCsv(
      buildCsv([
        '1990;Movie A;Studio;Bob Cavallo, Joe Ruffalo and Steve Fargnoli;yes',
        '1995;Movie B;Studio;Joe Ruffalo & Other Name;yes',
      ]),
    );
    testApp = await createTestApp(csvPath);

    const { body } = await request(testApp.app).get('/producers/intervals').expect(200);

    expect(body).toEqual({
      min: [{ producer: 'Joe Ruffalo', interval: 5, previousWin: 1990, followingWin: 1995 }],
      max: [{ producer: 'Joe Ruffalo', interval: 5, previousWin: 1990, followingWin: 1995 }],
    });
  });

  it('returns empty lists when no producer has won twice', async () => {
    const csvPath = await writeTemporaryCsv(
      buildCsv(['2000;Movie A;Studio;Producer One;yes', '2001;Movie B;Studio;Producer Two;']),
    );
    testApp = await createTestApp(csvPath);

    const { body } = await request(testApp.app).get('/producers/intervals').expect(200);

    expect(body).toEqual({ min: [], max: [] });
  });

  it('ignores nominations so only awarded years build intervals', async () => {
    const csvPath = await writeTemporaryCsv(
      buildCsv([
        '2000;Movie A;Studio;Producer One;yes',
        '2005;Movie B;Studio;Producer One;',
        '2008;Movie C;Studio;Producer One;yes',
      ]),
    );
    testApp = await createTestApp(csvPath);

    const { body } = await request(testApp.app).get('/producers/intervals').expect(200);

    expect(body.min).toEqual([
      { producer: 'Producer One', interval: 8, previousWin: 2000, followingWin: 2008 },
    ]);
  });
});
