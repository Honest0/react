/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails react-core
 */

'use strict';

var SyntheticClipboardEvent;

describe('SyntheticClipboardEvent', function() {
  var createEvent;

  beforeEach(function() {
    SyntheticClipboardEvent = require('SyntheticClipboardEvent');
    createEvent = function(nativeEvent) {
      var target = require('getEventTarget')(nativeEvent);
      return SyntheticClipboardEvent.getPooled({}, '', nativeEvent, target);
    };
  });

  describe('ClipboardEvent interface', function() {
    describe('clipboardData', function() {
      describe('when event has clipboardData', function() {
        it("returns event's clipboardData", function() {
          // Mock clipboardData since native implementation doesn't have a constructor
          var clipboardData = jasmine.createSpyObj(
            'clipboardData',
            ['dropEffect', 'effectAllowed', 'files', 'items', 'types']
          );
          var clipboardEvent = createEvent({clipboardData: clipboardData});
          
          expect(clipboardEvent.clipboardData).toBe(clipboardData);
        });
      });
    });
  });

  describe('EventInterface', function() {
    it('normalizes properties from the Event interface', function() {
      var target = document.createElement('div');
      var syntheticEvent = createEvent({srcElement: target});

      expect(syntheticEvent.target).toBe(target);
      expect(syntheticEvent.type).toBe(undefined);
    });

    it('is able to `preventDefault` and `stopPropagation`', function() {
      var nativeEvent = {};
      var syntheticEvent = createEvent(nativeEvent);

      expect(syntheticEvent.isDefaultPrevented()).toBe(false);
      syntheticEvent.preventDefault();
      expect(syntheticEvent.isDefaultPrevented()).toBe(true);

      expect(syntheticEvent.isPropagationStopped()).toBe(false);
      syntheticEvent.stopPropagation();
      expect(syntheticEvent.isPropagationStopped()).toBe(true);
    });

    it('is able to `persist`', function() {
      var syntheticEvent = createEvent({});

      expect(syntheticEvent.isPersistent()).toBe(false);
      syntheticEvent.persist();
      expect(syntheticEvent.isPersistent()).toBe(true);
    });
  });
});
