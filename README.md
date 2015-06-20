# helix-pi
Accessible game development, powered by genetic programming

[Check it out.](http://www.helix-pi.net)

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

My first major milestone is to make Pong. Here is the the stuff that needs to happen for me to get there:

 - [X] Support for multiple scenarios
 - [X] Work on the genetic algorithm to weight entities that are good at one thing over ones that are average at many
 - [X] Support for multiple entities in a scenario
 - [X] A way for entities to check collisions with other entities
 - [ ] Replace api.move with api.setVelocity and api.setDirection

