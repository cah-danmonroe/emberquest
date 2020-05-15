import { Cache } from 'emberquest/objects/models/cache';
import { constants } from 'emberquest/services/constants';

export class Caches {
  get data() {
    let caches = [];

    caches.push(
      new Cache({
        gccode: 'GC8QAYM',
        name: 'EmberQuest #1',
        description: '<p>Description placeholder</p>',
        difficulty: 1.5,
        terrain: 1.5,
        foundInstructions: 'Congrats.. now do this',
        coords: '4a2abab3a50e351142d3b2ca6ae8da8fcd3b30da36afa15666033b292ee60705zyuS5/9q4lUL3LCTrbM+kR9sM8qNtLQpdKlKG2j28es='
        // coords: '1234567890'
      })
    );

    caches.push(
      new Cache({
        gccode: 'GC8QB0H',
        found: false,
        name: 'EmberQuest #2',
        description: '<p>Test description</p>',
        difficulty: 1.5,
        terrain: 1.5,
        foundInstructions: 'Congrats.. now do this',
        coords: 'be3c9537cd3f9c0a9a1e0a8a5e10419cae6ab8214aa1ce66b2231192a2368dd5goD3eZl5f0BE0SLO/jTCkmsgc2c8zUbSvCL6Tgu2sHo='
      })
    );

    caches.push(
      new Cache({
        gccode: 'GC8QB0N',
        name: 'EmberQuest #3',
        description: '<p>Test description</p>',
        difficulty: 1.5,
        terrain: 1.5,
        foundInstructions: 'Congrats.. now do this',
        coords: 'c2783cc64f29a9153697b71263b21965b8b56134cfb81edc5107fc1657c6b5bawJ+yik3S9opdThiPP6Tp2N57MP1cHBhYzvxa7QMfopU='
      })
    );

    caches.push(
      new Cache({
        gccode: 'GC004',
        name: 'Hello EmberQuest Cache 3',
        description: '<p>Test description</p>',
        difficulty: 1.5,
        terrain: 1.5,
        foundInstructions: 'Congrats.. now do this',
        coords: '1234567890'
      })
    );

    caches.push(
      new Cache({
        gccode: 'GC005',
        name: 'Hello EmberQuest Cache 3',
        description: '<p>Test description</p>',
        difficulty: 1.5,
        terrain: 1.5,
        foundInstructions: 'Congrats.. now do this',
        coords: '1234567890'
      })
    );

    caches.push(
      new Cache({
        gccode: 'GC006',
        name: 'Hello EmberQuest Cache 3',
        description: '<p>Test description</p>',
        difficulty: 1.5,
        terrain: 1.5,
        foundInstructions: 'Congrats.. now do this',
        coords: '1234567890'
      })
    );


    return caches;
  }
}