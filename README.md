[![npm version](https://badge.fury.io/js/helix-pi.svg)](http://badge.fury.io/js/helix-pi)
[![Build Status](https://travis-ci.org/helix-pi/helix-pi.svg?branch=master)](https://travis-ci.org/helix-pi/helix-pi)
[![Code Climate](https://codeclimate.com/github/Widdershin/helix-pi/badges/gpa.svg)](https://codeclimate.com/github/Widdershin/helix-pi)
[![Stories in Ready](https://badge.waffle.io/Widdershin/helix-pi.png?label=ready&title=Ready)](https://waffle.io/Widdershin/helix-pi)

* * *

# helix-pi
Accessible game development, powered by genetic programming

[Check it out.](http://www.helix-pi.net) | [Benchmarks](http://graphs.helix-pi.net/)

What are you even on about bro?
---

Okay, so this whole project started because I was thinking about how the current models of programming make game development terribly difficult. (at least, real time, graphical game development).

I started thinking about ways we could better express the rules of video games so that we can more easily explain ourself to computers.

So I had this crazy idea, where users would lay out scenarios for how games are played, and the game logic would be evolved to meet those scenarios.

I want to enable people to make games without writing code. I want basic game development to be intuitive, accessible and iterable.

Huh.
---

Yeah, exactly. So at the time of writing, I've made an game development tool that runs in the browser. It currently supports designing movement scenarios for a character, including stuff like "the right key is pressed from frame 60 to 120". It can generate programs that respond to input and move the character. It's actually pretty good at making simple programs already.

Helix Pi is split into two separate repositories at the moment. This one, helix-pi, is a node module that evolves programs based on scenarios and an API to control characters. There is also [helix-pi-editor](Widdershin/helix-pi-editor), which is a Kiwi.js powered web editor. It's live at [helix-pi.net](http://helix-pi.net). It currently supports designing one scenario, where a character moves around, potentially in response to input.

My [first major milestone](https://github.com/Widdershin/helix-pi/milestones/Pong) is to make Pong.

API
---

### `helixPi(fitnessScenarios, [generations=150], [population=32], [individuals={})]`

Takes some scenarios and uses genetic programming to write programs that act like those scenarios. Returns an object with a key of the participant name and the value of the best programs that were generated.

Example usage:

```
import helixPi from 'helix-pi';

const fitnessScenarios = {
  participants: ['swordsunit],

  scenarios: [
    {
      participants: ['swordsunit'],

      initialPositions: {
        'swordsunit': {
          x: 0,
          y: 0
        }
      },

      startPosition: function (name) {
        return this.initialPositions[name];
      },

      expectedPositions: {
        'swordsunit': [
          {
            frame: 60,
            x: 500,
            y: 0
          }
        ]
      },

      input: [
        {
          startFrame: 0,
          endFrame: 60,
          key: 'right'
        }
      ]
    },
    {
      participants: ['swordsunit'],

      initialPositions: {
        'swordsunit': {
          x: 0,
          y: 0
        }
      },

      startPosition: function (name) {
        return this.initialPositions[name];
      },

      expectedPositions: {
        'swordsunit': [
          {
            frame: 60,
            x: -500,
            y: 0
          }
        ]
      },

      input: [
        {
          startFrame: 0,
          endFrame: 60,
          key: 'left'
        }
      ]
    }
  ],

  fitness: function (expectedPosition, entity) {
    var distance = {
      x: Math.abs(expectedPosition.x - entity.x),
      y: Math.abs(expectedPosition.y - entity.y)
    };

    return 1000 - (distance.x + distance.y);
  }
};

const results = helixPi(fitnessScenarios, 100, 32);

const bestIndividual = results.swordsunit[0];

```
