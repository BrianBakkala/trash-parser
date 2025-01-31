import * as fb from '../fb.mjs';
import assert from 'assert';
import sinon from 'sinon';

describe('Utility Functions', function ()
{
  describe('#uuid()', function ()
  {
    it('should return a valid UUID string', function ()
    {
      const id = fb.uuid();
      assert.strictEqual(typeof id, 'string');
      assert.strictEqual(id.length, 36);
    });
  });

  describe('#createVerificationKey() and parseVerificationKey()', function ()
  {
    it('input => output => input', function ()
    {
      const ssid = 'network_ssid';
      const setupCode = 'setup123';
      const key = fb.createVerificationKey(ssid, setupCode);
      const parsed = fb.parseVerificationKey(key);
      assert.strictEqual(typeof key, 'string');
      assert.strictEqual(parsed.ssid, ssid);
      assert.strictEqual(parsed.setup_code, setupCode);
    });
  });

  describe('#haveCommonElement()', function ()
  {
    it('should return true if arrays have a common element ', function ()
    {
      assert.strictEqual(
        fb.haveCommonElement(
          [1, 2, 3],
          [3, 4, 5]
        )
        , true);

      assert.strictEqual(
        fb.haveCommonElement(
          [1, 2, 3],
          [22, 4, 5]
        )
        , false);

      assert.strictEqual(
        fb.haveCommonElement(
          [],
          []
        )
        , false);

      assert.strictEqual(
        fb.haveCommonElement(
          [1],
          []
        )
        , false);

      assert.strictEqual(
        fb.haveCommonElement(
          [11111111],
          [11111111]
        )
        , true);

      assert.strictEqual(
        fb.haveCommonElement(
          [1, 1, 1],
          [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 22, 2, 2, 2, 2, 2, 22, 1]
        )
        , true);
      assert.strictEqual(
        fb.haveCommonElement(
          [1, 'a'],
          [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 22, 2, 2, 2, 2, 2, 22, 'a']
        )
        , true);

    });
  });

  describe('#getEasternTime()', function ()
  {
    it('should return an object with hours and minutes', function ()
    {
      const time = fb.getEasternTime();
      assert.strictEqual(typeof time, 'object');
      assert('currentHours' in time);
      assert('currentMinutes' in time);
      assert.strictEqual(typeof time.currentHours, 'number');
      assert.strictEqual(typeof time.currentMinutes, 'number');
    });
  });

  describe('#isBefore()', function ()
  {
    it('should return bool', function ()
    {
      const time = '14:00';
      const result = fb.isBefore(time);
      assert.strictEqual(typeof result, 'boolean');
    });
  });

  describe('#isAfter()', function ()
  {
    it('should return bool', function ()
    {
      const time = '14:00';
      const result = fb.isAfter(time);
      assert.strictEqual(typeof result, 'boolean');
    });
  });

  describe('#getWeekNumber()', function ()
  {
    it('should return correct week number for the given date ', function ()
    {
      assert.strictEqual(fb.getWeekNumber(new Date("January 1, 2004")), 1);
      assert.strictEqual(fb.getWeekNumber(new Date("December 10, 2024")), 50);
      assert.strictEqual(fb.getWeekNumber(new Date("December 31, 2024")), 53);
    });
  });

}); 